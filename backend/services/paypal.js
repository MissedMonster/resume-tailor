/**
 * PayPal REST API 封装
 * 沙箱模式: 用于开发测试，不需要真实信用卡
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';

const BASE_URL =
  PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PRICE = '4.99'; // 美元

/**
 * 获取 PayPal Access Token
 */
async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal Auth Error: ${err.error_description || JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * 创建 PayPal 订单
 * @returns { orderID, approvalURL }
 */
async function createOrder(sessionId) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: PRICE,
          },
          description: 'AI Resume Tailor — Full ATS-optimized resume',
          custom_id: sessionId, // 绑定会话
        },
      ],
      application_context: {
        brand_name: 'AI Resume Tailor',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: 'https://resume-tailor-theta-bay.vercel.app',
        cancel_url: 'https://resume-tailor-theta-bay.vercel.app',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal CreateOrder Error: ${JSON.stringify(err)}`);
  }

  const order = await res.json();

  // 找到 PayPal 支付页面的跳转链接
  const approvalLink = order.links?.find(l => l.rel === 'approve');
  const approvalUrl = approvalLink ? approvalLink.href : null;

  return {
    orderID: order.id,
    status: order.status,
    approvalUrl,
  };
}

/**
 * 捕获已批准的订单
 * @returns {{ status, custom_id }}
 */
async function captureOrder(orderID) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PayPal Capture Error: ${JSON.stringify(err)}`);
  }

  const data = await res.json();

  // 提取 custom_id (sessionId)
  const customId = data.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
    || data.purchase_units?.[0]?.custom_id;

  return {
    status: data.status,
    payerEmail: data.payer?.email_address,
    amount: data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
    customId,
  };
}

module.exports = { createOrder, captureOrder, PRICE };
