<script setup lang="ts">
import { computed, watch } from 'vue';

definePageMeta({
  ssr: false,
});

const route = useRoute();

const mode = computed(() => String(route.params.mode || ''));
const transport = computed(() => String(route.params.transport || ''));

const valid = computed(() => {
  return (mode.value === 'server-rendered' || mode.value === 'client-rendered')
    && (transport.value === 'rest' || transport.value === 'graphql');
});

watch(valid, (ok) => {
  if (!ok) {
    void navigateTo({
      path: '/server-rendered/rest',
      query: { example: 'single-page', scenario: 'html-default-theme' },
    }, { replace: true });
  }
}, { immediate: true });
</script>

<template>
  <FormieStarterApp
    v-if="valid"
    :mode="(mode as 'server-rendered' | 'client-rendered')"
    :transport="(transport as 'rest' | 'graphql')"
  />
</template>
