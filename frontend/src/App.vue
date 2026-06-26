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
import { ref } from 'vue';
import UploadStep from './components/UploadStep.vue';
import PreviewStep from './components/PreviewStep.vue';
import ResultStep from './components/ResultStep.vue';

const step = ref(1);
const sessionId = ref('');
const previewText = ref('');
const fullResult = ref('');

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
}
</script>
