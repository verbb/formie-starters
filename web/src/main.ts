import './style.css';
import '@verbb/formie-browser/css/formie-base.css';
import '@verbb/formie-browser/css/formie-theme.css';
import { registerFormieWebComponents, type FormieCoreForm, type FormieFormElement } from '@verbb/formie-web-components';
import {
  DEFAULT_EXAMPLE_ID,
  DEFAULT_GRAPHQL_DEMO_ID,
  DEFAULT_SCENARIO_ID,
  DEMO_EXAMPLES,
  describeGraphqlEndpoint,
  describeRestBaseUrl,
  FORMIE_BASE_URL,
  GRAPHQL_ENDPOINT,
  GRAPHQL_DEMOS,
  REST_SCENARIOS,
  resolveExample,
  resolveGraphqlDemoForMode,
  resolveRestScenarioForMode,
  type DemoExample,
  type GraphqlDemo,
  type RestScenario,
} from './demo-data';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from './event-log';
import { highlightCode, type HighlightLanguage } from './highlight';
import {
  requestGraphqlDefinitionEnvelopeResponse,
  requestGraphqlHtmlPayloadResponse,
  requestRestDefinitionEnvelope,
  requestRestHtmlPayload,
} from './server-payloads';
import {
  buildComponentCoreGraphqlSnippet,
  buildComponentCoreRestSnippet,
  buildFrontendContractSubmissionExample,
  buildGraphqlComponentUsageSnippet,
  buildGraphqlHtmlAppFetchSnippet,
  buildGraphqlHtmlHookSnippet,
  buildRestComponentAppFetchSnippet,
  buildWebAppFetchHtmlSnippet,
  buildWebMountSnippet,
} from './snippets';

type ModeId = 'server-rendered' | 'client-rendered';
type TransportId = 'rest' | 'graphql';
type PanelId = 'preview' | 'response' | 'code' | 'events';

type RouteContext = {
  route: { mode: ModeId; transport: TransportId };
  params: URLSearchParams;
  selectedExample: DemoExample;
  selectedScenario: RestScenario;
  activeHtmlScenario: RestScenario;
  selectedDemo: GraphqlDemo;
  isComponentScenario: boolean;
  previewIsHtml: boolean;
};

let lastCtx: RouteContext | null = null;

const FORMIE_LOGO = `<svg viewBox="0 0 544.2 544.2" aria-hidden="true" class="size-full"><path d="M272.1 0C2.1 0 0 121.8 0 272.1s2.1 272.1 272.1 272.1 272.1-121.8 272.1-272.1S542.1 0 272.1 0z" fill="#ea3b3b"/><path d="M382.2 122.6H162.1c-13.8 0-25 11.2-25 25v249c0 13.8 11.2 25 25 25h220.1c13.8 0 25-11.2 25-25v-249c0-13.7-11.3-25-25-25zM272.1 363.3h-73.4c-10.1 0-18.3-8.2-18.3-18.3 0-10.1 8.2-18.3 18.3-18.3h73.4c10.1 0 18.3 8.2 18.3 18.3.1 10.1-8.2 18.3-18.3 18.3zm73.4-73.4H198.7c-10.1 0-18.3-8.2-18.3-18.3 0-10.1 8.2-18.3 18.3-18.3h146.8c10.1 0 18.3 8.2 18.3 18.3 0 10.1-8.2 18.3-18.3 18.3zm0-73.4H198.7c-10.1 0-18.3-8.2-18.3-18.3 0-10.1 8.2-18.3 18.3-18.3h146.8c10.1 0 18.3 8.2 18.3 18.3 0 10.1-8.2 18.3-18.3 18.3z" fill="#fff"/></svg>`;

const VERBB_LOGO = `<svg width="148" height="33" viewBox="0 0 148 33" role="img" aria-label="Verbb" class="mx-auto h-5 w-auto"><title>Verbb</title><path d="M49.508.392c-8.65 0-15.328 6.724-17.34 12.974C28.904 23.498 35.4 32.32 45.194 32.32c6.057 0 11.377-2.498 14.52-5.642 1.332-1.33.486-2.157-.53-2.685-.558-.29-2.22-1.125-2.22-1.125-.9-.46-2.062-.523-3.046.045-1.405.807-2.765 2.148-7.704 2.148-3.972 0-6.907-2.673-7.443-6.308 0 0 16.407-.055 22.168-.055 1.93 0 2.62-1.572 2.62-4.48 0-8.3-6.138-13.825-14.052-13.825zM39.73 13.326c1.7-3.31 5.194-5.676 8.933-5.676 3.737 0 6.564 2.367 7.333 5.676H39.73zM32.706.953c1.236 0 1.86 1.055 1.295 2.265L20.623 29.532c-.68 1.34-2.08 2.228-3.506 2.228h-5.835c-1.236 0-2.23-.777-2.48-1.942L3.558 5.584H1.707c-.594 0-1.08-.358-1.233-.908L.01 2.994c-.27-.97.594-2.04 1.647-2.04h7.98c1.12 0 2.01.726 2.194 1.796l3.596 20.798L25.604 2.574c.472-.97 1.476-1.62 2.502-1.62h4.6zm107.615.03c4.638.333 7.803 4.197 7.133 8.968-.324 2.31-1.51 4.395-3.16 5.99 1.64 1.678 2.505 4.09 2.124 6.805-.71 5.056-5.387 9.09-10.44 9.09l-14.02-.04c-1.012-.003-1.716-.825-1.574-1.838l.026-.19c1.723-2.055 2.922-4.48 3.298-7.17.357-2.523-.07-4.977-1.183-7.053 1.172-1.77 1.94-3.735 2.22-5.74.3-2.137.03-4.156-.686-5.93l.14-1.01c.15-1.072 1.145-1.94 2.217-1.938l13.903.057zm-1.477 21.303c.256-1.82-.735-3.29-2.212-3.307l.003-.006h-7.025l-.932 6.627 7.025-.005c1.484-.015 2.887-1.487 3.143-3.31zm1.746-12.11c.262-1.884-.74-3.414-2.24-3.414h-7.026l-.96 6.827h7.024c1.502 0 2.936-1.53 3.2-3.414zM113.194.956c4.638.334 7.803 4.198 7.133 8.967-.324 2.31-1.51 4.395-3.16 5.992 1.64 1.676 2.504 4.09 2.124 6.803-.71 5.057-5.387 9.09-10.44 9.09l-14.02-.04c-1.012-.003-1.716-.825-1.574-1.838l3.818-27.093C97.226 1.767 98.214.9 99.284.9h.008l13.903.057zm-1.477 21.304c.256-1.82-.735-3.292-2.212-3.307l.002-.006h-7.025l-.932 6.627 7.026-.006c1.483-.015 2.886-1.486 3.142-3.308zm1.746-12.11c.263-1.885-.738-3.415-2.24-3.415H104.2l-.96 6.828h7.023c1.502 0 2.936-1.53 3.2-3.413zm-21.2-1.44c0 4.94-4.24 9.76-9.49 9.76l7 10.615c1.154 1.872.094 2.66-1.446 2.66l-4.3.01c-1.303 0-2.643-1.024-3.388-2.357l-5.424-10.504h-1.15L72.59 29.398c-.183 1.3-1.385 2.358-2.688 2.358h-3.266c-1.3 0-2.208-1.057-2.024-2.358L68.28 3.305c.18-1.3 1.385-2.358 2.686-2.358h13.66l-.005.017c4.87.087 7.645 3.852 7.645 7.745zm-8.226 1.368c.265-1.887-.737-3.415-2.24-3.415h-6.012l-.96 6.828h6.013c1.5 0 2.933-1.528 3.198-3.412z" fill="#e0e4ea" fill-rule="nonzero"/></svg>`;

const NAV_ITEMS: Array<{ mode: ModeId; transport: TransportId; title: string; href: string }> = [
  { mode: 'server-rendered', transport: 'rest', title: 'REST', href: '/server-rendered/rest?example=single-page&scenario=html-default-theme' },
  { mode: 'server-rendered', transport: 'graphql', title: 'GraphQL', href: '/server-rendered/graphql?example=single-page&demo=html-payload&scenario=html-default-theme' },
  { mode: 'client-rendered', transport: 'rest', title: 'REST', href: '/client-rendered/rest?example=single-page&scenario=component-rest-form' },
  { mode: 'client-rendered', transport: 'graphql', title: 'GraphQL', href: '/client-rendered/graphql?example=single-page&demo=component-payload' },
];

registerFormieWebComponents();

let disposePreview: (() => Promise<void>) | null = null;
let previewDomUnbinds: Array<() => void> = [];
let activePanel: PanelId = 'preview';
let activeRequestMode: 'formie' | 'app' = 'formie';
let eventLog: EventLogEntry[] = [];
let serverResponse = 'Open the Response tab to load the live payload.';
let serverResponseError: string | null = null;
let responseRequestId = 0;
let lastPreviewShellKey = '';

function readBrowserLocation(): { pathname: string; search: string } {
  return {
    pathname: window.location.pathname || '/server-rendered/rest',
    search: window.location.search,
  };
}

function normalizeLocation(pathname: string): { mode: ModeId; transport: TransportId } | null {
  const normalizedPathname = pathname === '/' ? '/server-rendered/rest' : pathname;
  const segments = normalizedPathname.split('/').filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const [mode, transport] = segments;

  if ((mode === 'server-rendered' || mode === 'client-rendered') && (transport === 'rest' || transport === 'graphql')) {
    return { mode, transport };
  }

  return null;
}

function buildRestUrl(mode: ModeId, exampleId: string, scenarioId: string): string {
  return `/${mode}/rest?example=${encodeURIComponent(exampleId)}&scenario=${encodeURIComponent(scenarioId)}`;
}

function buildGraphqlUrl(mode: ModeId, exampleId: string, demoId: string, scenarioId?: string): string {
  const params = new URLSearchParams({
    example: exampleId,
    demo: demoId,
  });

  if (scenarioId) {
    params.set('scenario', scenarioId);
  }

  return `/${mode}/graphql?${params.toString()}`;
}

function appendEvent(name: string, detail: unknown): void {
  eventLog = [createEventEntry(name, detail), ...eventLog].slice(0, 50);
  syncEventsPanelDom();
}

function previewShellKey(ctx: RouteContext): string {
  return [
    ctx.route.mode,
    ctx.route.transport,
    ctx.selectedExample.id,
    ctx.selectedScenario.id,
    ctx.selectedDemo.id,
    String(ctx.previewIsHtml),
  ].join('|');
}

function syncEventsPanelDom(): void {
  const root = document.querySelector('#event-log-root');
  const title = document.querySelector('#event-log-title');
  if (title) {
    title.textContent = `Live event log (${eventLog.length})`;
  }

  if (root) {
    root.innerHTML = renderEventLogHtml();
  }
}

function syncResponsePanelDom(): void {
  const mount = document.querySelector('#response-panel-mount');
  if (!mount) {
    return;
  }

  const block = serverResponseError
    ? `<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">${escapeHtml(serverResponseError)}</div>`
    : codePanelHtml(serverResponse, 'json', 'response-copy-area');

  mount.innerHTML = block;
}

function syncCodePanelDom(ctx: RouteContext): void {
  const mount = document.querySelector('#code-panel-mount');
  if (!mount) {
    return;
  }

  mount.innerHTML = buildCodePanelInnerHtml(ctx);
}

function updateTabStripDom(): void {
  (['preview', 'response', 'code', 'events'] as const).forEach((p) => {
    const wrap = document.querySelector(`[data-route-panel="${p}"]`);
    if (wrap) {
      wrap.classList.toggle('hidden', activePanel !== p);
      wrap.classList.toggle('block', activePanel === p);
    }

    const btn = document.querySelector(`[data-route-tab="${p}"]`);
    if (btn) {
      btn.className = tabClass(p);
    }
  });
}

function buildCodePanelInnerHtml(ctx: RouteContext): string {
  const formieSnippet = ctx.route.transport === 'rest'
    ? (ctx.isComponentScenario
      ? buildComponentCoreRestSnippet(ctx.selectedExample)
      : buildWebMountSnippet(ctx.selectedExample, ctx.activeHtmlScenario, 'rest'))
    : (ctx.previewIsHtml
      ? buildGraphqlHtmlHookSnippet(ctx.selectedExample, ctx.activeHtmlScenario)
      : buildGraphqlComponentUsageSnippet(ctx.selectedExample));

  const appSnippet = ctx.route.transport === 'rest'
    ? (ctx.isComponentScenario
      ? buildRestComponentAppFetchSnippet(ctx.selectedExample)
      : buildWebAppFetchHtmlSnippet(ctx.selectedExample, ctx.activeHtmlScenario))
    : (ctx.previewIsHtml ? buildGraphqlHtmlAppFetchSnippet(ctx.selectedExample, ctx.activeHtmlScenario) : buildComponentCoreGraphqlSnippet(ctx.selectedExample));

  const showFormieAppTabs = ctx.route.transport === 'rest' || ctx.previewIsHtml;

  if (!showFormieAppTabs) {
    return codePanelHtml(buildComponentCoreGraphqlSnippet(ctx.selectedExample), 'tsx', 'code-copy-area');
  }

  return `
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" data-request-mode="formie" class="rounded-lg border px-3 py-1.5 text-sm font-medium transition ${activeRequestMode === 'formie' ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}">Formie fetch</button>
      <button type="button" data-request-mode="app" class="rounded-lg border px-3 py-1.5 text-sm font-medium transition ${activeRequestMode === 'app' ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}">App fetch</button>
    </div>
    ${codePanelHtml(activeRequestMode === 'formie' ? formieSnippet : appSnippet, 'tsx', 'code-copy-area')}
  `;
}

function bindPreviewDomEvents(root: HTMLElement): void {
  previewDomUnbinds.forEach((u) => {
    u();
  });
  previewDomUnbinds = [];

  const handler = (eventName: string) => {
    return (event: Event) => {
      appendEvent(eventName, (event as CustomEvent<unknown>).detail);
    };
  };

  OBSERVED_FORMIE_EVENTS.forEach((eventName) => {
    const fn = handler(eventName) as EventListener;
    root.addEventListener(eventName, fn);
    previewDomUnbinds.push(() => {
      root.removeEventListener(eventName, fn);
    });
  });
}

async function teardownPreview(): Promise<void> {
  previewDomUnbinds.forEach((u) => {
    u();
  });
  previewDomUnbinds = [];

  if (disposePreview) {
    await disposePreview();
    disposePreview = null;
  }
}

function escapeAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function codePanelHtml(code: string, language: HighlightLanguage, copyId: string): string {
  const highlighted = highlightCode(code, language);
  return `
    <div class="relative rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <button type="button" data-copy-target="${escapeAttr(copyId)}" class="copy-code-btn absolute right-6 top-8 z-30 inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" title="Copy to clipboard" aria-label="Copy to clipboard">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="size-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        </svg>
      </button>
      <textarea id="${escapeAttr(copyId)}" class="sr-only" readonly>${escapeHtml(code)}</textarea>
      <pre class="demo-code max-h-[32rem] overflow-auto p-6 text-xs text-slate-700"><code class="language-${language}">${highlighted}</code></pre>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function getPanelClass(panel: PanelId): string {
  return activePanel === panel ? 'block' : 'hidden';
}

function tabClass(panel: PanelId): string {
  const base = 'border-l border-slate-200 px-5 py-2 text-sm font-medium transition first:border-l-0';
  return activePanel === panel ? `${base} bg-white text-slate-900` : `${base} bg-slate-100 text-slate-500 hover:bg-slate-50`;
}

function renderEventLogHtml(): string {
  if (!eventLog.length) {
    return `<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">No events logged yet. Open the preview, validate fields, move between pages, upload files, or submit the form to populate this pane.</div>`;
  }

  return `<div class="space-y-2">${eventLog.map((entry) => {
    return `
      <details class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <summary class="cursor-pointer list-none">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-xs font-semibold text-slate-900">${escapeHtml(entry.name)}</p>
              <p class="truncate text-[11px] text-slate-500">${escapeHtml(entry.summary)}</p>
            </div>
            <span class="shrink-0 text-[11px] text-slate-500">${escapeHtml(entry.time)}</span>
          </div>
        </summary>
        <pre class="mt-2 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] text-slate-100">${escapeHtml(entry.detail)}</pre>
      </details>
    `;
  }).join('')}</div>`;
}

async function loadServerResponse(ctx: {
  route: { mode: ModeId; transport: TransportId };
  isComponentScenario: boolean;
  activeHtmlScenario: RestScenario;
  selectedExample: DemoExample;
  selectedDemo: GraphqlDemo;
}): Promise<void> {
  const myId = ++responseRequestId;
  serverResponse = 'Loading response...';
  serverResponseError = null;

  try {
    let payload: unknown;

    if (ctx.route.transport === 'rest') {
      payload = ctx.isComponentScenario
        ? await requestRestDefinitionEnvelope(FORMIE_BASE_URL, ctx.selectedExample.handle)
        : await requestRestHtmlPayload(FORMIE_BASE_URL, ctx.selectedExample.handle, {
          mode: 'server-rendered',
          endpoint: FORMIE_BASE_URL,
          theme: ctx.activeHtmlScenario.theme,
          themeConfig: ctx.activeHtmlScenario.themeConfig,
        });
    } else if (ctx.selectedDemo.id === 'submit-mutation') {
      payload = buildFrontendContractSubmissionExample(ctx.selectedExample);
    } else if (ctx.selectedDemo.id === 'html-payload') {
      payload = await requestGraphqlHtmlPayloadResponse(GRAPHQL_ENDPOINT, ctx.selectedExample.handle, {
        mode: 'server-rendered',
        endpoint: GRAPHQL_ENDPOINT,
        theme: ctx.activeHtmlScenario.theme,
        ...(ctx.activeHtmlScenario.themeConfig ? { themeConfig: ctx.activeHtmlScenario.themeConfig } : {}),
      });
    } else {
      payload = await requestGraphqlDefinitionEnvelopeResponse(GRAPHQL_ENDPOINT, ctx.selectedExample.handle);
    }

    if (myId === responseRequestId) {
      serverResponse = JSON.stringify(payload, null, 2);
    }
  } catch (error: unknown) {
    if (myId === responseRequestId) {
      serverResponseError = error instanceof Error ? error.message : 'Unable to load the server response.';
    }
  }
}

function buildRouteContext(): RouteContext {
  const loc = readBrowserLocation();
  const route = normalizeLocation(loc.pathname) || { mode: 'server-rendered' as const, transport: 'rest' as const };
  const params = new URLSearchParams(loc.search);
  const isComponentScenario = route.mode === 'client-rendered';

  const selectedExample = isComponentScenario
    ? resolveExample(DEFAULT_EXAMPLE_ID)
    : resolveExample(params.get('example') || DEFAULT_EXAMPLE_ID);

  const selectedScenario = isComponentScenario
    ? resolveRestScenarioForMode('client-rendered', 'component-rest-form')
    : resolveRestScenarioForMode('server-rendered', params.get('scenario') || DEFAULT_SCENARIO_ID);

  const activeHtmlScenario = !isComponentScenario
    ? selectedScenario
    : REST_SCENARIOS.find((s) => {
      return s.id === DEFAULT_SCENARIO_ID;
    }) || REST_SCENARIOS[0];

  const selectedDemo = route.transport === 'graphql'
    ? (isComponentScenario
      ? resolveGraphqlDemoForMode('client-rendered', params.get('demo') || 'component-payload')
      : resolveGraphqlDemoForMode('server-rendered', params.get('demo') || DEFAULT_GRAPHQL_DEMO_ID))
    : GRAPHQL_DEMOS[0];

  const previewIsHtml = route.transport === 'graphql'
    ? selectedDemo.id === 'html-payload'
    : !isComponentScenario;

  return {
    route,
    params,
    selectedExample,
    selectedScenario,
    activeHtmlScenario,
    selectedDemo,
    isComponentScenario,
    previewIsHtml,
  };
}

function renderMainPanels(ctx: RouteContext): string {
  const responseInner = serverResponseError
    ? `<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">${escapeHtml(serverResponseError)}</div>`
    : codePanelHtml(serverResponse, 'json', 'response-copy-area');

  return `
    <div class="relative mt-4 space-y-4">
      <div class="absolute right-4 top-0 z-10 -mt-4 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
        <button type="button" data-panel="preview" data-route-tab="preview" class="${tabClass('preview')}">Preview</button>
        <button type="button" data-panel="response" data-route-tab="response" class="${tabClass('response')}">Response</button>
        <button type="button" data-panel="code" data-route-tab="code" class="${tabClass('code')}">Code</button>
        <button type="button" data-panel="events" data-route-tab="events" class="${tabClass('events')}">Events</button>
      </div>

      <div data-route-panel="preview" class="${getPanelClass('preview')}">
        <div class="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
          <div id="mount-error" class="mb-4 hidden rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"></div>
          <div id="preview-surface" class="demo-preview" data-scenario="${escapeAttr(ctx.activeHtmlScenario.id)}">
            <div id="preview-inner"></div>
          </div>
        </div>
      </div>

      <div data-route-panel="response" class="${getPanelClass('response')} space-y-4">
        <div id="response-panel-mount">${responseInner}</div>
      </div>

      <div data-route-panel="code" class="${getPanelClass('code')} space-y-4">
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div id="code-panel-mount">${buildCodePanelInnerHtml(ctx)}</div>
        </div>
      </div>

      <div data-route-panel="events" class="${getPanelClass('events')}">
        <div class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h3 id="event-log-title" class="text-sm font-semibold text-slate-900">Live event log (${eventLog.length})</h3>
            <button type="button" id="clear-events" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">Clear log</button>
          </div>
          <div id="event-log-root">${renderEventLogHtml()}</div>
        </div>
      </div>
    </div>
  `;
}

function buildNavHtml(ctx: RouteContext): string {
  const { route } = ctx;

  return (['server-rendered', 'client-rendered'] as const).map((sectionMode) => {
    const items = NAV_ITEMS.filter((item) => {
      return item.mode === sectionMode;
    });

    return `
      <div class="space-y-2">
        <p class="px-3 text-sm font-semibold text-slate-900">${sectionMode === 'server-rendered' ? 'Server-rendered' : 'Client-rendered'}</p>
        <div class="space-y-1">
          ${items.map((item) => {
            const isActive = item.mode === route.mode && item.transport === route.transport;
            return `
              <a href="${escapeAttr(item.href)}" data-nav class="block rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-white font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}">${escapeHtml(item.title)}</a>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function buildRouteOutletInnerHtml(ctx: RouteContext): string {
  const { route, selectedExample, selectedScenario, selectedDemo, isComponentScenario } = ctx;

  const restHtmlSection = route.transport === 'rest' && !isComponentScenario
    ? `
    <section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Choose form</h3>
        <div class="grid gap-3 md:grid-cols-3">
          ${DEMO_EXAMPLES.map((item) => {
            const isActive = item.id === selectedExample.id;
            const href = buildRestUrl(route.mode, item.id, selectedScenario.id);
            return `
              <a href="${escapeAttr(href)}" data-internal class="rounded border p-4 transition ${isActive ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">
                <p class="text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p>
                <p class="mt-1 text-xs text-slate-600">${escapeHtml(item.summary)}</p>
              </a>
            `;
          }).join('')}
        </div>
      </div>
      <div class="border-t border-slate-200 pt-5 space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Theme + style options</h3>
        <div class="grid gap-3 md:grid-cols-2">
          ${REST_SCENARIOS.filter((s) => {
            return s.mode === 'server-rendered';
          }).map((item) => {
            const href = buildRestUrl(route.mode, selectedExample.id, item.id);
            const isActive = item.id === selectedScenario.id;
            return `
              <a href="${escapeAttr(href)}" data-internal class="rounded border p-4 transition ${isActive ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">
                <p class="text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p>
                <p class="mt-1 text-xs text-slate-600">${escapeHtml(item.summary)}</p>
                ${item.description ? `<p class="mt-2 text-xs text-violet-600">${escapeHtml(item.description)}</p>` : ''}
              </a>
            `;
          }).join('')}
        </div>
      </div>
      <div class="border-t border-slate-200 pt-5">
        ${renderMainPanels(ctx)}
        ${renderTechnicalDetailsRest(ctx)}
      </div>
    </section>
  `
    : '';

  const restComponentSection = route.transport === 'rest' && isComponentScenario
    ? `
    <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      ${renderMainPanels(ctx)}
      ${renderTechnicalDetailsRest(ctx)}
    </section>
  `
    : '';

  const graphqlHtmlSection = route.transport === 'graphql' && !isComponentScenario
    ? `
    <section class="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Choose form</h3>
        <div class="grid gap-3 md:grid-cols-3">
          ${DEMO_EXAMPLES.map((item) => {
            const isActive = item.id === selectedExample.id;
            const href = buildGraphqlUrl(route.mode, item.id, selectedDemo.id, selectedScenario.id);
            return `
              <a href="${escapeAttr(href)}" data-internal class="rounded border p-4 transition ${isActive ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">
                <p class="text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p>
                <p class="mt-1 text-xs text-slate-600">${escapeHtml(item.summary)}</p>
              </a>
            `;
          }).join('')}
        </div>
      </div>
      <div class="border-t border-slate-200 pt-5 space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Theme + style options</h3>
        <div class="grid gap-3 md:grid-cols-2">
          ${REST_SCENARIOS.filter((s) => {
            return s.mode === 'server-rendered';
          }).map((item) => {
            const href = buildGraphqlUrl(route.mode, selectedExample.id, selectedDemo.id, item.id);
            const isActive = item.id === selectedScenario.id;
            return `
              <a href="${escapeAttr(href)}" data-internal class="rounded border p-4 transition ${isActive ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">
                <p class="text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p>
                <p class="mt-1 text-xs text-slate-600">${escapeHtml(item.summary)}</p>
                ${item.description ? `<p class="mt-2 text-xs text-violet-600">${escapeHtml(item.description)}</p>` : ''}
              </a>
            `;
          }).join('')}
        </div>
      </div>
      <div class="border-t border-slate-200 pt-5">
        ${renderMainPanels(ctx)}
        ${renderTechnicalDetailsGraphql(ctx)}
      </div>
    </section>
  `
    : '';

  const graphqlComponentSection = route.transport === 'graphql' && isComponentScenario
    ? `
    <section class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      ${renderMainPanels(ctx)}
      ${renderTechnicalDetailsGraphql(ctx)}
    </section>
  `
    : '';

  return `
    ${restHtmlSection}
    ${restComponentSection}
    ${graphqlHtmlSection}
    ${graphqlComponentSection}
  `;
}

function renderApp(): void {
  const ctx = buildRouteContext();
  lastCtx = ctx;

  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('Missing #app');
  }

  const pk = previewShellKey(ctx);
  const shellChanged = pk !== lastPreviewShellKey;

  if (!app.querySelector('[data-app-shell]')) {
    app.innerHTML = `
    <div data-app-shell>
    <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.35)] md:px-8">
        <a href="/server-rendered/rest?example=single-page&scenario=html-default-theme" data-nav class="flex items-center gap-3">
          <div class="size-6 shrink-0">${FORMIE_LOGO}</div>
          <div><p class="text-lg font-semibold text-slate-900">Formie Web Components Starter</p></div>
        </a>
      </div>
    </header>
    <main class="mx-auto grid max-w-7xl gap-8 p-6 md:grid-cols-[14rem_minmax(0,1fr)] md:p-8">
      <aside class="md:sticky md:top-24 md:self-start">
        <nav id="main-nav" class="space-y-6"></nav>
      </aside>
      <div class="space-y-6">
        <div id="route-outlet"></div>
        <footer class="pt-2 text-center">${VERBB_LOGO}</footer>
      </div>
    </main>
    </div>
  `;
    attachDelegatedListenersOnce();
  }

  document.querySelector('#main-nav')!.innerHTML = buildNavHtml(ctx);

  if (shellChanged) {
    lastPreviewShellKey = pk;

    if (ctx.route.transport === 'graphql' && ctx.previewIsHtml) {
      activeRequestMode = 'formie';
    } else if (ctx.route.transport === 'graphql') {
      activeRequestMode = 'app';
    } else {
      activeRequestMode = 'formie';
    }

    const outlet = document.querySelector('#route-outlet');
    if (outlet) {
      outlet.innerHTML = buildRouteOutletInnerHtml(ctx);
    }

    void mountRoutePreview(ctx);

    if (activePanel === 'response') {
      serverResponse = 'Loading response...';
      serverResponseError = null;
      syncResponsePanelDom();
      void loadServerResponse(ctx).then(() => {
        syncResponsePanelDom();
      });
    }
  } else {
    updateTabStripDom();
    syncCodePanelDom(ctx);
    syncEventsPanelDom();
    syncResponsePanelDom();
  }
}

function renderTechnicalDetailsRest(ctx: RouteContext): string {
  return `
    <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">Technical details</summary>
      <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        <p>Example handle: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(ctx.selectedExample.handle)}</code></p>
        <p>Base URL: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(describeRestBaseUrl())}</code></p>
        <p>Mode: <code class="rounded bg-white px-2 py-1 text-slate-700">${ctx.isComponentScenario ? 'client-rendered' : 'server-rendered'}</code></p>
        <p>Transport: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(ctx.route.transport)}</code></p>
        <p>Theme: <code class="rounded bg-white px-2 py-1 text-slate-700">${ctx.isComponentScenario ? 'host-owned' : escapeHtml(String(ctx.selectedScenario.theme))}</code></p>
        <p>Scenario id: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(ctx.selectedScenario.id)}</code></p>
      </div>
      ${ctx.selectedScenario.themeConfig ? `<pre class="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">${escapeHtml(JSON.stringify(ctx.selectedScenario.themeConfig, null, 2))}</pre>` : ''}
    </details>
  `;
}

function renderTechnicalDetailsGraphql(ctx: RouteContext): string {
  return `
    <details class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <summary class="cursor-pointer list-none text-sm font-medium text-slate-900">Technical details</summary>
      <div class="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        <p>Base URL: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(describeRestBaseUrl())}</code></p>
        <p>GraphQL endpoint: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(describeGraphqlEndpoint())}</code></p>
        <p>Mode: <code class="rounded bg-white px-2 py-1 text-slate-700">${ctx.previewIsHtml ? 'html' : 'component'}</code></p>
        <p>Transport: <code class="rounded bg-white px-2 py-1 text-slate-700">graphql</code></p>
        <p>Demo id: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(ctx.selectedDemo.id)}</code></p>
        <p>Example handle: <code class="rounded bg-white px-2 py-1 text-slate-700">${escapeHtml(ctx.selectedExample.handle)}</code></p>
      </div>
    </details>
  `;
}

let delegatedListenersAttached = false;

function attachDelegatedListenersOnce(): void {
  if (delegatedListenersAttached) {
    return;
  }

  delegatedListenersAttached = true;

  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const copyBtn = target.closest('.copy-code-btn') as HTMLButtonElement | null;
    if (copyBtn) {
      void (async () => {
        const id = copyBtn.dataset.copyTarget;
        const ta = id ? document.querySelector<HTMLTextAreaElement>(`#${CSS.escape(id)}`) : null;
        if (!ta) {
          return;
        }

        try {
          await navigator.clipboard.writeText(ta.value);
          copyBtn.title = 'Copied';
        } catch {
          copyBtn.title = 'Copy failed';
        }

        window.setTimeout(() => {
          copyBtn.title = 'Copy to clipboard';
        }, 1800);
      })();

      return;
    }

    const nav = target.closest('a[data-nav]');
    if (nav) {
      e.preventDefault();
      navigate(nav.getAttribute('href') || '/server-rendered/rest');
      return;
    }

    const internal = target.closest('a[data-internal]');
    if (internal) {
      e.preventDefault();
      navigate(internal.getAttribute('href') || '');
      return;
    }

    const panelBtn = target.closest('[data-panel]') as HTMLButtonElement | null;
    if (panelBtn) {
      activePanel = panelBtn.dataset.panel as PanelId;
      updateTabStripDom();

      if (activePanel === 'response') {
        serverResponse = 'Loading response...';
        serverResponseError = null;
        syncResponsePanelDom();
        void loadServerResponse(buildRouteContext()).then(() => {
          syncResponsePanelDom();
        });
      }

      return;
    }

    const rm = target.closest('[data-request-mode]') as HTMLButtonElement | null;
    if (rm) {
      activeRequestMode = rm.dataset.requestMode === 'app' ? 'app' : 'formie';
      syncCodePanelDom(lastCtx || buildRouteContext());
      return;
    }

    if (target.closest('#clear-events')) {
      eventLog = [];
      syncEventsPanelDom();
    }
  });
}

function navigate(href: string): void {
  window.history.pushState({}, '', href);
  activePanel = 'preview';
  activeRequestMode = 'formie';
  eventLog = [];
  serverResponse = 'Open the Response tab to load the live payload.';
  serverResponseError = null;
  lastPreviewShellKey = '';
  renderApp();
}

async function mountRoutePreview(ctx: RouteContext): Promise<void> {
  await teardownPreview();

  const inner = document.querySelector<HTMLDivElement>('#preview-inner');
  const mountError = document.querySelector<HTMLDivElement>('#mount-error');
  const previewSurface = document.querySelector<HTMLDivElement>('#preview-surface');

  if (!inner || !mountError || !previewSurface) {
    return;
  }

  mountError.textContent = '';
  mountError.classList.add('hidden');
  inner.innerHTML = '';

  const formatHtmlError = (error: unknown): string => {
    const message = error instanceof Error ? error.message : 'The form could not be loaded.';
    return `Unable to load the "${ctx.selectedExample.title}" demo form (${ctx.selectedExample.handle}). ${message}`;
  };

  try {
    if (ctx.previewIsHtml) {
      bindPreviewDomEvents(previewSurface);
      const formElement = document.createElement('formie-form') as FormieFormElement;
      formElement.mode = 'html';
      formElement.transport = ctx.route.transport;
      formElement.formHandle = ctx.selectedExample.handle;
      formElement.endpoint = ctx.route.transport === 'graphql' ? GRAPHQL_ENDPOINT : FORMIE_BASE_URL;
      formElement.theme = ctx.activeHtmlScenario.theme;
      formElement.themeConfig = ctx.activeHtmlScenario.themeConfig;
      inner.append(formElement);
      appendEvent('formie:validator:ready', null);
      appendEvent('formie:mount:after', null);
      disposePreview = async () => {
        formElement.remove();
        inner.innerHTML = '';
      };
    } else {
      bindPreviewDomEvents(previewSurface);
      const coreForm = document.createElement('formie-core-form') as FormieCoreForm;
      coreForm.formHandle = ctx.selectedExample.handle;
      coreForm.endpoint = ctx.route.transport === 'graphql' ? GRAPHQL_ENDPOINT : FORMIE_BASE_URL;
      coreForm.transport = ctx.route.transport;
      inner.append(coreForm);
      disposePreview = async () => {
        coreForm.remove();
        inner.innerHTML = '';
      };
    }
  } catch (error) {
    if (ctx.previewIsHtml) {
      mountError.textContent = formatHtmlError(error);
      mountError.classList.remove('hidden');
    } else {
      inner.innerHTML = `<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">${escapeHtml(formatHtmlError(error))}</div>`;
    }
  }
}

function ensureDefaultPath(): void {
  if (!normalizeLocation(readBrowserLocation().pathname)) {
    window.history.replaceState({}, '', '/server-rendered/rest?example=single-page&scenario=html-default-theme');
  }
}

ensureDefaultPath();
window.addEventListener('popstate', () => {
  activePanel = 'preview';
  activeRequestMode = 'formie';
  eventLog = [];
  serverResponse = 'Open the Response tab to load the live payload.';
  serverResponseError = null;
  lastPreviewShellKey = '';
  ensureDefaultPath();
  renderApp();
});

renderApp();
