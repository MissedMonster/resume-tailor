<template>
  <div class="card">
    <h2>✅ Your Tailored Resume</h2>

    <div class="result-box">{{ result }}</div>

    <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
      <button class="btn btn-primary" @click="download">
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

function download() {
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
