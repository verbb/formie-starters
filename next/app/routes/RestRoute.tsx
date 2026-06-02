import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useFormieHtml } from '@verbb/formie-react';
import { ComponentDrivenPreview } from '../components/ComponentDrivenPreview';
import {
  DEFAULT_EXAMPLE_ID,
  DEFAULT_SCENARIO_ID,
  DEMO_EXAMPLES,
  FORMIE_BASE_URL,
  REST_SCENARIOS,
  describeRestBaseUrl,
  type DemoExample,
  type RestScenario,
  resolveRestScenarioForMode,
  resolveExample,
} from '../lib/demo-data';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from '../lib/event-log';
import { requestRestDefinitionEnvelope, requestRestHtmlPayload } from '../lib/server-payloads';

type RestRouteProps = {
  mode: RestMode;
  search: string;
  navigate: (url: string, options?: { replace?: boolean }) => void;
  toAppHref: (url: string) => string;
};

type RestMode = 'server-rendered' | 'client-rendered';
type RestPanelId = 'preview' | 'response' | 'code' | 'events';
type RequestCodeMode = 'formie' | 'app';

const CodePanel = dynamic(() => {
  return import('../components/CodePanel').then((module) => module.CodePanel);
}, {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
      Loading code panel...
    </div>
  ),
});

function buildRestUrl(mode: RestMode, exampleId: string, scenarioId: string): string {
  return `/${mode}/rest?example=${exampleId}&scenario=${scenarioId}`;
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
    "import { useFormieHtml } from '@verbb/formie-react';",
    '',
    'const form = useFormieHtml({',
    "  transport: 'rest',",
    `  endpoint: '${FORMIE_BASE_URL}',`,
    `  formHandle: '${example.handle}',`,
    `  theme: '${scenario.theme}',`,
  ];

  if (scenario.themeConfig) {
    lines.push(`  themeConfig: ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, '\n  ')},`);
  }

  lines.push('});', '', 'return <div ref={form.rootRef} />;');

  return lines.join('\n');
}

function buildComponentDrivenSnippet(example: DemoExample): string {
  return [
    "import { FormieClientForm, type FormieFieldProps, type FormieFieldComponentProps } from '@verbb/formie-react';",
    '',
    'function Field({ field, children }: FormieFieldProps) {',
    '  return (',
    "    <div className='my-field'>",
    '      <label>{field.label}</label>',
    '      {children}',
    '    </div>',
    '  );',
    '}',
    '',
    'function TextField({ value, setValue }: FormieFieldComponentProps) {',
    '  return (',
    "    <input",
    "      type='text'",
    "      value={typeof value === 'string' ? value : ''}",
    "      onChange={(event) => setValue(event.target.value)}",
    "      className='my-text-input'",
    '    />',
    '  );',
    '}',
    '',
    'return (',
    '  <FormieForm',
    '    source={{',
    "      transport: 'rest',",
    `      endpoint: '${FORMIE_BASE_URL}',`,
    `      formHandle: '${example.handle}',`,
    '    }}',
    '    components={{',
    '      Field,',
    '    }}',
    '    fieldComponents={{',
    "      'single-line-text': TextField,",
    '    }}',
    '  />',
    ');',
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
    "import { useEffect, useState } from 'react';",
    "import { FormieForm, type FormEndpointPayload } from '@verbb/formie-react';",
    '',
    `const endpoint = '${FORMIE_BASE_URL}';`,
    '',
    'const [payload, setPayload] = useState<FormEndpointPayload | null>(null);',
    '',
    'useEffect(() => {',
    "  void fetch(`${endpoint}/actions/formie/server/forms/render`, {",
    "    method: 'POST',",
    "    credentials: 'same-origin',",
    '    headers: {',
    "      'Content-Type': 'application/json',",
    '    },',
    '    body: JSON.stringify({',
    `      handle: '${example.handle}',`,
    `      renderOptions: ${JSON.stringify(renderOptions, null, 6).replace(/\n/g, '\n      ')},`,
    '    }),',
    '  }).then(async (response) => {',
    '    const result = await response.json();',
    '    setPayload(result);',
    '  });',
    '}, []);',
    '',
    'if (!payload) {',
    "  return <div>Loading...</div>;",
    '}',
    '',
    'return <FormieForm source={{ payload }} />;',
  ].join('\n');
}

function buildRestByoComponentSnippet(example: DemoExample): string {
  return [
    "import { useEffect, useState } from 'react';",
    "import { FormieClientForm, type FrontendFormEnvelope } from '@verbb/formie-react';",
    '',
    `const endpoint = '${FORMIE_BASE_URL}';`,
    '',
    'const [definition, setDefinition] = useState<FrontendFormEnvelope | null>(null);',
    '',
    'useEffect(() => {',
    "  void fetch(`${endpoint}/actions/formie/client/forms/load`, {",
    "    method: 'POST',",
    "    credentials: 'same-origin',",
    '    headers: {',
    "      'Content-Type': 'application/json',",
    '    },',
    '    body: JSON.stringify({',
    `      handle: '${example.handle}',`,
    '    }),',
    '  }).then(async (response) => {',
    '    const result = await response.json();',
    '    setDefinition(result);',
    '  });',
    '}, []);',
    '',
    'if (!definition) {',
    "  return <div>Loading...</div>;",
    '}',
    '',
    'return (',
    '  <FormieForm',
    '    source={{',
    '      definition,',
    '      transport: {',
    "        type: 'rest',",
    '        endpoint,',
    `        formHandle: '${example.handle}',`,
    '      },',
    '    }}',
    '  />',
    ');',
  ].join('\n');
}

export function RestRoute({ mode, search, navigate, toAppHref }: RestRouteProps) {
  const [activePanel, setActivePanel] = useState<RestPanelId>('preview');
  const [activeRequestMode, setActiveRequestMode] = useState<RequestCodeMode>('formie');
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [serverResponse, setServerResponse] = useState<string>('Loading response...');
  const [serverResponseError, setServerResponseError] = useState<string | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const params = useMemo(() => {
    return new URLSearchParams(search);
  }, [search]);
  const isComponentScenario = mode === 'client-rendered';
  const selectedExample = useMemo(() => {
    return isComponentScenario
      ? resolveExample(DEFAULT_EXAMPLE_ID)
      : resolveExample(params.get('example') || DEFAULT_EXAMPLE_ID);
  }, [isComponentScenario, params]);
  const selectedScenario = useMemo(() => {
    return isComponentScenario
      ? resolveRestScenarioForMode('client-rendered', 'component-rest-form')
      : resolveRestScenarioForMode('server-rendered', params.get('scenario') || DEFAULT_SCENARIO_ID);
  }, [isComponentScenario, params]);
  const activeHtmlScenario = useMemo(() => {
    return !isComponentScenario
      ? selectedScenario
      : REST_SCENARIOS.find((scenario) => {
        return scenario.id === DEFAULT_SCENARIO_ID;
      }) || REST_SCENARIOS[0];
  }, [isComponentScenario, selectedScenario]);
  const selectedUrl = useMemo(() => {
    return buildRestUrl(mode, selectedExample.id, selectedScenario.id);
  }, [mode, selectedExample.id, selectedScenario.id]);
  const htmlMount = useFormieHtml(useMemo(() => {
    return {
      transport: 'rest' as const,
      endpoint: FORMIE_BASE_URL,
      formHandle: selectedExample.handle,
      theme: activeHtmlScenario.theme,
      themeConfig: activeHtmlScenario.themeConfig,
    };
  }, [activeHtmlScenario.theme, activeHtmlScenario.themeConfig, selectedExample.handle]));
  const htmlError = !isComponentScenario ? formatDemoError(selectedExample, htmlMount.state.error) : null;
  const htmlSnippet = useMemo(() => {
    return isComponentScenario
      ? buildComponentDrivenSnippet(selectedExample)
      : buildHtmlSnippet(selectedExample, activeHtmlScenario);
  }, [activeHtmlScenario, isComponentScenario, selectedExample]);
  const appFetchSnippet = useMemo(() => {
    return isComponentScenario
      ? buildRestByoComponentSnippet(selectedExample)
      : buildRestByoHtmlSnippet(selectedExample, activeHtmlScenario);
  }, [activeHtmlScenario, isComponentScenario, selectedExample]);

  useEffect(() => {
    setEventLog([]);
  }, [selectedExample.id, selectedScenario.id]);

  useEffect(() => {
    setActiveRequestMode('formie');
  }, [mode]);

  useEffect(() => {
    if (activePanel !== 'response') {
      setServerResponse('Open the Response tab to load the live payload.');
      setServerResponseError(null);
      return;
    }

    let disposed = false;

    setServerResponse('Loading response...');
    setServerResponseError(null);

    const loadResponse = async () => {
      try {
        const payload = isComponentScenario
          ? await requestRestDefinitionEnvelope(FORMIE_BASE_URL, selectedExample.handle)
          : await requestRestHtmlPayload(FORMIE_BASE_URL, selectedExample.handle, {
            mode: 'server-rendered',
            endpoint: FORMIE_BASE_URL,
            theme: activeHtmlScenario.theme,
            themeConfig: activeHtmlScenario.themeConfig,
          });

        if (!disposed) {
          setServerResponse(JSON.stringify(payload, null, 2));
        }
      } catch (error: unknown) {
        if (!disposed) {
          setServerResponseError(error instanceof Error ? error.message : 'Unable to load the server response.');
        }
      }
    };

    void loadResponse();

    return () => {
      disposed = true;
    };
  }, [
    activePanel,
    activeHtmlScenario.theme,
    activeHtmlScenario.themeConfig,
    isComponentScenario,
    selectedExample.handle,
  ]);

  useEffect(() => {
    if (!htmlMount.state.instance) {
      return;
    }

    setEventLog((current) => {
      if (current.length > 0) {
        return current;
      }

      return [
        createEventEntry('formie:validator:ready', null),
        createEventEntry('formie:mount:after', null),
      ];
    });
  }, [htmlMount.state.instance]);

  useEffect(() => {
    const root = previewSurfaceRef.current;

    if (!root) {
      return;
    }

    const appendEvent = (eventName: string, detail: unknown) => {
      setEventLog((current) => {
        const entry = createEventEntry(eventName, detail);
        return [entry, ...current].slice(0, 40);
      });
    };

    const unbinds = OBSERVED_FORMIE_EVENTS.map((eventName) => {
      const handler = (event: Event) => {
        appendEvent(eventName, (event as CustomEvent<unknown>).detail);
      };

      root.addEventListener(eventName, handler as EventListener);

      return () => {
        root.removeEventListener(eventName, handler as EventListener);
      };
    });

    return () => {
      unbinds.forEach((unbind) => {
        unbind();
      });
    };
  }, [selectedExample.id, selectedScenario.id]);

  const mainContent = (
    <>
      <div className={`relative space-y-4 mt-4`}>
        <div className={`absolute right-4 top-0 -mt-4 z-10 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm ${isComponentScenario ? '' : '-mt-4'}`}>
          {(['preview', 'response', 'code', 'events'] as const).map((panel) => {
            const isActive = activePanel === panel;

            return (
              <button
                key={panel}
                type="button"
                onClick={() => {
                  setActivePanel(panel);
                }}
                className={`border-l border-slate-200 px-5 py-2 text-sm font-medium transition first:border-l-0 ${isActive
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-50'
                  }`}
              >
                {getPanelLabel(panel)}
              </button>
            );
          })}
        </div>

        <div className={activePanel === 'preview' ? 'block' : 'hidden'}>
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
            {htmlError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {htmlError}
              </div>
            ) : null}
            <div ref={previewSurfaceRef}>
              {isComponentScenario ? (
                <ComponentDrivenPreview
                  key={`${selectedExample.id}:${selectedScenario.id}`}
                  handle={selectedExample.handle}
                  source="rest"
                  baseUrl={FORMIE_BASE_URL}
                  onEvent={(event) => {
                    setEventLog((current) => {
                      return [createEventEntry(event.name, event.payload), ...current].slice(0, 50);
                    });
                  }}
                />
              ) : (
                <div
                  key={`${selectedExample.id}:${selectedScenario.id}`}
                  className="demo-preview"
                  data-scenario={selectedScenario.id}
                  ref={htmlMount.rootRef}
                />
              )}
            </div>
          </div>
        </div>

        <div className={activePanel === 'response' ? 'block' : 'hidden'}>
          {serverResponseError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {serverResponseError}
            </div>
          ) : (
            <CodePanel code={serverResponse} language="json" />
          )}
        </div>

        <div className={activePanel === 'code' ? 'block' : 'hidden'}>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: 'formie', label: 'Formie fetch' },
                { id: 'app', label: 'App fetch' },
              ] as const).map((tab) => {
                const isActive = activeRequestMode === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveRequestMode(tab.id);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${isActive
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <CodePanel code={activeRequestMode === 'formie' ? htmlSnippet : appFetchSnippet} language="tsx" />
          </div>
        </div>

        <div className={activePanel === 'events' ? 'block' : 'hidden'}>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">Live event log ({eventLog.length})</h3>
                <p className="text-sm text-slate-600">
                  Interact with the preview tab, then return here to inspect the canonical `formie:*` events emitted by the mounted form.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEventLog([]);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Clear log
              </button>
            </div>

            {eventLog.length ? (
              <div className="space-y-2">
                {eventLog.map((entry) => {
                  return (
                    <details key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <summary className="cursor-pointer list-none">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-900">{entry.name}</p>
                            <p className="truncate text-[11px] text-slate-500">{entry.summary}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-500">{entry.time}</span>
                        </div>
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-[11px] text-slate-100">
                        {entry.detail}
                      </pre>
                    </details>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
                No events logged yet. Open the preview, validate fields, move between pages, upload files, or submit the form to populate this pane.
              </div>
            )}
          </div>
        </div>

        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">
            Technical details
          </summary>

          <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p>
              Example handle: <code className="rounded bg-white px-2 py-1 text-slate-700">{selectedExample.handle}</code>
            </p>
            <p>
              Base URL: <code className="rounded bg-white px-2 py-1 text-slate-700">{describeRestBaseUrl()}</code>
            </p>
            <p>
              Mode: <code className="rounded bg-white px-2 py-1 text-slate-700">{isComponentScenario ? 'client-rendered' : 'server-rendered'}</code>
            </p>
            <p>
              Transport: <code className="rounded bg-white px-2 py-1 text-slate-700">rest</code>
            </p>
            <p>
              Theme: <code className="rounded bg-white px-2 py-1 text-slate-700">{isComponentScenario ? 'host-owned' : selectedScenario.theme}</code>
            </p>
            <p>
              Scenario id: <code className="rounded bg-white px-2 py-1 text-slate-700">{selectedScenario.id}</code>
            </p>
          </div>

          {selectedScenario.themeConfig ? (
            <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
              {JSON.stringify(selectedScenario.themeConfig, null, 2)}
            </pre>
          ) : null}
        </details>
      </div>
    </>
  );

  return (
    <>
      {!isComponentScenario ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Choose form</h3>

              <div className="grid gap-3 md:grid-cols-3">
                {DEMO_EXAMPLES.map((item) => {
                  const isActive = item.id === selectedExample.id;

                  return (
                    <a
                      key={item.id}
                      href={toAppHref(buildRestUrl(mode, item.id, selectedScenario.id))}
                      onClick={(event) => {
                        event.preventDefault();
                        navigate(buildRestUrl(mode, item.id, selectedScenario.id));
                      }}
                      className={`rounded border p-4 transition ${isActive
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Theme + style options
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {REST_SCENARIOS.filter((scenario) => {
                    return scenario.mode === 'server-rendered';
                  }).map((item) => {
                    const href = buildRestUrl(mode, selectedExample.id, item.id);
                    const isActive = item.id === selectedScenario.id;

                    return (
                      <a
                        key={item.id}
                        href={toAppHref(href)}
                        onClick={(event) => {
                          event.preventDefault();
                          navigate(href);
                        }}
                        className={`rounded border p-4 transition ${isActive
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.summary}</p>
                        {item.description ? (
                          <p className="mt-2 text-xs text-violet-600">{item.description}</p>
                        ) : null}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              {mainContent}
            </div>
          </>
        </section>
      ) : null}
      {isComponentScenario ? (
        <section
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          data-selected-url={selectedUrl}
        >
          {mainContent}
        </section>
      ) : null}
    </>
  );
}
