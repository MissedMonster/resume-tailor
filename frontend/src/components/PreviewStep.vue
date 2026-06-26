<template>
  <div class="card">
    <h2>🔍 Preview</h2>

    <div class="paywall">
      <div class="preview-box" :class="{ 'blur-area': !paid }">
        {{ preview }}
      </div>

      <div v-if="!paid" class="paywall-overlay">
        <div class="price-tag">
          <div class="amount">${{ price }}</div>
          <div class="period">one-time · one resume</div>
          <p style="color:var(--text-light);margin-top:8px;font-size:0.9rem">
            Get the full ATS-optimized resume tailored to your job
          </p>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <!-- PayPal 按钮容器 -->
        <div v-if="paypalReady" ref="paypalBtn" style="margin-top:8px"></div>
        <div v-else-if="!loading" style="text-align:center;padding:16px;color:var(--text-light)">
          Loading payment...
        </div>

        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>Processing payment...</p>
        </div>

        <button class="btn btn-outline" style="margin-top:12px;width:100%" @click="$emit('back')">
          ← Back to Edit
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

const props = defineProps({
  sessionId: String,
  preview: String,
});

const emit = defineEmits(['paid', 'back']);

const price = ref('4.99');
const loading = ref(false);
const paid = ref(false);
const error = ref('');
const paypalReady = ref(false);
const paypalBtn = ref(null);

onMounted(async () => {
  try {
    // 1. 获取 PayPal 配置
    const configRes = await fetch('/api/paypal/config');
    const config = await configRes.json();
    if (config.price) price.value = config.price;

    if (!config.clientId) {
      // 无 PayPal 配置，回退到直接获取模式（开发用）
      return;
    }

    // 2. 加载 PayPal SDK
    await loadPayPalScript(config.clientId);

    // 3. 渲染按钮
    await nextTick();
    renderPayPalButton();
  } catch (err) {
    console.error('PayPal init error:', err);
  }
});

function loadPayPalScript(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) { resolve(); return; }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('PayPal SDK 加载失败'));
    document.head.appendChild(script);
  });
}

function renderPayPalButton() {
  if (!window.paypal || !paypalBtn.value) return;

  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'pay',
      height: 44,
    },
    createOrder: async () => {
      loading.value = true;
      error.value = '';

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
      loading.value = false;
      return data.orderID;
    },
    onApprove: async (data) => {
      loading.value = true;

      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: data.orderID }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Payment verification failed');
      }

      const result = await res.json();
      loading.value = false;
      paid.value = true;
      emit('paid', result.result);
    },
    onCancel: () => {
      loading.value = false;
    },
    onError: (err) => {
      loading.value = false;
      error.value = err.message || 'Payment failed, please try again';
      console.error('PayPal error:', err);
    },
  }).render(paypalBtn.value);

  paypalReady.value = true;
}
</script>
