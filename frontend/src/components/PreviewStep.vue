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

        <button
          class="btn btn-success"
          :disabled="loading"
          @click="handlePay"
        >
          {{ loading ? 'Redirecting to PayPal...' : '💰 Pay $' + price + ' — Get Full Resume' }}
        </button>

        <button class="btn btn-outline" style="margin-top:12px;width:100%" @click="$emit('back')">
          ← Back to Edit
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  sessionId: String,
  preview: String,
});

const emit = defineEmits(['paid', 'back']);

// 这里不再需要 capture 逻辑，App.vue 处理了

const price = ref('4.99');
const loading = ref(false);
const paid = ref(false);
const error = ref('');

onMounted(async () => {
  // 获取 PayPal 配置（价格等）
  try {
    const res = await fetch('/api/paypal/config');
    const config = await res.json();
    if (config.price) price.value = config.price;
  } catch (e) {
    // 开发模式下可能没有 PayPal 配置，忽略
  }
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

    if (!data.approvalUrl) {
      throw new Error('PayPal service unavailable, please try again later');
    }

    // 保存状态，支付回来时恢复
    sessionStorage.setItem('paypal_order_id', data.orderID);
    sessionStorage.setItem('paypal_session_id', props.sessionId);

    // 跳转到 PayPal 支付页面
    window.location.href = data.approvalUrl;
  } catch (err) {
    loading.value = false;
    error.value = err.message;
  }
}
</script>
