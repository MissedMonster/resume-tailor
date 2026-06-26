<template>
  <div class="card">
    <h2>🔍 Preview</h2>

    <div class="paywall">
      <div class="preview-box" :class="{ 'blur-area': !paid }">
        {{ preview }}
      </div>

      <div v-if="!paid" class="paywall-overlay">
        <div class="price-tag">
          <div class="amount">$4.99</div>
          <div class="period">one-time · one resume</div>
          <p style="color:var(--text-light);margin-top:8px;font-size:0.9rem">
            Get the full ATS-optimized resume tailored to your job
          </p>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>

        <button
          class="btn btn-success"
          :disabled="loading"
          @click="handlePayment"
        >
          {{ loading ? 'Processing...' : '💰 Pay $4.99 — Get Full Resume' }}
        </button>

        <button class="btn btn-outline" style="margin-top:12px;width:100%" @click="$emit('back')">
          ← Back to Edit
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  sessionId: String,
  preview: String,
});

const emit = defineEmits(['paid', 'back']);

const loading = ref(false);
const paid = ref(false);
const error = ref('');

async function handlePayment() {
  loading.value = true;
  error.value = '';

  try {
    // 简化流程：调用后端获取完整结果
    // 正式上线时这里应接入 PayPal JS SDK 弹窗支付
    const res = await fetch('/api/tailor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: props.sessionId,
        paid: true, // 跳过支付，直接获取（开发模式）
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    paid.value = true;
    emit('paid', data.result);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
