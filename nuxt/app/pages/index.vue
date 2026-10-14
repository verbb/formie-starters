<script setup lang="ts">
definePageMeta({
  ssr: false,
});

onMounted(() => {
  void navigateTo({
    path: '/server-rendered/rest',
    query: { example: 'single-page', scenario: 'html-default-theme' },
  }, { replace: true });
});
</script>

<template>
  <p class="p-6 text-sm text-slate-600">
    Loading starter…
  </p>
</template>
