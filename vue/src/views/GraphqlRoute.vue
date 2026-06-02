<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue';
import CodePanel from '../components/CodePanel.vue';
import ComponentFormPreview from '../components/ComponentFormPreview.vue';
import HtmlFormPreview from '../components/HtmlFormPreview.vue';
import {
  DEFAULT_EXAMPLE_ID,
  DEFAULT_GRAPHQL_DEMO_ID,
  DEFAULT_SCENARIO_ID,
  DEMO_EXAMPLES,
  FORMIE_BASE_URL,
  GRAPHQL_ENDPOINT,
  REST_SCENARIOS,
  describeGraphqlEndpoint,
  describeRestBaseUrl,
  resolveExample,
  resolveGraphqlDemoForMode,
  resolveRestScenarioForMode,
  type DemoExample,
  type GraphqlDemo,
  type RestScenario,
} from '../lib/demo-data';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from '../lib/event-log';
import {
  requestGraphqlDefinitionEnvelopeResponse,
  requestGraphqlHtmlPayloadResponse,
} from '../lib/server-payloads';
import { toAppHref } from '../lib/routing';

const props = defineProps<{
  search: string;
  presentationMode: 'server-rendered' | 'client-rendered';
}>();

const emit = defineEmits<{
  navigate: [url: string, options?: { replace?: boolean }];
}>();

type GraphqlPanelId = 'preview' | 'response' | 'code' | 'events';
type RequestCodeMode = 'formie' | 'app';

const activePanel = ref<GraphqlPanelId>('preview');
const activeRequestMode = ref<RequestCodeMode>('formie');
const eventLog = ref<EventLogEntry[]>([]);
const serverResponse = ref('Loading response...');
const serverResponseError = ref<string | null>(null);
const previewSurfaceRef = ref<HTMLElement | null>(null);
const htmlPreviewRef = ref<InstanceType<typeof HtmlFormPreview> | null>(null);

const params = computed(() => {
  return new URLSearchParams(props.search);
});

const isComponentRoute = computed(() => {
  return props.presentationMode === 'client-rendered';
});

const selectedExample = computed(() => {
  return isComponentRoute.value
    ? resolveExample(DEFAULT_EXAMPLE_ID)
    : resolveExample(params.value.get('example') || DEFAULT_EXAMPLE_ID);
});

const selectedDemo = computed(() => {
  return isComponentRoute.value
    ? resolveGraphqlDemoForMode('client-rendered', 'component-payload')
    : resolveGraphqlDemoForMode('server-rendered', params.value.get('demo') || DEFAULT_GRAPHQL_DEMO_ID);
});

const selectedScenario = computed(() => {
  return resolveRestScenarioForMode('server-rendered', params.value.get('scenario') || DEFAULT_SCENARIO_ID);
});

const previewMode = computed(() => {
  return selectedDemo.value.mode;
});

const htmlPreviewKey = computed(() => {
  return `gql:${selectedExample.value.id}:${selectedScenario.value.id}:${selectedDemo.value.id}`;
});

function buildGraphqlUrl(
  presentation: 'server-rendered' | 'client-rendered',
  exampleId: string,
  demoId: string,
  scenarioId?: string,
): string {
  const p = new URLSearchParams({
    example: exampleId,
    demo: demoId,
  });
  if (scenarioId) {
    p.set('scenario', scenarioId);
  }
  return `/${presentation}/graphql?${p.toString()}`;
}

function buildHtmlOptions(scenario: RestScenario): Record<string, unknown> {
  const options: Record<string, unknown> = {
    theme: scenario.theme,
  };
  if (scenario.themeConfig) {
    options.themeConfig = scenario.themeConfig;
  }
  return options;
}

function buildFrontendContractSubmissionExample(example: DemoExample) {
  return {
    query: [
      'mutation SubmitFormieClientForm(',
      '  $input: FormieClientSubmitInput!',
      ') {',
      '  submitFormieClientForm(input: $input) {',
      '    success',
      '    submissionUid',
      '    currentPageId',
      '    nextPageId',
      '    previousPageId',
      '    isFinalPage',
      '    errors',
      '    messages',
      '    session {',
      '      id',
      '      currentPageId',
      '      tokens',
      '      continuation',
      '    }',
      '  }',
      '}',
    ].join('\n'),
    variables: {
      input: {
        handle: example.handle,
        action: 'submit',
        session: {
          id: 'session-id',
          currentPageId: 'page-1',
          tokens: {
            request: 'request-token',
            render: 'render-id',
          },
        },
        values: {
          fullName: 'Josh Crawford',
          emailAddress: 'josh@example.com',
        },
      },
    },
  };
}

function getPanelLabel(panel: GraphqlPanelId): string {
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

function buildUsageSnippet(example: DemoExample, demo: GraphqlDemo, scenario: RestScenario): string {
  if (demo.id === 'html-payload') {
    const query = [
      'query HtmlFormPayload($handle: String!, $input: ServerRenderPayloadInput) {',
      '  formieHtmlForm(handle: $handle, input: $input) {',
      '    html',
      '  }',
      '}',
    ].join('\n');
    const variables = JSON.stringify({
      handle: example.handle,
      input: buildHtmlOptions(scenario),
    }, null, 2);
    return [
      `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
      `const query = ${JSON.stringify(query)};`,
      `const variables = ${variables};`,
      '',
      'const response = await fetch(graphqlEndpoint, {',
      "  method: 'POST',",
      "  credentials: 'same-origin',",
      '  headers: {',
      "    'Content-Type': 'application/json',",
      "    Accept: 'application/json',",
      '  },',
      '  body: JSON.stringify({ query, variables }),',
      '});',
      '',
      'const { data } = await response.json();',
      "const client = (await import('@verbb/formie-vue')).createVueFormieClient();",
      'await client.mount(root, { mode: \'html\', payload: data.formieHtmlForm });',
    ].join('\n');
  }

  if (demo.id === 'component-payload') {
    const query = [
      'query FrontendForm($handle: String!) {',
      '  formieClientForm(handle: $handle) {',
      '    schemaVersion',
      '    definition',
      '    session {',
      '      id',
      '      currentPageId',
      '      tokens',
      '      continuation',
      '    }',
      '  }',
      '}',
    ].join('\n');
    const variablesBlock = JSON.stringify({
      handle: example.handle,
    }, null, 2);
    return [
      '<script setup lang="ts">',
      "import { computed, defineComponent, h, onMounted, ref, type PropType } from 'vue';",
      "import {",
      '  FormieForm,',
      '  type FormieFieldComponentProps,',
      '  type FormieFieldProps,',
      '  type FrontendFormEnvelope,',
      "} from '@verbb/formie-vue';",
      '',
      `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
      `const query = ${JSON.stringify(query)};`,
      `const variables = ${variablesBlock};`,
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
      'const definition = ref<FrontendFormEnvelope | null>(null);',
      '',
      'onMounted(async () => {',
      '  const response = await fetch(graphqlEndpoint, {',
      "    method: 'POST',",
      "    credentials: 'same-origin',",
      '    headers: {',
      "      'Content-Type': 'application/json',",
      "      Accept: 'application/json',",
      '    },',
      '    body: JSON.stringify({ query, variables }),',
      '  });',
      '  const result = await response.json();',
      '  definition.value = result.data.formieClientForm;',
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
      "      type: 'graphql' as const,",
      '      endpoint: graphqlEndpoint,',
      `      formHandle: '${example.handle}',`,
      '    },',
      '  };',
      '});',
      '<' + '/script>',
      '',
      '<template>',
      '  <div v-if="!formSource">Loading...</div>',
      '  <FormieForm',
      '    v-else',
        '    :source="formSource"',
      '    :components="{ Field }"',
      "    :field-components=\"{ 'single-line-text': TextField }\"",
      '  />',
      '</template>',
    ].join('\n');
  }

  if (demo.id === 'submit-mutation') {
    const exampleRequest = buildFrontendContractSubmissionExample(example);
    return [
      `const endpoint = '${GRAPHQL_ENDPOINT}';`,
      `const mutation = ${JSON.stringify(exampleRequest.query)};`,
      `const variables = ${JSON.stringify(exampleRequest.variables, null, 2)};`,
      '',
      'const response = await fetch(endpoint, {',
      "  method: 'POST',",
      "  credentials: 'same-origin',",
      '  headers: {',
      "    'Content-Type': 'application/json',",
      "    Accept: 'application/json',",
      '  },',
      '  body: JSON.stringify({',
      '    query: mutation,',
      '    variables,',
      '  }),',
      '});',
      '',
      'const { data, errors } = await response.json();',
    ].join('\n');
  }

  return '';
}

function buildHtmlHookSnippet(example: DemoExample, scenario: RestScenario): string {
  const lines = [
    "import { useFormieHtml } from '@verbb/formie-vue';",
    '',
    'const { rootRef } = useFormieHtml({',
    "  transport: 'graphql',",
    `  endpoint: '${GRAPHQL_ENDPOINT}',`,
    `  formHandle: '${example.handle}',`,
    `  theme: '${scenario.theme}',`,
  ];
  if (scenario.themeConfig) {
    lines.push(`  themeConfig: ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, '\n  ')},`);
  }
  lines.push(
    '});',
    '',
    '/* <div ref="rootRef" class="demo-preview" :data-scenario="scenarioId" /> */',
  );
  return lines.join('\n');
}

const codeExample = computed(() => {
  if (selectedDemo.value.id === 'html-payload' && activeRequestMode.value === 'formie') {
    return {
      code: buildHtmlHookSnippet(selectedExample.value, selectedScenario.value),
      language: 'typescript' as const,
    };
  }
  return {
    code: buildUsageSnippet(selectedExample.value, selectedDemo.value, selectedScenario.value),
    language: 'typescript' as const,
  };
});

const availableRequestModes = computed(() => {
  return selectedDemo.value.id === 'html-payload'
    ? (['formie', 'app'] as const)
    : (['app'] as const);
});

watch(() => selectedDemo.value.id, (id) => {
  activeRequestMode.value = id === 'html-payload' ? 'formie' : 'app';
});

watch([selectedExample, selectedDemo, selectedScenario], () => {
  eventLog.value = [];
});

watch(
  [activePanel, selectedDemo, selectedExample, selectedScenario],
  async ([panel]) => {
    if (panel !== 'response') {
      serverResponse.value = 'Open the Response tab to load the live payload.';
      serverResponseError.value = null;
      return;
    }

    serverResponse.value = 'Loading response...';
    serverResponseError.value = null;

    try {
      if (selectedDemo.value.id === 'submit-mutation') {
        serverResponse.value = JSON.stringify(buildFrontendContractSubmissionExample(selectedExample.value), null, 2);
        return;
      }

      const payload = selectedDemo.value.id === 'html-payload'
        ? await requestGraphqlHtmlPayloadResponse(GRAPHQL_ENDPOINT, selectedExample.value.handle, {
          mode: 'server-rendered',
          endpoint: GRAPHQL_ENDPOINT,
          theme: selectedScenario.value.theme,
          ...(selectedScenario.value.themeConfig ? { themeConfig: selectedScenario.value.themeConfig } : {}),
        })
        : await requestGraphqlDefinitionEnvelopeResponse(GRAPHQL_ENDPOINT, selectedExample.value.handle);

      serverResponse.value = JSON.stringify(payload, null, 2);
    } catch (error: unknown) {
      serverResponseError.value = error instanceof Error ? error.message : 'Unable to load the server response.';
    }
  },
);

const htmlErrorMessage = ref<string | null>(null);

watchEffect(() => {
  if (previewMode.value !== 'server-rendered') {
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
  if (!(val instanceof Error)) {
    htmlErrorMessage.value = null;
    return;
  }
  htmlErrorMessage.value = `Unable to load the "${example.title}" GraphQL demo form (${example.handle}). ${val.message}`;
});

watch(
  () => {
    if (previewMode.value !== 'server-rendered') {
      return null;
    }
    const inst = htmlPreviewRef.value?.state?.instance;
    if (inst && typeof inst === 'object' && 'value' in inst) {
      return (inst as { value: unknown }).value;
    }
    return inst ?? null;
  },
  (instance) => {
    if (!instance || previewMode.value !== 'server-rendered') {
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

watch([previewSurfaceRef, selectedExample, selectedScenario, previewMode], () => {
  unbindPreviewEvents.forEach((u) => {
    u();
  });
  unbindPreviewEvents = [];

  const root = previewSurfaceRef.value;
  if (!root || previewMode.value !== 'server-rendered') {
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
    v-if="!isComponentRoute"
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
          :href="toAppHref(buildGraphqlUrl('server-rendered', item.id, selectedDemo.id, selectedScenario.id))"
          class="rounded border p-4 transition"
          :class="item.id === selectedExample.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
          @click.prevent="navigate(buildGraphqlUrl('server-rendered', item.id, selectedDemo.id, selectedScenario.id))"
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
            :href="toAppHref(buildGraphqlUrl('server-rendered', selectedExample.id, selectedDemo.id, item.id))"
            class="rounded border p-4 transition"
            :class="item.id === selectedScenario.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            @click.prevent="navigate(buildGraphqlUrl('server-rendered', selectedExample.id, selectedDemo.id, item.id))"
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
                transport="graphql"
                :endpoint="GRAPHQL_ENDPOINT"
                :form-handle="selectedExample.handle"
                :theme="selectedScenario.theme"
                :theme-config="selectedScenario.themeConfig"
              />
            </div>
          </div>
        </div>

        <div v-show="activePanel === 'response'" class="space-y-4">
          <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ serverResponseError }}
          </div>
          <CodePanel v-else :code="serverResponse" language="json" />
        </div>

        <div v-show="activePanel === 'code'" class="space-y-4">
          <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
            <div v-if="availableRequestModes.length > 1" class="flex flex-wrap items-center gap-2">
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
            <CodePanel :code="codeExample.code" :language="codeExample.language" />
          </div>
        </div>

        <div v-show="activePanel === 'events'" class="space-y-4">
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
            <p>Base URL: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code></p>
            <p>GraphQL endpoint: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeGraphqlEndpoint() }}</code></p>
            <p>Mode: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ previewMode }}</code></p>
            <p>Transport: <code class="rounded bg-white px-2 py-1 text-slate-700">graphql</code></p>
            <p>Demo id: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedDemo.id }}</code></p>
            <p>Example handle: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code></p>
          </div>
        </details>
      </div>
    </div>
  </section>

  <section
    v-else
    class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    :data-selected-url="buildGraphqlUrl('client-rendered', selectedExample.id, selectedDemo.id)"
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
            :key="`gql-comp:${selectedExample.id}`"
            :handle="selectedExample.handle"
            source="graphql"
            :base-url="FORMIE_BASE_URL"
            :graphql-endpoint="GRAPHQL_ENDPOINT"
            @form-event="onComponentFormEvent"
          />
        </div>
      </div>

      <div v-show="activePanel === 'response'" class="space-y-4">
        <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {{ serverResponseError }}
        </div>
        <CodePanel v-else :code="serverResponse" language="json" />
      </div>

      <div v-show="activePanel === 'code'" class="space-y-4">
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <CodePanel :code="codeExample.code" :language="codeExample.language" />
        </div>
      </div>

      <div v-show="activePanel === 'events'" class="space-y-4">
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-slate-900">
                Live event log ({{ eventLog.length }})
              </h3>
              <p class="text-sm text-slate-600">
                Component preview emits the package-owned form events (`formie:client:ready`, `formie:submit:result`, …).
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
          <p>Base URL: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code></p>
          <p>GraphQL endpoint: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeGraphqlEndpoint() }}</code></p>
          <p>Mode: <code class="rounded bg-white px-2 py-1 text-slate-700">component</code></p>
          <p>Transport: <code class="rounded bg-white px-2 py-1 text-slate-700">graphql</code></p>
          <p>Demo id: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedDemo.id }}</code></p>
          <p>Example handle: <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code></p>
        </div>
      </details>
    </div>
  </section>
</template>
