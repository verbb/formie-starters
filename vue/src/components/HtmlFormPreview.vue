<script setup lang="ts">
import { useFormieHtml } from '@verbb/formie-vue';

const props = defineProps<{
  /** Matches React starter: mount root carries `demo-preview` + `data-scenario` (Formie writes HTML into this node). */
  scenarioId: string;
  transport: 'rest' | 'graphql';
  endpoint: string;
  formHandle: string;
  theme?: 'formie' | 'none';
  themeConfig?: Record<string, unknown>;
}>();

const { rootRef, state } = useFormieHtml({
  transport: props.transport,
  endpoint: props.endpoint,
  formHandle: props.formHandle,
  theme: props.theme,
  themeConfig: props.themeConfig,
});

defineExpose({ state, rootRef });
</script>

<template>
  <div
    ref="rootRef"
    class="demo-preview"
    :data-scenario="scenarioId"
  />
</template>
