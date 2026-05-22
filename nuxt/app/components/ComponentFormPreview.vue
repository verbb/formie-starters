<script setup lang="ts">
import {
  FRONTEND_CLIENT_EVENT_NAMES,
  compositePartDefinitions,
  createFrontendFormInstance,
  createGraphqlFrontendTransport,
  createRestFrontendTransport,
  isCompositeField,
  loadFrontendEnvelope,
  loadGraphqlFrontendEnvelope,
  type FrontendFieldDefinition,
  type FrontendFormInstance,
  type FrontendFormState,
} from '@verbb/formie-core';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

const props = defineProps<{
  handle: string;
  source: 'rest' | 'graphql';
  baseUrl: string;
  graphqlEndpoint: string;
}>();

const emit = defineEmits<{
  event: [{ name: string; payload: unknown }];
}>();

const loadError = ref<string | null>(null);
const loading = ref(true);
const instance = shallowRef<FrontendFormInstance | null>(null);
const state = ref<FrontendFormState | null>(null);

let unsubscribeState: (() => void) | null = null;
const eventUnbinds: Array<() => void> = [];

const currentPage = computed(() => {
  const s = state.value;
  if (!s) {
    return null;
  }
  return s.definition.pages.find((p) => p.id === s.currentPageId) || null;
});

function scalarString(value: unknown): string {
  if (value == null) {
    return '';
  }
  return typeof value === 'string' ? value : String(value);
}

function compositeValue(fieldId: string, partHandle: string): string {
  const raw = state.value?.values[fieldId];
  if (!raw || typeof raw !== 'object') {
    return '';
  }
  const v = (raw as Record<string, unknown>)[partHandle];
  return scalarString(v);
}

function setScalarValue(fieldId: string, value: string) {
  instance.value?.setValue(fieldId, value);
}

function setCompositePart(fieldId: string, partHandle: string, value: string) {
  const r = instance.value;
  if (!r) {
    return;
  }
  const cur = r.getState().values[fieldId];
  const base = cur && typeof cur === 'object' ? { ...(cur as Record<string, unknown>) } : {};
  r.setValue(fieldId, { ...base, [partHandle]: value });
}

function setAgree(fieldId: string, checked: boolean) {
  instance.value?.setValue(fieldId, checked);
}

function fieldHidden(field: FrontendFieldDefinition): boolean {
  return state.value?.fieldStates[field.id]?.hidden === true;
}

function fieldErrors(fieldId: string): string[] {
  return state.value?.errors.fields[fieldId] || [];
}

function optionList(field: FrontendFieldDefinition): Array<{ label: string; value: string }> {
  const opts = field.input.options;
  if (!Array.isArray(opts)) {
    return [];
  }
  return opts.map((o) => {
    const rec = o as Record<string, unknown>;
    return {
      label: String(rec.label ?? rec.value ?? ''),
      value: String(rec.value ?? ''),
    };
  });
}

function placeholderForField(field: FrontendFieldDefinition): string | undefined {
  return typeof field.input.placeholder === 'string' ? field.input.placeholder : undefined;
}

function isChecked(field: FrontendFieldDefinition, optValue: string): boolean {
  const v = state.value?.values[field.id];
  if (field.type === 'checkboxes' && Array.isArray(v)) {
    return v.map(String).includes(optValue);
  }
  return false;
}

function toggleCheckbox(field: FrontendFieldDefinition, optValue: string, checked: boolean) {
  const r = instance.value;
  if (!r) {
    return;
  }
  const v = r.getState().values[field.id];
  const cur = Array.isArray(v) ? v.map(String) : [];
  const next = checked
    ? [...new Set([...cur, optValue])]
    : cur.filter((x) => x !== optValue);
  r.setValue(field.id, next);
}

async function teardown() {
  eventUnbinds.splice(0).forEach((u) => {
    u();
  });
  unsubscribeState?.();
  unsubscribeState = null;
  if (instance.value) {
    await instance.value.destroy();
    instance.value = null;
  }
  state.value = null;
}

async function bootstrap() {
  await teardown();
  loading.value = true;
  loadError.value = null;

  try {
    const envelope = props.source === 'graphql'
      ? await loadGraphqlFrontendEnvelope({
        endpoint: props.graphqlEndpoint,
        formHandle: props.handle,
      })
      : await loadFrontendEnvelope({
        endpoint: props.baseUrl,
        formHandle: props.handle,
      });

    const transport = props.source === 'graphql'
      ? createGraphqlFrontendTransport({
        endpoint: props.graphqlEndpoint,
        formHandle: props.handle,
      })
      : createRestFrontendTransport({
        endpoint: props.baseUrl,
        formHandle: props.handle,
      });

    const rt = createFrontendFormInstance({ envelope, transport });
    instance.value = rt;
    unsubscribeState = rt.subscribe((s) => {
      state.value = s;
    });

    FRONTEND_CLIENT_EVENT_NAMES.forEach((name) => {
      eventUnbinds.push(rt.on(name, (payload) => {
        emit('event', { name, payload });
      }));
    });
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Unable to load the component payload.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void bootstrap();
});

watch(
  () => [props.handle, props.source, props.baseUrl, props.graphqlEndpoint] as const,
  () => {
    void bootstrap();
  },
);

onBeforeUnmount(() => {
  void teardown();
});

async function onPrimary() {
  const page = currentPage.value;
  if (!page || !instance.value) {
    return;
  }
  const action = page.actions.primary.type === 'next' ? 'next' : 'submit';
  await instance.value.submit(action);
}

async function onSecondary(type: 'back' | 'save') {
  if (!instance.value) {
    return;
  }
  await instance.value.submit(type);
}
</script>

<template>
  <div>
    <div
      v-if="loadError"
      class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ loadError }}
    </div>
    <div
      v-else-if="loading"
      class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Loading component payload...
    </div>
    <div
      v-else-if="state && currentPage"
      class="starter-nuxt-component-form space-y-4 text-slate-900"
    >
      <div
        v-if="state.errors.form.length"
        class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        <ul class="list-disc pl-4">
          <li v-for="(msg, i) in state.errors.form" :key="i">
            {{ msg }}
          </li>
        </ul>
      </div>

      <div v-for="(row, rowIndex) in currentPage.rows" :key="`row-${rowIndex}`" class="space-y-4">
        <template v-for="field in row.fields" :key="field.id">
          <div
            v-if="!fieldHidden(field) && !isCompositeField(field)"
            class="starter-component-card"
          >
            <label
              v-if="field.label && field.type !== 'agree'"
              class="starter-component-label"
            >
              {{ field.label }}
              <span v-if="field.required" class="text-red-600">*</span>
            </label>
            <p v-if="field.instructions && field.type !== 'agree'" class="starter-component-help">
              {{ field.instructions }}
            </p>

            <div class="starter-nuxt-injected-control grid gap-2">
              <template v-if="field.type === 'multi-line-text'">
                <textarea
                  class="starter-component-control"
                  :value="scalarString(state.values[field.id])"
                  rows="4"
                  :placeholder="placeholderForField(field)"
                  @input="setScalarValue(field.id, ($event.target as HTMLTextAreaElement).value)"
                />
              </template>

              <template v-else-if="field.type === 'dropdown'">
                <select
                  class="starter-component-control"
                  :value="scalarString(state.values[field.id])"
                  @change="setScalarValue(field.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">
                    Select…
                  </option>
                  <option v-for="opt in optionList(field)" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </template>

              <template v-else-if="field.type === 'radio'">
                <div class="grid gap-2">
                  <label v-for="opt in optionList(field)" :key="opt.value" class="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      :name="field.id"
                      :value="opt.value"
                      :checked="scalarString(state.values[field.id]) === opt.value"
                      @change="setScalarValue(field.id, opt.value)"
                    >
                    {{ opt.label }}
                  </label>
                </div>
              </template>

              <template v-else-if="field.type === 'checkboxes'">
                <div class="grid gap-2">
                  <label v-for="opt in optionList(field)" :key="opt.value" class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      :checked="isChecked(field, opt.value)"
                      @change="toggleCheckbox(field, opt.value, ($event.target as HTMLInputElement).checked)"
                    >
                    {{ opt.label }}
                  </label>
                </div>
              </template>

              <template v-else-if="field.type === 'agree'">
                <label class="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    :checked="state.values[field.id] === true"
                    @change="setAgree(field.id, ($event.target as HTMLInputElement).checked)"
                  >
                  {{ field.label }}
                </label>
              </template>

              <template v-else-if="field.type === 'date'">
                <input
                  type="date"
                  class="starter-component-control"
                  :value="scalarString(state.values[field.id])"
                  @input="setScalarValue(field.id, ($event.target as HTMLInputElement).value)"
                >
              </template>

              <template v-else-if="['file', 'repeater', 'signature'].includes(field.type)">
                <p class="text-sm text-slate-500">
                  Field type “{{ field.type }}” is not rendered in this starter preview; use the server-rendered mode tabs to exercise it.
                </p>
              </template>

              <template v-else>
                <input
                  type="text"
                  class="starter-component-control"
                  :value="scalarString(state.values[field.id])"
                  :placeholder="placeholderForField(field)"
                  @input="setScalarValue(field.id, ($event.target as HTMLInputElement).value)"
                >
              </template>
            </div>

            <ul v-if="fieldErrors(field.id).length" class="grid gap-1 text-sm text-red-600">
              <li v-for="(err, i) in fieldErrors(field.id)" :key="i">
                {{ err }}
              </li>
            </ul>
          </div>

          <div
            v-else-if="!fieldHidden(field) && isCompositeField(field)"
            class="starter-component-card"
          >
            <label v-if="field.label" class="starter-component-label">
              {{ field.label }}
              <span v-if="field.required" class="text-red-600">*</span>
            </label>
            <p v-if="field.instructions" class="starter-component-help">
              {{ field.instructions }}
            </p>
            <div class="starter-nuxt-injected-control starter-component-name-grid">
              <div
                v-for="part in compositePartDefinitions(field)"
                :key="part.id"
                class="starter-component-subfield"
              >
                <span class="starter-component-subfield-label">{{ part.label || part.handle }}</span>
                <input
                  type="text"
                  class="starter-component-control"
                  :value="compositeValue(field.id, part.handle)"
                  :placeholder="placeholderForField(part)"
                  @input="setCompositePart(field.id, part.handle, ($event.target as HTMLInputElement).value)"
                >
              </div>
            </div>
            <ul v-if="fieldErrors(field.id).length" class="grid gap-1 text-sm text-red-600">
              <li v-for="(err, i) in fieldErrors(field.id)" :key="i">
                {{ err }}
              </li>
            </ul>
          </div>
        </template>
      </div>

      <div class="starter-nuxt-actions flex flex-wrap gap-3">
        <button
          v-for="sec in currentPage.actions.secondary"
          :key="sec.type"
          type="button"
          class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          @click="onSecondary(sec.type)"
        >
          {{ sec.label }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-violet-500 bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
          :disabled="state.status === 'submitting'"
          @click="onPrimary"
        >
          {{ currentPage.actions.primary.label }}
        </button>
      </div>
    </div>
  </div>
</template>
