<script setup lang="ts">
import { useFormieHtml } from '@verbb/formie-vue';

const props = defineProps<{
  /** Same as React starter mount shell: `demo-preview` + `data-scenario` on the node that receives Formie HTML. */
  scenarioId: string;
  restEndpoint: string;
  graphqlEndpoint: string;
  transport: 'rest' | 'graphql';
  formHandle: string;
  theme?: 'formie' | 'none';
  themeConfig?: Record<string, unknown>;
}>();

const { rootRef, state } = useFormieHtml({
  transport: props.transport,
  endpoint: props.transport === 'graphql' ? props.graphqlEndpoint : props.restEndpoint,
  formHandle: props.formHandle,
  theme: props.theme,
  themeConfig: props.themeConfig,
});

defineExpose({
  state,
  rootRef,
});
</script>

<template>
  <div
    ref="rootRef"
    class="demo-preview"
    :data-scenario="scenarioId"
  />
</template>
