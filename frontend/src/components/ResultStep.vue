<template>
  <div class="card">
    <h2>✅ Your Tailored Resume</h2>

    <div class="result-box">{{ result }}</div>

    <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
      <button class="btn btn-primary" @click="downloadPDF">
        📄 Download as PDF
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

    <div v-if="copied" style="text-align:center;margin-top:12px;color:var(--success);font-weight:500">
      ✅ Copied!
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  result: String,
});

defineEmits(['restart']);

const copied = ref(false);

function downloadPDF() {
  // 动态加载 jsPDF（只在需要时）
  import('jspdf').then(({ jsPDF }) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight() - margin * 2;

    doc.setFont('helvetica');
    doc.setFontSize(11);
    doc.setTextColor(33, 33, 33);

    const lines = props.result.split('\n');
    let y = margin;
    let lineHeight = 5.5;

    for (const line of lines) {
      // 处理标题（# 或 ## 开头）
      if (line.startsWith('# ')) {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        const text = line.replace(/^#\s+/, '');
        doc.text(text, margin, y);
        y += 10;
      } else if (line.startsWith('## ')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const text = line.replace(/^##\s+/, '');
        doc.text(text, margin, y);
        y += 8;
      } else if (line.startsWith('### ')) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const text = line.replace(/^###\s+/, '');
        doc.text(text, margin, y);
        y += 7;
      } else if (line.startsWith('---')) {
        // 水平线
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, margin + pageWidth, y);
        y += 6;
      } else if (line.startsWith('- ')) {
        // 列表项
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('• ' + line.replace(/^-\s+/, ''), margin + 5, y);
        y += lineHeight;
      } else if (line.startsWith('|')) {
        // 表格行（简化处理）
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const cells = line.split('|').filter(c => c.trim());
        const cellWidth = pageWidth / Math.max(cells.length, 1);
        cells.forEach((cell, i) => {
          doc.text(cell.trim(), margin + i * cellWidth + 2, y);
        });
        y += lineHeight;
      } else {
        // 普通文本
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        // 自动换行
        const wrappedLines = doc.splitTextToSize(line, pageWidth);
        for (const wl of wrappedLines) {
          if (y > pageHeight + margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(wl, margin, y);
          y += lineHeight;
        }
      }

      // 检查分页
      if (y > pageHeight + margin) {
        doc.addPage();
        y = margin;
      }
    }

    doc.save('tailored-resume.pdf');
  });
}

function downloadTXT() {
  const blob = new Blob([props.result], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tailored-resume.txt';
  a.click();
  URL.revokeObjectURL(url);
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(props.result);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}
</script>
