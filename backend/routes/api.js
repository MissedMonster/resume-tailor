const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { v4: uuidv4 } = require('uuid');
const { tailorResume } = require('../services/claude');
const { createOrder, captureOrder, PRICE } = require('../services/paypal');

const router = express.Router();

// 文件上传配置
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('只支持 PDF / DOCX / TXT 文件'));
  },
});

// 内存中暂存已处理的结果（生产环境应换 Redis/DB）
const resultStore = new Map();

/**
 * 解析上传的简历文件
 */
async function parseResume(filePath, mimetype) {
  if (mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || mimetype === 'application/msword') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // txt
  return fs.readFileSync(filePath, 'utf-8');
}

// POST /api/upload - 上传简历 + 职位描述 → 返回预览
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '请上传简历文件' });
    }
    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({ error: '职位描述太短，至少需要 50 个字符' });
    }

    // 解析简历
    const resumeText = await parseResume(req.file.path, req.file.mimetype);

    if (!resumeText || resumeText.trim().length < 100) {
      return res.status(400).json({ error: '简历内容太少，请上传完整的简历文件' });
    }

    // 生成预览版本
    const { text: previewText, usage: previewUsage } = await tailorResume(resumeText, jobDescription, true);

    // 生成会话 ID，暂存完整数据
    const sessionId = uuidv4();
    resultStore.set(sessionId, {
      resumeText,
      jobDescription,
      previewText,
      previewUsage,
      createdAt: Date.now(),
      paid: false,
      fullResult: null,
    });

    // 清理上传的原始文件
    fs.unlink(req.file.path, () => {});

    res.json({
      sessionId,
      preview: previewText,
      usage: previewUsage,
      message: '预览已生成，付款后获取完整简历',
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '处理失败：' + err.message });
  }
});

// POST /api/tailor - 付款后获取完整结果
router.post('/tailor', async (req, res) => {
  try {
    const { sessionId, paid } = req.body;

    const session = resultStore.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: '会话已过期，请重新上传' });
    }

    if (!paid) {
      return res.status(402).json({ error: '请先完成付款' });
    }

    // 已缓存则直接返回
    if (session.fullResult) {
      return res.json({ result: session.fullResult });
    }

    // 生成完整结果
    const { text: fullResult, usage } = await tailorResume(session.resumeText, session.jobDescription, false);
    session.fullResult = fullResult;
    session.fullUsage = usage;
    session.paid = true;

    res.json({ result: fullResult, usage });
  } catch (err) {
    console.error('Tailor error:', err);
    res.status(500).json({ error: '生成失败：' + err.message });
  }
});

// ============================================
// PayPal 支付路由
// ============================================

// GET /api/paypal/config — 返回前端需要的 PayPal 配置
router.get('/paypal/config', (req, res) => {
  res.json({
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    price: PRICE,
  });
});

// 存储 PayPal orderId → sessionId 的映射
const orderMap = new Map();

// POST /api/paypal/create-order — 创建 PayPal 订单
router.post('/paypal/create-order', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!resultStore.has(sessionId)) {
      return res.status(404).json({ error: '会话已过期，请重新上传' });
    }

    const order = await createOrder(sessionId);
    orderMap.set(order.orderID, sessionId);

    // 🔥 预生成完整简历——用户支付回来直接秒出
    const session = resultStore.get(sessionId);
    if (!session.fullResult) {
      console.log('⚡ 预生成完整简历中...');
      session.fullResultPromise = tailorResume(session.resumeText, session.jobDescription, false)
        .then(({ text, usage }) => {
          session.fullResult = text;
          session.fullUsage = usage;
          return text;
        });
    }

    res.json({ orderID: order.orderID, status: order.status, approvalUrl: order.approvalUrl });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: '创建支付订单失败：' + err.message });
  }
});

// POST /api/paypal/capture-order — 捕获支付并返回完整简历
router.post('/paypal/capture-order', async (req, res) => {
  try {
    const { orderID } = req.body;

    // 捕获支付
    const capture = await captureOrder(orderID);

    if (capture.status !== 'COMPLETED') {
      return res.status(402).json({ error: '支付未完成' });
    }

    // 找到对应的会话
    const sessionId = orderMap.get(orderID) || capture.customId;
    const session = resultStore.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: '会话已过期，请重新上传' });
    }

    // 用预生成的结果（如果还在生成中等它完成）
    if (!session.fullResult && session.fullResultPromise) {
      await session.fullResultPromise;
    }
    // 极端情况：预生成失败，当场生成
    if (!session.fullResult) {
      const { text, usage } = await tailorResume(session.resumeText, session.jobDescription, false);
      session.fullResult = text;
      session.fullUsage = usage;
    }

    orderMap.delete(orderID);

    res.json({
      result: session.fullResult,
      usage: session.fullUsage || null,
      payerEmail: capture.payerEmail,
      amount: capture.amount,
    });
  } catch (err) {
    console.error('Capture error:', err);
    res.status(500).json({ error: '支付验证失败：' + err.message });
  }
});

// 定时清理过期会话（1小时后过期）
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of resultStore) {
    if (now - session.createdAt > 60 * 60 * 1000) {
      resultStore.delete(id);
    }
  }
  // 同步清理订单映射
  for (const [orderId, sessionId] of orderMap) {
    if (!resultStore.has(sessionId)) {
      orderMap.delete(orderId);
    }
  }
}, 10 * 60 * 1000);

module.exports = router;
