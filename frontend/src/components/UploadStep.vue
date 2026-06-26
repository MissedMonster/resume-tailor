<template>
  <div class="card">
    <h2>📄 Upload Your Resume</h2>

    <!-- File Upload -->
    <div
      class="upload-area"
      :class="{ dragover: isDragover }"
      @click="$refs.fileInput.click()"
      @dragover.prevent="isDragover = true"
      @dragleave="isDragover = false"
      @drop.prevent="onDrop"
    >
      <div class="icon">📎</div>
      <div class="main-text">Click to upload or drag & drop</div>
      <div class="sub-text">PDF, DOCX, or TXT (max 10MB)</div>

      <div v-if="file" class="file-name">
        ✅ {{ file.name }}
        <button @click.stop="file = null">&times;</button>
      </div>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.docx,.doc,.txt"
      hidden
      @change="onFileChange"
    />

    <!-- Job Description -->
    <label>📋 Paste Job Description</label>
    <textarea
      v-model="jobDescription"
      placeholder="Paste the full job description here — include requirements, qualifications, responsibilities, etc. The more detail, the better the result."
    ></textarea>
    <div style="text-align:right;font-size:0.8rem;color:var(--text-light);margin-top:4px">
      {{ jobDescription.length }} / 50 chars minimum
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <button
      class="btn btn-primary"
      :disabled="loading || !canSubmit"
      @click="submit"
      style="margin-top:20px"
    >
      <span v-if="loading" class="spinner" style="width:20px;height:20px;border-width:2px;margin:0"></span>
      {{ loading ? 'Analyzing...' : '✨ Generate Preview (Free)' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['done']);

const file = ref(null);
const jobDescription = ref('');
const loading = ref(false);
const isDragover = ref(false);
const error = ref('');

const canSubmit = computed(() => file.value && jobDescription.value.trim().length >= 50);

function onFileChange(e) {
  const f = e.target.files?.[0];
  if (f) file.value = f;
}

function onDrop(e) {
  isDragover.value = false;
  const f = e.dataTransfer.files?.[0];
  if (f) file.value = f;
}

async function submit() {
  error.value = '';
  loading.value = true;

  try {
    const formData = new FormData();
    formData.append('resume', file.value);
    formData.append('jobDescription', jobDescription.value);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    emit('done', {
      sessionId: data.sessionId,
      preview: data.preview,
      usage: data.usage,
      originalName: data.originalName || file.value?.name || 'resume',
    });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
