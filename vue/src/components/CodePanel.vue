<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { highlightCode, type HighlightLanguage } from '../lib/highlight';

const props = defineProps<{
  code: string;
  language: HighlightLanguage;
}>();

const copyState = ref<'idle' | 'copied' | 'error'>('idle');

const highlightedCode = computed(() => {
  return highlightCode(props.code, props.language);
});

const copyLabel = computed(() => {
  if (copyState.value === 'copied') {
    return 'Copied';
  }
  if (copyState.value === 'error') {
    return 'Copy failed';
  }
  return 'Copy to clipboard';
});

let copyResetId: number | undefined;
watch(copyState, (next) => {
  if (copyResetId !== undefined) {
    window.clearTimeout(copyResetId);
    copyResetId = undefined;
  }
  if (next === 'idle') {
    return;
  }
  copyResetId = window.setTimeout(() => {
    copyState.value = 'idle';
    copyResetId = undefined;
  }, 1800);
});

onScopeDispose(() => {
  if (copyResetId !== undefined) {
    window.clearTimeout(copyResetId);
  }
});

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.code);
    copyState.value = 'copied';
  } catch {
    copyState.value = 'error';
  }
}
</script>

<template>
  <div class="relative rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
    <button
      type="button"
      class="absolute right-6 top-8 z-30 inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
      :title="copyLabel"
      :aria-label="copyLabel"
      @click="handleCopy"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      </svg>
    </button>
    <pre class="demo-code max-h-[32rem] overflow-auto p-6 text-xs text-slate-700"><code :class="`language-${language}`" v-html="highlightedCode" /></pre>
  </div>
</template>
