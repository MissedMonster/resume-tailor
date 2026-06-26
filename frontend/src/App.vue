<template>
  <div>
    <!-- Header -->
    <header class="header">
      <h1>AI <span>Resume Tailor</span></h1>
      <p>Upload your resume, paste a job description, get an ATS-optimized resume instantly</p>
    </header>

    <!-- Steps -->
    <div class="steps">
      <div class="step-dot" :class="{ active: step === 1, done: step > 1 }">1</div>
      <div class="step-line" :class="{ done: step > 1 }"></div>
      <div class="step-dot" :class="{ active: step === 2, done: step > 2 }">2</div>
      <div class="step-line" :class="{ done: step > 2 }"></div>
      <div class="step-dot" :class="{ active: step === 3, done: step > 3 }">3</div>
    </div>

    <!-- 支付回来加载中 -->
    <div v-if="step === 0" class="card" style="text-align:center">
      <div class="loading">
        <div class="spinner"></div>
        <p v-if="captureError" style="color:var(--danger);margin-top:12px">{{ captureError }}</p>
        <p v-else>Completing your payment...</p>
      </div>
      <button v-if="captureError" class="btn btn-outline" @click="onRestart" style="margin-top:12px">Start Over</button>
    </div>

    <!-- Step 1: Upload -->
    <UploadStep
      v-if="step === 1"
      @done="onUploadDone"
    />

    <!-- Step 2: Preview + Pay -->
    <PreviewStep
      v-if="step === 2"
      :session-id="sessionId"
      :preview="previewText"
      @paid="onPaid"
      @back="step = 1"
    />

    <!-- Step 3: Result -->
    <ResultStep
      v-if="step === 3"
      :result="fullResult"
      @restart="onRestart"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import UploadStep from './components/UploadStep.vue';
import PreviewStep from './components/PreviewStep.vue';
import ResultStep from './components/ResultStep.vue';

const step = ref(1);
const sessionId = ref('');
const previewText = ref('');
const fullResult = ref('');
const captureError = ref('');

// 页面加载时检查是否从 PayPal 支付回来
onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token'); // PayPal 返回的 order ID
  const storedOrder = sessionStorage.getItem('paypal_order_id');
  const storedSession = sessionStorage.getItem('paypal_session_id');

  if (token && storedOrder && storedSession) {
    // 用户刚支付完跳回来
    step.value = 0; // 加载状态

    try {
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderID: storedOrder }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Payment verification failed');
      }

      const data = await res.json();

      // 清理
      sessionStorage.removeItem('paypal_order_id');
      sessionStorage.removeItem('paypal_session_id');
      window.history.replaceState({}, '', window.location.pathname);

      // 显示结果
      fullResult.value = data.result;
      step.value = 3;
    } catch (err) {
      captureError.value = err.message;
      // step 保持在 0，显示错误
    }
  }
});

function onUploadDone({ sessionId: sid, preview }) {
  sessionId.value = sid;
  previewText.value = preview;
  step.value = 2;
}

function onPaid(result) {
  fullResult.value = result;
  step.value = 3;
}

function onRestart() {
  step.value = 1;
  sessionId.value = '';
  previewText.value = '';
  fullResult.value = '';
  captureError.value = '';
}
</script>
