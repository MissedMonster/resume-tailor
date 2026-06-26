<template>
  <div class="card">
    <h2>🔍 Free Preview</h2>
    <p style="color:var(--text-light);font-size:0.85rem;margin-bottom:12px">You can read but cannot select or copy. Pay to unlock full download.</p>

    <!-- 受保护的预览区 -->
    <div
      ref="previewEl"
      class="protected-preview"
      @contextmenu.prevent
      @copy.prevent
      @cut.prevent
      @selectstart.prevent
      @dragstart.prevent
      @keydown="blockKeys"
      @mousedown="blockDevtools"
    >
      <div class="preview-content">{{ preview }}</div>
      <div class="preview-fade"></div>
    </div>

    <!-- 付费区 -->
    <div class="pay-zone">
      <div class="price-tag">
        <div class="amount">${{ price }}</div>
        <div class="period">one-time · one resume</div>
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <button
        class="btn btn-success"
        :disabled="loading"
        @click="handlePay"
      >
        {{ loading ? 'Redirecting to PayPal...' : '💰 Pay $' + price + ' — Unlock Full Resume' }}
      </button>

      <button class="btn btn-outline" style="margin-top:8px;width:100%" @click="$emit('back')">
        ← Back to Edit
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  sessionId: String,
  preview: String,
});

const emit = defineEmits(['paid', 'back']);

const price = ref('4.99');
const loading = ref(false);
const error = ref('');
const previewEl = ref(null);

// 阻止键盘快捷键：Ctrl+C, Ctrl+U, Ctrl+Shift+I, F12
function blockKeys(e) {
  if (
    (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's')) ||
    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    e.key === 'F12'
  ) {
    e.preventDefault();
    return false;
  }
}

// 轻度反调试
function blockDevtools(e) {
  if (e.button === 2) return; // 右键已由 @contextmenu.prevent 处理
}

// 全局拦截 Ctrl+C
function globalBlockCopy(e) {
  // 仅当焦点在预览区域内时阻止
  if (previewEl.value && previewEl.value.contains(document.activeElement || e.target)) {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
    }
  }
}

onMounted(async () => {
  document.addEventListener('keydown', globalBlockCopy);

  try {
    const res = await fetch('/api/paypal/config');
    const config = await res.json();
    if (config.price) price.value = config.price;
  } catch (e) { /* ignore */ }
});

onUnmounted(() => {
  document.removeEventListener('keydown', globalBlockCopy);
});

async function handlePay() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: props.sessionId }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create order');
    }

    const data = await res.json();
    if (!data.approvalUrl) throw new Error('PayPal unavailable, try again later');

    sessionStorage.setItem('paypal_order_id', data.orderID);
    sessionStorage.setItem('paypal_session_id', props.sessionId);
    window.location.href = data.approvalUrl;
  } catch (err) {
    loading.value = false;
    error.value = err.message;
  }
}
</script>

<style scoped>
.protected-preview {
  position: relative;
  max-height: 420px;
  overflow: hidden;
  background: #fafbfc;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 16px;
}
.preview-content {
  padding: 24px;
  font-size: 0.95rem;
  line-height: 1.8;
  white-space: pre-wrap;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
.preview-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(transparent, #fafbfc 70%);
  pointer-events: none;
}
.pay-zone {
  text-align: center;
  padding: 8px 0;
}
</style>
