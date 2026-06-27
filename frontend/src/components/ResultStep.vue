<template>
  <div class="card" id="print-area">
    <h2 class="no-print">✅ Your Tailored Resume</h2>

    <!-- 格式化 HTML 简历 -->
    <div class="resume-doc" ref="resumeDoc" v-html="renderedHTML"></div>

    <div class="no-print" style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
      <button class="btn btn-primary" @click="printPDF">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn btn-outline" @click="downloadTXT">
        📥 Download as TXT
      </button>
      <button class="btn btn-outline" @click="copyToClipboard">
        📋 Copy to Clipboard
      </button>
      <button class="btn btn-outline" @click="$emit('restart')">
        🔄 Tailor Another Resume
      </button>
    </div>

    <div v-if="copied" class="no-print" style="text-align:center;margin-top:12px;color:var(--success);font-weight:500">
      ✅ Copied!
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  result: String,
  usage: Object,
  originalName: String,
});

defineEmits(['restart']);

const copied = ref(false);

function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n; }
function cost(u) {
  // Claude Sonnet 4.6: $3/$15 per MTok in/out
  return (u.inputTokens / 1e6 * 3) + (u.outputTokens / 1e6 * 15);
}
const resumeDoc = ref(null);

// 把 Markdown 转成 HTML
function mdToHTML(md) {
  let html = md
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 水平线
    .replace(/^---$/gm, '<hr>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 表格
    .replace(/^\|(.+)\|$/gm, (match) => {
      if (match.includes('---')) return '';
      const cells = match.split('|').filter(c => c.trim());
      const isHeader = cells.every(c => c.trim().startsWith('-'));
      if (isHeader) return '';
      const tag = match.includes('---') ? '' : '<tr>' + cells.map(c => {
        const trimmed = c.trim();
        return trimmed.startsWith('**') && trimmed.endsWith('**')
          ? `<th>${trimmed.slice(2, -2)}</th>`
          : `<td>${trimmed}</td>`;
      }).join('') + '</tr>';
      return tag;
    })
    // 列表
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // 段落
    .replace(/^(?!<[htlrc]|<\/?[htlrc])(.+)$/gm, '<p>$1</p>')
    // 清理空行
    .replace(/<p><\/p>/g, '')
    .replace(/\n{3,}/g, '\n\n');

  // 包裹连续的 <li>
  html = html.replace(/(<li>.*?<\/li>\n?)+/g, '<ul>$&</ul>');

  // 包裹连续的 <tr>
  html = html.replace(/(<tr>.*?<\/tr>\n?)+/g, '<table>$&</table>');

  return html;
}

const renderedHTML = computed(() => mdToHTML(props.result));

function printPDF() {
  const originalTitle = document.title;
  document.title = baseName();
  window.print();
  document.title = originalTitle;
}

function baseName() {
  const raw = (props.originalName || 'resume').replace(/\.[^.]+$/, ''); // 去掉扩展名
  return raw + ' (Tailored)';
}

function downloadTXT() {
  const blob = new Blob([props.result], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = baseName() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(props.result);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}
</script>

<style>
/* 简历文档样式 */
.resume-doc {
  background: white;
  padding: 32px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 11pt;
  line-height: 1.7;
  color: #222;
  max-width: 100%;
}
.resume-doc h1 { font-size: 20pt; margin-bottom: 8px; }
.resume-doc h2 {
  font-size: 14pt;
  border-bottom: 2px solid #333;
  padding-bottom: 4px;
  margin: 20px 0 12px;
}
.resume-doc h3 { font-size: 12pt; margin: 14px 0 8px; }
.resume-doc hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
.resume-doc ul { margin: 0 0 8px 0; padding-left: 20px; }
.resume-doc li { margin-bottom: 4px; }
.resume-doc table { border-collapse: collapse; width: 100%; margin: 8px 0; }
.resume-doc td, .resume-doc th {
  border: 1px solid #ddd;
  padding: 6px 10px;
  text-align: left;
  font-size: 10pt;
}
.resume-doc th { background: #f5f5f5; font-weight: 600; }
.resume-doc p { margin: 0 0 6px 0; }
.resume-doc strong { color: #111; }

/* 浏览器打印时只打印简历 */
@media print {
  body * { visibility: hidden; }
  #print-area, #print-area * { visibility: visible; }
  #print-area { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .resume-doc { border: none; padding: 0; box-shadow: none; }
  .card { box-shadow: none; padding: 0; }
}
</style>
