<script setup lang="ts">
import {
  buildRestByoComponentSnippetVue,
  buildRestByoHtmlSnippetVue,
  buildVueComponentStarterNote,
  buildVueUseFormieHtmlRest,
} from '../lib/code-snippets';
import {
  createDemoExamples,
  DEFAULT_EXAMPLE_ID,
  DEFAULT_SCENARIO_ID,
  resolveExample,
  resolveRestScenarioForMode,
  REST_SCENARIOS,
} from '../lib/demo-data';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from '../lib/event-log';
import { requestRestDefinitionEnvelope, requestRestHtmlPayload } from '../lib/server-payloads';
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

const demoExamples = computed(() => {
  return createDemoExamples({
    singlePage: (runtimeConfig.public.formieSinglePageHandle as string) || 'singlePage',
    multiPage: (runtimeConfig.public.formieMultiPageHandle as string) || 'multiPage',
    advanced: (runtimeConfig.public.formieAdvancedHandle as string) || 'advanced',
  });
});

const isComponentScenario = computed(() => props.mode === 'client-rendered');

const selectedExample = computed(() => {
  if (isComponentScenario.value) {
    return resolveExample(demoExamples.value, DEFAULT_EXAMPLE_ID);
  }
  return resolveExample(demoExamples.value, (route.query.example as string) || DEFAULT_EXAMPLE_ID);
});

const selectedScenario = computed(() => {
  if (isComponentScenario.value) {
    return resolveRestScenarioForMode('client-rendered', 'component-rest-form');
  }
  return resolveRestScenarioForMode('server-rendered', (route.query.scenario as string) || DEFAULT_SCENARIO_ID);
});

const activeHtmlScenario = computed(() => {
  if (!isComponentScenario.value) {
    return selectedScenario.value;
  }
  return REST_SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO_ID) || REST_SCENARIOS[0];
});

function buildRestUrl(mode: string, exampleId: string, scenarioId: string) {
  return { path: `/${mode}/rest`, query: { example: exampleId, scenario: scenarioId } };
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

const htmlSnippet = computed(() => {
  return isComponentScenario.value
    ? buildVueComponentStarterNote(selectedExample.value, baseUrl.value, 'rest')
    : buildVueUseFormieHtmlRest(selectedExample.value, activeHtmlScenario.value, baseUrl.value);
});

const appFetchSnippet = computed(() => {
  return isComponentScenario.value
    ? buildRestByoComponentSnippetVue(selectedExample.value, baseUrl.value)
    : buildRestByoHtmlSnippetVue(selectedExample.value, activeHtmlScenario.value, baseUrl.value);
});

const htmlError = computed(() => {
  if (isComponentScenario.value) {
    return null;
  }
  const errRef = htmlPreviewRef.value?.state?.error;
  const err = errRef && typeof errRef === 'object' && 'value' in errRef
    ? (errRef as { value: Error | null }).value
    : null;
  if (!err) {
    return null;
  }
  return `Unable to load the "${selectedExample.value.title}" demo form (${selectedExample.value.handle}). ${err.message}`;
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

watch([() => selectedExample.value.id, () => selectedScenario.value.id], () => {
  eventLog.value = [];
});

watch(() => props.mode, () => {
  activeRequestMode.value = 'formie';
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
    () => activeHtmlScenario.value.theme,
    () => activeHtmlScenario.value.themeConfig,
    isComponentScenario,
    () => selectedExample.value.handle,
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
        const payload = isComponentScenario.value
          ? await requestRestDefinitionEnvelope(baseUrl.value, selectedExample.value.handle)
          : await requestRestHtmlPayload(baseUrl.value, selectedExample.value.handle, {
            mode: 'server-rendered',
            endpoint: baseUrl.value,
            theme: activeHtmlScenario.value.theme,
            themeConfig: activeHtmlScenario.value.themeConfig,
          });

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
    if (!instance) {
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
  [previewSurfaceRef, () => selectedExample.value.id, () => selectedScenario.value.id, isComponentScenario],
  async() => {
    domUnbinds.forEach((u) => {
      u();
    });
    domUnbinds = [];
    await nextTick();
    const root = previewSurfaceRef.value;
    if (!root || isComponentScenario.value) {
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
  const q = buildRestUrl(props.mode, selectedExample.value.id, selectedScenario.value.id);
  const s = new URLSearchParams(q.query as Record<string, string>).toString();
  return `${q.path}?${s}`;
});

function describeRestBaseUrl(): string {
  return baseUrl.value;
}
</script>

<template>
  <div>
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
            v-for="item in demoExamples"
            :key="item.id"
            href="#"
            class="rounded border p-4 transition"
            :class="item.id === selectedExample.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
            @click.prevent="navigateToQuery(buildRestUrl(props.mode, item.id, selectedScenario.id))"
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
              @click.prevent="navigateToQuery(buildRestUrl(props.mode, selectedExample.id, item.id))"
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
                v-if="!isComponentScenario"
                :key="`${selectedExample.id}-${selectedScenario.id}`"
                ref="htmlPreviewRef"
                :scenario-id="selectedScenario.id"
                :rest-endpoint="baseUrl"
                graphql-endpoint=""
                transport="rest"
                :form-handle="selectedExample.handle"
                :theme="activeHtmlScenario.theme"
                :theme-config="activeHtmlScenario.themeConfig"
              />
            </div>
          </div>

          <div v-show="activePanel === 'response'">
            <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {{ serverResponseError }}
            </div>
            <CodePanel v-else :code="serverResponse" language="json" />
          </div>

          <div v-show="activePanel === 'code'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
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
            <CodePanel
              :code="activeRequestMode === 'formie' ? htmlSnippet : appFetchSnippet"
              language="tsx"
            />
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
                Example handle:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code>
              </p>
              <p>
                Base URL:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code>
              </p>
              <p>
                Mode:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ isComponentScenario ? 'client-rendered' : 'server-rendered' }}</code>
              </p>
              <p>
                Transport:
                <code class="rounded bg-white px-2 py-1 text-slate-700">rest</code>
              </p>
              <p>
                Theme:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ isComponentScenario ? 'host-owned' : selectedScenario.theme }}</code>
              </p>
              <p>
                Scenario id:
                <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedScenario.id }}</code>
              </p>
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
      :data-selected-url="selectedUrl"
    >
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
              :key="`${selectedExample.id}-${selectedScenario.id}`"
              :handle="selectedExample.handle"
              source="rest"
              :base-url="baseUrl"
              graphql-endpoint=""
              @event="onComponentFormEvent"
            />
          </div>
        </div>

        <div v-show="activePanel === 'response'">
          <div v-if="serverResponseError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {{ serverResponseError }}
          </div>
          <CodePanel v-else :code="serverResponse" language="json" />
        </div>

        <div v-show="activePanel === 'code'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
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
          <CodePanel
            :code="activeRequestMode === 'formie' ? htmlSnippet : appFetchSnippet"
            language="tsx"
          />
        </div>

        <div v-show="activePanel === 'events'" class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-slate-900">
                Live event log ({{ eventLog.length }})
              </h3>
              <p class="text-sm text-slate-600">
                Component preview emits core form events (`formie:client:ready`, `formie:submit:result`, …) alongside DOM `formie:*` events in server-rendered mode.
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
            No form events yet. Change values or submit from the preview tab.
          </div>
        </div>

        <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">
            Technical details
          </summary>
          <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p>
              Example handle:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedExample.handle }}</code>
            </p>
            <p>
              Base URL:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ describeRestBaseUrl() }}</code>
            </p>
            <p>
              Mode:
              <code class="rounded bg-white px-2 py-1 text-slate-700">component</code>
            </p>
            <p>
              Transport:
              <code class="rounded bg-white px-2 py-1 text-slate-700">rest</code>
            </p>
            <p>
              Theme:
              <code class="rounded bg-white px-2 py-1 text-slate-700">host-owned</code>
            </p>
            <p>
              Scenario id:
              <code class="rounded bg-white px-2 py-1 text-slate-700">{{ selectedScenario.id }}</code>
            </p>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
