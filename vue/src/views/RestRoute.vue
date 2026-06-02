<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue';
import CodePanel from '../components/CodePanel.vue';
import ComponentFormPreview from '../components/ComponentFormPreview.vue';
import HtmlFormPreview from '../components/HtmlFormPreview.vue';
import {
  DEFAULT_EXAMPLE_ID,
  DEFAULT_SCENARIO_ID,
  DEMO_EXAMPLES,
  FORMIE_BASE_URL,
  REST_SCENARIOS,
  describeRestBaseUrl,
  resolveExample,
  resolveRestScenarioForMode,
  type DemoExample,
  type RestScenario,
} from '../lib/demo-data';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from '../lib/event-log';
import { toAppHref } from '../lib/routing';
import { requestRestDefinitionEnvelope, requestRestHtmlPayload } from '../lib/server-payloads';

const props = defineProps<{
  search: string;
  presentationMode: 'server-rendered' | 'client-rendered';
}>();

const emit = defineEmits<{
  navigate: [url: string, options?: { replace?: boolean }];
}>();

type RestPanelId = 'preview' | 'response' | 'code' | 'events';
type RequestCodeMode = 'formie' | 'app';

const activePanel = ref<RestPanelId>('preview');
const activeRequestMode = ref<RequestCodeMode>('formie');
const eventLog = ref<EventLogEntry[]>([]);
const serverResponse = ref('Loading response...');
const serverResponseError = ref<string | null>(null);
const previewSurfaceRef = ref<HTMLElement | null>(null);
const htmlPreviewRef = ref<InstanceType<typeof HtmlFormPreview> | null>(null);

const params = computed(() => {
  return new URLSearchParams(props.search);
});

const isComponentScenario = computed(() => {
  return props.presentationMode === 'client-rendered';
});

const selectedExample = computed(() => {
  return isComponentScenario.value
    ? resolveExample(DEFAULT_EXAMPLE_ID)
    : resolveExample(params.value.get('example') || DEFAULT_EXAMPLE_ID);
});

const selectedScenario = computed(() => {
  return isComponentScenario.value
    ? resolveRestScenarioForMode('client-rendered', 'component-rest-form')
    : resolveRestScenarioForMode('server-rendered', params.value.get('scenario') || DEFAULT_SCENARIO_ID);
});

const activeHtmlScenario = computed(() => {
  return !isComponentScenario.value
    ? selectedScenario.value
    : REST_SCENARIOS.find((s) => {
      return s.id === DEFAULT_SCENARIO_ID;
    }) || REST_SCENARIOS[0];
});

const htmlPreviewKey = computed(() => {
  return `${selectedExample.value.id}:${activeHtmlScenario.value.id}:${isComponentScenario.value ? 'component' : 'html-rest'}`;
});

function buildRestUrl(route: 'server-rendered' | 'client-rendered', exampleId: string, scenarioId: string): string {
  return `/${route}/rest?example=${exampleId}&scenario=${scenarioId}`;
}

function getPanelLabel(panel: RestPanelId): string {
  if (panel === 'preview') {
    return 'Preview';
  }
  if (panel === 'response') {
    return 'Response';
  }
  if (panel === 'code') {
    return 'Code';
  }
  return 'Events';
}

function formatDemoError(example: DemoExample, error: Error | null): string | null {
  if (!error) {
    return null;
  }
  return `Unable to load the "${example.title}" demo form (${example.handle}). ${error.message}`;
}

function buildHtmlSnippet(example: DemoExample, scenario: RestScenario): string {
  const lines = [
    "import { useFormieHtml } from '@verbb/formie-vue';",
    '',
    'const { rootRef } = useFormieHtml({',
    "  transport: 'rest',",
    `  endpoint: '${FORMIE_BASE_URL}',`,
    `  formHandle: '${example.handle}',`,
    `  theme: '${scenario.theme}',`,
  ];
  if (scenario.themeConfig) {
    lines.push(`  themeConfig: ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, '\n  ')},`);
  }
  lines.push(
    '});',
    '',
    '/* template: <div ref="rootRef" class="demo-preview" :data-scenario="scenarioId" /> */',
  );
  return lines.join('\n');
}

function buildComponentDrivenSnippet(example: DemoExample): string {
  return [
    '<script setup lang="ts">',
    "import { defineComponent, h, type PropType } from 'vue';",
    "import {",
    '  FormieForm,',
    '  type FormieFieldComponentProps,',
    '  type FormieFieldProps,',
    "} from '@verbb/formie-vue';",
    '',
    'const Field = defineComponent({',
    "  name: 'Field',",
    '  props: {',
    "    field: { type: Object as PropType<FormieFieldProps['field']>, required: true },",
    "    errors: { type: Array as PropType<string[]>, required: true },",
    '  },',
    '  setup(props, { slots }) {',
    '    return () =>',
    "      h('div', { class: 'my-field' }, [",
    "        props.field.label ? h('label', props.field.label) : null,",
    '        ...(slots.default?.() ?? []),',
    '      ]);',
    '  },',
    '});',
    '',
    'const TextField = defineComponent({',
    "  name: 'TextField',",
    '  props: {',
    "    field: { type: Object as PropType<FormieFieldComponentProps['field']>, required: true },",
    '    value: { type: null, default: \'\' },',
    '    disabled: { type: Boolean, default: false },',
    "    setValue: { type: Function as PropType<FormieFieldComponentProps['setValue']>, required: true },",
    '  },',
    '  setup(props) {',
    '    return () =>',
    "      h('input', {",
    "        type: 'text',",
    "        class: 'my-text-input',",
    '        value: typeof props.value === \'string\' ? props.value : \'\',',
    '        disabled: props.disabled,',
    '        onInput: (event: Event) => {',
    '          props.setValue((event.target as HTMLInputElement).value);',
    '        },',
    '      });',
    '  },',
    '});',
    '',
    'const formSource = {',
    "  transport: 'rest' as const,",
    `  endpoint: '${FORMIE_BASE_URL}',`,
    `  formHandle: '${example.handle}',`,
    '} as const;',
    '<' + '/script>',
    '',
    '<template>',
    '  <FormieForm',
    '    :source="formSource"',
    '    :components="{ Field }"',
    "    :field-components=\"{ 'single-line-text': TextField }\"",
    '  />',
    '</template>',
  ].join('\n');
}

function buildRestByoHtmlSnippet(example: DemoExample, scenario: RestScenario): string {
  const renderOptions: Record<string, unknown> = {
    theme: scenario.theme,
  };
  if (scenario.themeConfig) {
    renderOptions.themeConfig = scenario.themeConfig;
  }
  return [
    "import { createVueFormieClient } from '@verbb/formie-vue';",
    '',
    `const endpoint = '${FORMIE_BASE_URL}';`,
    'const client = createVueFormieClient();',
    '',
    'const response = await fetch(`${endpoint}/actions/formie/server/forms/render`, {',
    "  method: 'POST',",
    "  credentials: 'same-origin',",
    '  headers: {',
    "    'Content-Type': 'application/json',",
    '  },',
    '  body: JSON.stringify({',
    `    handle: '${example.handle}',`,
    `    renderOptions: ${JSON.stringify(renderOptions, null, 6).replace(/\n/g, '\n    ')},`,
    '  }),',
    '});',
    '',
    'const payload = await response.json();',
    'await client.mount(root, { mode: \'html\', payload });',
  ].join('\n');
}

function buildRestByoComponentSnippet(example: DemoExample): string {
  return [
    '<script setup lang="ts">',
    "import { computed, onMounted, ref } from 'vue';",
    "import { FormieClientForm, type FrontendFormEnvelope } from '@verbb/formie-vue';",
    '',
    `const endpoint = '${FORMIE_BASE_URL}';`,
    '',
    'const definition = ref<FrontendFormEnvelope | null>(null);',
    '',
    'onMounted(async () => {',
    '  const response = await fetch(`${endpoint}/actions/formie/client/forms/load`, {',
    "    method: 'POST',",
    "    credentials: 'same-origin',",
    '    headers: {',
    "      'Content-Type': 'application/json',",
    '    },',
    '    body: JSON.stringify({',
    `      handle: '${example.handle}',`,
    '    }),',
    '  });',
    '  definition.value = await response.json();',
    '});',
    '',
    'const formSource = computed(() => {',
    '  const def = definition.value;',
    '  if (!def) {',
    '    return null;',
    '  }',
    '  return {',
    '    definition: def,',
    '    transport: {',
    "      type: 'rest' as const,",
    '      endpoint,',
    `      formHandle: '${example.handle}',`,
    '    },',
    '  };',
    '});',
    '<' + '/script>',
    '',
    '<template>',
    '  <div v-if="!formSource">Loading...</div>',
    '  <FormieClientForm v-else :source="formSource" />',
    '</template>',
  ].join('\n');
}

const htmlErrorMessage = ref<string | null>(null);

watchEffect(() => {
  if (isComponentScenario.value) {
    htmlErrorMessage.value = null;
    return;
  }
  const child = htmlPreviewRef.value;
  const example = selectedExample.value;
  if (!child?.state?.error) {
    htmlErrorMessage.value = null;
    return;
  }
  const er = child.state.error;
  const val = er && typeof er === 'object' && 'value' in er ? (er as { value: Error | null }).value : er;
  htmlErrorMessage.value = formatDemoError(example, val instanceof Error ? val : null);
});

const htmlSnippet = computed(() => {
  return isComponentScenario.value
    ? buildComponentDrivenSnippet(selectedExample.value)
    : buildHtmlSnippet(selectedExample.value, activeHtmlScenario.value);
});

const appFetchSnippet = computed(() => {
  return isComponentScenario.value
    ? buildRestByoComponentSnippet(selectedExample.value)
    : buildRestByoHtmlSnippet(selectedExample.value, activeHtmlScenario.value);
});

watch([selectedExample, selectedScenario], () => {
  eventLog.value = [];
});

watch(() => props.presentationMode, () => {
  activeRequestMode.value = 'formie';
});

watch(
  [activePanel, isComponentScenario, selectedExample, activeHtmlScenario],
  async ([panel]) => {
    if (panel !== 'response') {
      serverResponse.value = 'Open the Response tab to load the live payload.';
      serverResponseError.value = null;
      return;
    }

    serverResponse.value = 'Loading response...';
    serverResponseError.value = null;

    try {
      const payload = isComponentScenario.value
        ? await requestRestDefinitionEnvelope(FORMIE_BASE_URL, selectedExample.value.handle)
        : await requestRestHtmlPayload(FORMIE_BASE_URL, selectedExample.value.handle, {
          mode: 'server-rendered',
          endpoint: FORMIE_BASE_URL,
          theme: activeHtmlScenario.value.theme,
          themeConfig: activeHtmlScenario.value.themeConfig,
        });
      serverResponse.value = JSON.stringify(payload, null, 2);
    } catch (error: unknown) {
      serverResponseError.value = error instanceof Error ? error.message : 'Unable to load the server response.';
    }
  },
);

watch(
  () => {
    const inst = htmlPreviewRef.value?.state?.instance;
    if (inst && typeof inst === 'object' && 'value' in inst) {
      return (inst as { value: unknown }).value;
    }
    return inst ?? null;
  },
  (instance) => {
    if (!instance || isComponentScenario.value) {
      return;
    }
    if (eventLog.value.length > 0) {
      return;
    }
    eventLog.value = [
      createEventEntry('formie:validator:ready', null),
      createEventEntry('formie:mount:after', null),
    ];
  },
);

let unbindPreviewEvents: Array<() => void> = [];

watch([previewSurfaceRef, selectedExample, selectedScenario, isComponentScenario], () => {
  unbindPreviewEvents.forEach((u) => {
    u();
  });
  unbindPreviewEvents = [];

  const root = previewSurfaceRef.value;
  if (!root || isComponentScenario.value) {
    return;
  }

  const appendEvent = (eventName: string, detail: unknown) => {
    eventLog.value = [createEventEntry(eventName, detail), ...eventLog.value].slice(0, 40);
  };

  unbindPreviewEvents = OBSERVED_FORMIE_EVENTS.map((eventName) => {
    const handler = (event: Event) => {
      appendEvent(eventName, (event as CustomEvent<unknown>).detail);
    };
    root.addEventListener(eventName, handler as EventListener);
    return () => {
      root.removeEventListener(eventName, handler as EventListener);
    };
  });
}, {
  flush: 'post',
});

onBeforeUnmount(() => {
  unbindPreviewEvents.forEach((u) => {
    u();
  });
});

function onComponentFormEvent(evt: { name: string; payload: unknown }) {
  eventLog.value = [createEventEntry(evt.name, evt.payload), ...eventLog.value].slice(0, 50);
}

function navigate(url: string, options?: { replace?: boolean }) {
  emit('navigate', url, options);
}
</script>

<template>
  <section
    v-if="!isComponentScenario"
    class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <div class="space-y-3">
      <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
        Choose form
      </h3>
      <div class="grid gap-3 md:grid-cols-3">
        <a
          v-for="item in DEMO_EXAMPLES"
          :key="item.id"
          :href="toAppHref(buildRestUrl('server-rendered', item.id, selectedScenario.id))"
          class="rounded border p-4 transition"
          :class="item.id === selectedExample.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
          @click.prevent="navigate(buildRestUrl('server-rendered', item.id, selectedScenario.id))"
        >
          <p class="text-sm font-semibold text-slate-900">
            {{ item.title }}
          </p>
          <p class="mt-1 text-xs text-slate-600">
            {{ item.summary }}
          </p>
        </a>
      </div>
    </div>

    <div class="border-t border-slate-200 pt-5">
      <div class="space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Theme + style options
        </h3>
        <div class="grid gap-3 md:grid-cols-2">
          <a
            v-for="item in REST_SCENARIOS.filter((s) => s.mode === 'server-rendered')"
            :key="item.id"
            :href="toAppHref(buildRestUrl('server-rendered', selectedExample.id, item.id))"
            class="rounded border p-4 transition"
            :class="item.id === selectedScenario.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            @click.prevent="navigate(buildRestUrl('server-rendered', selectedExample.id, item.id))"
          >
            <p class="text-sm font-semibold text-slate-900">
              {{ item.title }}
            </p>
            <p class="mt-1 text-xs text-slate-600">
              {{ item.summary }}
            </p>
            <p v-if="item.description" class="mt-2 text-xs text-violet-600">
              {{ item.description }}
            </p>
          </a>
        </div>
      </div>
    </div>

    <div class="border-t border-slate-200 pt-5">
      <div class="relative mt-4 space-y-4">
        <div class="absolute right-4 top-0 z-10 -mt-4 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
          <button
            v-for="panel in (['preview', 'response', 'code', 'events'] as const)"
            :key="panel"
            type="button"
            class="border-l border-slate-200 px-5 py-2 text-sm font-medium transition first:border-l-0"
            :class="activePanel === panel ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-50'"
            @click="activePanel = panel"
          >
            {{ getPanelLabel(panel) }}
          </button>
        </div>

        <div v-show="activePanel === 'preview'">
          <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
            <div v-if="htmlErrorMessage" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {{ htmlErrorMessage }}
            </div>
            <div ref="previewSurfaceRef">
              <HtmlFormPreview
                :key="htmlPreviewKey"
                ref="htmlPreviewRef"
                :scenario-id="selectedScenario.id"
                transport="rest"
                :endpoint="FORMIE_BASE_URL"
                :form-handle="selectedExample.handle"
                :theme="activeHtmlScenario.theme"
                :theme-config="activeHtmlScenario.themeConfig"
              />
            </div>
          </div>
        </div>

        <div v-show="activePanel === 'response'">
          <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ serverResponseError }}
          </div>
          <CodePanel v-else :code="serverResponse" language="json" />
        </div>

        <div v-show="activePanel === 'code'">
          <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="tab in ([{ id: 'formie', label: 'Formie fetch' }, { id: 'app', label: 'App fetch' }] as const)"
                :key="tab.id"
                type="button"
                class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
                :class="activeRequestMode === tab.id ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'"
                @click="activeRequestMode = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>
            <CodePanel :code="activeRequestMode === 'formie' ? htmlSnippet : appFetchSnippet" language="typescript" />
          </div>
        </div>

        <div v-show="activePanel === 'events'">
          <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="space-y-1">
                <h3 class="text-sm font-semibold text-slate-900">
                  Live event log ({{ eventLog.length }})
                </h3>
                <p class="text-sm text-slate-600">
                  Interact with the preview tab, then return here to inspect the canonical `formie:*` events emitted by the mounted form.
                </p>
              </div>
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                @click="eventLog = []"
              >
                Clear log
              </button>
            </div>
            <div v-if="eventLog.length" class="space-y-2">
              <details v-for="entry in eventLog" :key="entry.id" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <summary class="cursor-pointer list-none">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-xs font-semibold text-slate-900">
                        {{ entry.name }}
                      </p>
                      <p class="truncate text-[11px] text-slate-500">
                        {{ entry.summary }}
                      </p>
                    </div>
                    <span class="shrink-0 text-[11px] text-slate-500">{{ entry.time }}</span>
                  </div>
                </summary>
                <pre class="mt-2 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] text-slate-100">{{ entry.detail }}</pre>
              </details>
            </div>
            <div v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
              No events logged yet. Open the preview, validate fields, move between pages, upload files, or submit the form to populate this pane.
            </div>
          </div>
        </div>

        <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">
            Technical details
          </summary>
          <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p>Example handle: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code></p>
            <p>Base URL: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code></p>
            <p>Mode: <code class="rounded bg-white px-2 py-1 text-slate-700">html</code></p>
            <p>Transport: <code class="rounded bg-white px-2 py-1 text-slate-700">rest</code></p>
            <p>Theme: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedScenario.theme }}</code></p>
            <p>Scenario id: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedScenario.id }}</code></p>
          </div>
          <pre
            v-if="selectedScenario.themeConfig"
            class="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700"
          >{{ JSON.stringify(selectedScenario.themeConfig, null, 2) }}</pre>
        </details>
      </div>
    </div>
  </section>

  <section
    v-else
    class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    :data-selected-url="buildRestUrl('client-rendered', selectedExample.id, selectedScenario.id)"
  >
    <div class="relative mt-4 space-y-4">
      <div class="absolute right-4 top-0 z-10 -mt-4 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
        <button
          v-for="panel in (['preview', 'response', 'code', 'events'] as const)"
          :key="panel"
          type="button"
          class="border-l border-slate-200 px-5 py-2 text-sm font-medium transition first:border-l-0"
          :class="activePanel === panel ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-50'"
          @click="activePanel = panel"
        >
          {{ getPanelLabel(panel) }}
        </button>
      </div>

      <div v-show="activePanel === 'preview'">
        <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
          <ComponentFormPreview
            :key="`${selectedExample.id}:${selectedScenario.id}`"
            :handle="selectedExample.handle"
            source="rest"
            :base-url="FORMIE_BASE_URL"
            @form-event="onComponentFormEvent"
          />
        </div>
      </div>

      <div v-show="activePanel === 'response'">
        <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ serverResponseError }}
        </div>
        <CodePanel v-else :code="serverResponse" language="json" />
      </div>

      <div v-show="activePanel === 'code'">
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="tab in ([{ id: 'formie', label: 'Formie fetch' }, { id: 'app', label: 'App fetch' }] as const)"
              :key="tab.id"
              type="button"
              class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
              :class="activeRequestMode === tab.id ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'"
              @click="activeRequestMode = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <CodePanel :code="activeRequestMode === 'formie' ? htmlSnippet : appFetchSnippet" language="typescript" />
        </div>
      </div>

      <div v-show="activePanel === 'events'">
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-slate-900">
                Live event log ({{ eventLog.length }})
              </h3>
              <p class="text-sm text-slate-600">
                Interact with the preview tab, then return here to inspect form events (`formie:submit:result`, `formie:page:navigate`, …).
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              @click="eventLog = []"
            >
              Clear log
            </button>
          </div>
          <div v-if="eventLog.length" class="space-y-2">
            <details v-for="entry in eventLog" :key="entry.id" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <summary class="cursor-pointer list-none">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-xs font-semibold text-slate-900">
                      {{ entry.name }}
                    </p>
                    <p class="truncate text-[11px] text-slate-500">
                      {{ entry.summary }}
                    </p>
                  </div>
                  <span class="shrink-0 text-[11px] text-slate-500">{{ entry.time }}</span>
                </div>
              </summary>
              <pre class="mt-2 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] text-slate-100">{{ entry.detail }}</pre>
            </details>
          </div>
          <div v-else class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
            No events logged yet. Submit or navigate pages in the component preview to populate this pane.
          </div>
        </div>
      </div>

      <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">
          Technical details
        </summary>
        <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <p>Example handle: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code></p>
          <p>Base URL: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code></p>
          <p>Mode: <code class="rounded bg-white px-2 py-1 text-slate-700">component</code></p>
          <p>Transport: <code class="rounded bg-white px-2 py-1 text-slate-700">rest</code></p>
          <p>Theme: <code class="rounded bg-white px-2 py-1 text-slate-700">host-owned</code></p>
          <p>Scenario id: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedScenario.id }}</code></p>
        </div>
      </details>
    </div>
  </section>
</template>
