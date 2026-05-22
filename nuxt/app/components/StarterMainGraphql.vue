<script setup lang="ts">
import {
  buildFrontendContractSubmissionExample,
  buildGraphqlUsageSnippetVue,
  graphqlCodeLanguage,
  buildVueUseFormieHtmlGraphql,
} from '../lib/code-snippets';
import {
  createDemoExamples,
  DEFAULT_EXAMPLE_ID,
  DEFAULT_SCENARIO_ID,
  GRAPHQL_DEMOS,
  resolveExample,
  resolveGraphqlDemoForMode,
  resolveRestScenarioForMode,
  REST_SCENARIOS,
} from '../lib/demo-data';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from '../lib/event-log';
import {
  requestGraphqlDefinitionEnvelopeResponse,
  requestGraphqlHtmlPayloadResponse,
} from '../lib/server-payloads';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CodePanel from './CodePanel.vue';
import ComponentFormPreview from './ComponentFormPreview.vue';
import HtmlFormPreview from './HtmlFormPreview.vue';

const props = defineProps<{
  mode: 'server-rendered' | 'client-rendered';
}>();

const route = useRoute();
const router = useRouter();
const runtimeConfig = useRuntimeConfig();

const baseUrl = computed(() => (runtimeConfig.public.formieBaseUrl as string) || '');

const graphqlEndpoint = computed(() => {
  const explicit = (runtimeConfig.public.formieGraphqlEndpoint as string) || '';
  if (explicit) {
    return explicit;
  }
  const b = baseUrl.value;
  if (!b) {
    return '/api';
  }
  try {
    return new URL('/api', b).toString();
  } catch {
    return `${b.replace(/\/$/, '')}/api`;
  }
});

const demoExamples = computed(() => {
  return createDemoExamples({
    singlePage: (runtimeConfig.public.formieSinglePageHandle as string) || 'singlePage',
    multiPage: (runtimeConfig.public.formieMultiPageHandle as string) || 'multiPage',
    advanced: (runtimeConfig.public.formieAdvancedHandle as string) || 'advanced',
  });
});

const isComponentRoute = computed(() => props.mode === 'client-rendered');

const selectedExample = computed(() => {
  if (isComponentRoute.value) {
    return resolveExample(demoExamples.value, DEFAULT_EXAMPLE_ID);
  }
  return resolveExample(demoExamples.value, (route.query.example as string) || DEFAULT_EXAMPLE_ID);
});

const demoQuery = computed(() => {
  const raw = route.query.demo;
  if (raw == null || raw === '') {
    return null;
  }
  return String(raw);
});

const selectedDemo = computed(() => {
  if (isComponentRoute.value) {
    return resolveGraphqlDemoForMode('client-rendered', demoQuery.value);
  }
  return resolveGraphqlDemoForMode('server-rendered', demoQuery.value);
});

const selectedScenario = computed(() => {
  return resolveRestScenarioForMode('server-rendered', (route.query.scenario as string) || DEFAULT_SCENARIO_ID);
});

const previewMode = computed(() => selectedDemo.value.mode);

function buildGraphqlUrl(mode: string, exampleId: string, demoId: string, scenarioId?: string) {
  const query: Record<string, string> = {
    example: exampleId,
    demo: demoId,
  };
  if (scenarioId) {
    query.scenario = scenarioId;
  }
  return { path: `/${mode}/graphql`, query };
}

function navigateToQuery(loc: { path: string; query: Record<string, string> }) {
  void router.push(loc);
}

const activePanel = ref<'preview' | 'response' | 'code' | 'events'>('preview');
const activeRequestMode = ref<'formie' | 'app'>('formie');
const eventLog = ref<EventLogEntry[]>([]);
const serverResponse = ref('Loading response...');
const serverResponseError = ref<string | null>(null);
const previewSurfaceRef = ref<HTMLElement | null>(null);
const htmlPreviewRef = ref<{ state?: { error?: { value: Error | null }; instance?: { value: unknown } } } | null>(null);

const availableRequestModes = computed(() => {
  return selectedDemo.value.id === 'html-payload'
    ? (['formie', 'app'] as const)
    : (['app'] as const);
});

const codeExample = computed(() => {
  if (selectedDemo.value.id === 'html-payload' && activeRequestMode.value === 'formie') {
    return {
      code: buildVueUseFormieHtmlGraphql(selectedExample.value, selectedScenario.value, graphqlEndpoint.value),
      language: graphqlCodeLanguage(selectedDemo.value, 'formie'),
    };
  }
  return {
    code: buildGraphqlUsageSnippetVue(
      selectedExample.value,
      selectedDemo.value,
      selectedScenario.value,
      graphqlEndpoint.value,
    ),
    language: graphqlCodeLanguage(selectedDemo.value, 'app'),
  };
});

const htmlError = computed(() => {
  if (previewMode.value !== 'server-rendered') {
    return null;
  }
  const errRef = htmlPreviewRef.value?.state?.error;
  const err = errRef && typeof errRef === 'object' && 'value' in errRef
    ? (errRef as { value: Error | null }).value
    : null;
  if (!err) {
    return null;
  }
  return `Unable to load the "${selectedExample.title}" GraphQL demo form (${selectedExample.handle}). ${err.message}`;
});

function getPanelLabel(panel: typeof activePanel.value): string {
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

function onComponentFormEvent(evt: { name: string; payload: unknown }) {
  eventLog.value = [createEventEntry(evt.name, evt.payload), ...eventLog.value].slice(0, 50);
}

watch(() => selectedDemo.value.id, (id) => {
  activeRequestMode.value = id === 'html-payload' ? 'formie' : 'app';
});

watch([() => selectedExample.value.id, () => selectedDemo.value.id, () => selectedScenario.value.id], () => {
  eventLog.value = [];
});

watch(activePanel, (panel) => {
  if (panel !== 'response') {
    serverResponse.value = 'Open the Response tab to load the live payload.';
    serverResponseError.value = null;
  }
});

watch(
  [
    activePanel,
    () => selectedDemo.value.id,
    () => selectedExample.value.handle,
    () => selectedScenario.value.theme,
    () => selectedScenario.value.themeConfig,
  ],
  (_n, _o, onCleanup) => {
    if (activePanel.value !== 'response') {
      return;
    }

    let disposed = false;
    onCleanup(() => {
      disposed = true;
    });

    serverResponse.value = 'Loading response...';
    serverResponseError.value = null;

    void (async() => {
      try {
        if (selectedDemo.value.id === 'submit-mutation') {
          if (!disposed) {
            serverResponse.value = JSON.stringify(buildFrontendContractSubmissionExample(selectedExample.value), null, 2);
          }
          return;
        }

        const payload = selectedDemo.value.id === 'html-payload'
          ? await requestGraphqlHtmlPayloadResponse(graphqlEndpoint.value, selectedExample.value.handle, {
            mode: 'server-rendered',
            endpoint: graphqlEndpoint.value,
            theme: selectedScenario.value.theme,
            ...(selectedScenario.value.themeConfig ? { themeConfig: selectedScenario.value.themeConfig } : {}),
          })
          : await requestGraphqlDefinitionEnvelopeResponse(graphqlEndpoint.value, selectedExample.value.handle);

        if (!disposed) {
          serverResponse.value = JSON.stringify(payload, null, 2);
        }
      } catch (error: unknown) {
        if (!disposed) {
          serverResponseError.value = error instanceof Error ? error.message : 'Unable to load the server response.';
        }
      }
    })();
  },
  { flush: 'post' },
);

watch(
  () => htmlPreviewRef.value?.state?.instance,
  (inst) => {
    const instance = inst && typeof inst === 'object' && 'value' in inst
      ? (inst as { value: unknown }).value
      : inst;
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
  { deep: true },
);

let domUnbinds: Array<() => void> = [];

watch(
  [previewSurfaceRef, () => selectedExample.value.id, () => selectedScenario.value.id, previewMode],
  async() => {
    domUnbinds.forEach((u) => {
      u();
    });
    domUnbinds = [];
    await nextTick();
    const root = previewSurfaceRef.value;
    if (!root || previewMode.value !== 'server-rendered') {
      return;
    }

    const appendEvent = (eventName: string, detail: unknown) => {
      eventLog.value = [createEventEntry(eventName, detail), ...eventLog.value].slice(0, 40);
    };

    domUnbinds = OBSERVED_FORMIE_EVENTS.map((eventName) => {
      const handler = (event: Event) => {
        appendEvent(eventName, (event as CustomEvent<unknown>).detail);
      };
      root.addEventListener(eventName, handler as EventListener);
      return () => {
        root.removeEventListener(eventName, handler as EventListener);
      };
    });
  },
  { flush: 'post' },
);

onBeforeUnmount(() => {
  domUnbinds.forEach((u) => {
    u();
  });
});

const selectedUrl = computed(() => {
  const q = buildGraphqlUrl(
    props.mode,
    selectedExample.value.id,
    selectedDemo.value.id,
    selectedDemo.value.mode === 'server-rendered' ? selectedScenario.value.id : undefined,
  );
  const s = new URLSearchParams(q.query).toString();
  return `${q.path}?${s}`;
});

function describeRestBaseUrl(): string {
  return baseUrl.value;
}

function describeGraphqlEndpoint(): string {
  return graphqlEndpoint.value;
}
</script>

<template>
  <div>
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
            v-for="item in demoExamples"
            :key="item.id"
            href="#"
            class="rounded border p-4 transition"
            :class="item.id === selectedExample.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            @click.prevent="navigateToQuery(buildGraphqlUrl(props.mode, item.id, selectedDemo.id, selectedScenario.id))"
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
              href="#"
              class="rounded border p-4 transition"
              :class="item.id === selectedScenario.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
              @click.prevent="navigateToQuery(buildGraphqlUrl(props.mode, selectedExample.id, selectedDemo.id, item.id))"
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
        <div class="relative space-y-4 mt-4">
          <div class="absolute right-4 top-0 -mt-4 z-10 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
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

          <div v-show="activePanel === 'preview'" class="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
            <div v-if="htmlError" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {{ htmlError }}
            </div>
            <div ref="previewSurfaceRef">
              <HtmlFormPreview
                v-if="previewMode === 'server-rendered'"
                :key="`graphql:${selectedExample.id}:${selectedScenario.id}`"
                ref="htmlPreviewRef"
                :scenario-id="selectedScenario.id"
                :rest-endpoint="baseUrl"
                :graphql-endpoint="graphqlEndpoint"
                transport="graphql"
                :form-handle="selectedExample.handle"
                :theme="selectedScenario.theme"
                :theme-config="selectedScenario.themeConfig"
              />
              <ComponentFormPreview
                v-else
                :key="`graphql-component:${selectedExample.id}`"
                :handle="selectedExample.handle"
                source="graphql"
                :base-url="baseUrl"
                :graphql-endpoint="graphqlEndpoint"
                @event="onComponentFormEvent"
              />
            </div>
          </div>

          <div v-show="activePanel === 'response'" class="space-y-4">
            <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {{ serverResponseError }}
            </div>
            <CodePanel v-else :code="serverResponse" language="json" />
          </div>

          <div v-show="activePanel === 'code'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
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

          <div v-show="activePanel === 'events'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
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
              <details
                v-for="entry in eventLog"
                :key="entry.id"
                class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
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
            <div
              v-else
              class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600"
            >
              No events logged yet. Open the preview, validate fields, move between pages, upload files, or submit the form to populate this pane.
            </div>
          </div>

          <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">
              Technical details
            </summary>
            <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p>
                Base URL:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code>
              </p>
              <p>
                GraphQL endpoint:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeGraphqlEndpoint() }}</code>
              </p>
              <p>
                Mode:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ previewMode }}</code>
              </p>
              <p>
                Transport:
                <code class="rounded bg-white px-2 py-1 text-slate-700">graphql</code>
              </p>
              <p>
                Demo id:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedDemo.id }}</code>
              </p>
              <p>
                Example handle:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code>
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>

    <section
      v-else
      class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      :data-selected-url="selectedUrl"
    >
      <div class="space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          GraphQL demos (component)
        </h3>
        <div class="grid gap-3 md:grid-cols-3">
          <a
            v-for="item in GRAPHQL_DEMOS.filter((d) => d.mode === 'client-rendered')"
            :key="item.id"
            href="#"
            class="rounded border p-4 transition"
            :class="item.id === selectedDemo.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            @click.prevent="navigateToQuery({ path: `/${props.mode}/graphql`, query: { example: selectedExample.id, demo: item.id } })"
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

      <div class="relative space-y-4 mt-4">
        <div class="absolute right-4 top-0 -mt-4 z-10 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
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

        <div v-show="activePanel === 'preview'" class="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
          <div ref="previewSurfaceRef">
            <ComponentFormPreview
              :key="`gqc:${selectedExample.id}:${selectedDemo.id}`"
              :handle="selectedExample.handle"
              source="graphql"
              :base-url="baseUrl"
              :graphql-endpoint="graphqlEndpoint"
              @event="onComponentFormEvent"
            />
          </div>
        </div>

        <div v-show="activePanel === 'response'" class="space-y-4">
          <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ serverResponseError }}
          </div>
          <CodePanel v-else :code="serverResponse" language="json" />
        </div>

        <div v-show="activePanel === 'code'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <CodePanel :code="codeExample.code" :language="codeExample.language" />
        </div>

        <div v-show="activePanel === 'events'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-slate-900">
                Live event log ({{ eventLog.length }})
              </h3>
              <p class="text-sm text-slate-600">
                Core form events from the component preview (`@verbb/formie-core`).
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
            <details
              v-for="entry in eventLog"
              :key="entry.id"
              class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
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
          <div
            v-else
            class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600"
          >
            No form events yet. Use Component payload preview and interact with the form.
          </div>
        </div>

        <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">
            Technical details
          </summary>
          <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p>
              Base URL:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code>
            </p>
            <p>
              GraphQL endpoint:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeGraphqlEndpoint() }}</code>
            </p>
            <p>
              Mode:
              <code class="rounded bg-white px-2 py-1 text-slate-700">component</code>
            </p>
            <p>
              Transport:
              <code class="rounded bg-white px-2 py-1 text-slate-700">graphql</code>
            </p>
            <p>
              Demo id:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedDemo.id }}</code>
            </p>
            <p>
              Example handle:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code>
            </p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
