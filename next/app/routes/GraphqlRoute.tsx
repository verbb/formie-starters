import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useFormieHtml } from '@verbb/formie-react';
import { ComponentDrivenPreview } from '../components/ComponentDrivenPreview';
import {
  DEFAULT_EXAMPLE_ID,
  DEFAULT_GRAPHQL_DEMO_ID,
  DEFAULT_SCENARIO_ID,
  DEMO_EXAMPLES,
  FORMIE_BASE_URL,
  GRAPHQL_ENDPOINT,
  GRAPHQL_DEMOS,
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
import {
  requestGraphqlDefinitionEnvelopeResponse,
  requestGraphqlHtmlPayloadResponse,
} from '../lib/server-payloads';
import { createEventEntry, OBSERVED_FORMIE_EVENTS, type EventLogEntry } from '../lib/event-log';

type GraphqlRouteProps = {
  mode: 'server-rendered' | 'client-rendered';
  search: string;
  navigate: (url: string, options?: { replace?: boolean }) => void;
};

type GraphqlPanelId = 'preview' | 'response' | 'code' | 'events';
type RequestCodeMode = 'formie' | 'app';
type GraphqlCodeExample = {
  code: string;
  language: 'tsx' | 'typescript';
};

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

function buildGraphqlUrl(mode: 'server-rendered' | 'client-rendered', exampleId: string, demoId: string, scenarioId?: string): string {
  const params = new URLSearchParams({
    example: exampleId,
    demo: demoId,
  });

  if (scenarioId) {
    params.set('scenario', scenarioId);
  }

  return `/${mode}/graphql?${params.toString()}`;
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
    const lines = [
      "import { useEffect, useState } from 'react';",
      "import { FormieForm, type FormEndpointPayload } from '@verbb/formie-react';",
      '',
      `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
      `const query = ${JSON.stringify(query)};`,
      `const variables = ${variables.replace(/\n/g, '\n')};`,
      '',
      'const [payload, setPayload] = useState<FormEndpointPayload | null>(null);',
      '',
      'useEffect(() => {',
      '  void fetch(graphqlEndpoint, {',
      "    method: 'POST',",
      "    credentials: 'same-origin',",
      '    headers: {',
      "      'Content-Type': 'application/json',",
      "      Accept: 'application/json',",
      '    },',
      '    body: JSON.stringify({',
      '      query,',
      '      variables,',
      '    }),',
      '  }).then(async (response) => {',
      '    const result = await response.json();',
      '    setPayload(result.data.formieHtmlForm);',
      '  });',
      '}, []);',
      '',
      'if (!payload) {',
      "  return <div>Loading...</div>;",
      '}',
      '',
      'return (',
      '  <FormieForm',
      '    source={{',
      '      payload,',
      '    }}',
      '  />',
      ');',
    ];

    return lines.join('\n');
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
    const variables = JSON.stringify({
      handle: example.handle,
    }, null, 2);
    return [
      "import { useEffect, useState } from 'react';",
      "import {",
      "  FormieForm,",
      "  type FrontendFormEnvelope,",
      "  type FormieFieldProps,",
      "  type FormieFieldComponentProps,",
      "} from '@verbb/formie-react';",
      '',
      `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
      `const query = ${JSON.stringify(query)};`,
      `const variables = ${variables.replace(/\n/g, '\n')};`,
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
      'const [definition, setDefinition] = useState<FrontendFormEnvelope | null>(null);',
      '',
      'useEffect(() => {',
      '  void fetch(graphqlEndpoint, {',
      "    method: 'POST',",
      "    credentials: 'same-origin',",
      '    headers: {',
      "      'Content-Type': 'application/json',",
      "      Accept: 'application/json',",
      '    },',
      '    body: JSON.stringify({',
      '      query,',
      '      variables,',
      '    }),',
      '  }).then(async (response) => {',
      '    const result = await response.json();',
      '    setDefinition(result.data.formieClientForm);',
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
      "        type: 'graphql',",
      '        endpoint: graphqlEndpoint,',
      `        formHandle: '${example.handle}',`,
      '      },',
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

  if (demo.id === 'submit-mutation') {
    const exampleRequest = buildFrontendContractSubmissionExample(example);
    return [
      `const endpoint = '${GRAPHQL_ENDPOINT}';`,
      `const mutation = ${JSON.stringify(exampleRequest.query)};`,
      `const variables = ${JSON.stringify(exampleRequest.variables, null, 2).replace(/\n/g, '\n')};`,
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
    "import { useFormieHtml } from '@verbb/formie-react';",
    '',
    'const form = useFormieHtml({',
    "  transport: 'graphql',",
    `  endpoint: '${GRAPHQL_ENDPOINT}',`,
    `  formHandle: '${example.handle}',`,
    `  theme: '${scenario.theme}',`,
  ];

  if (scenario.themeConfig) {
    lines.push(`  themeConfig: ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, '\n  ')},`);
  }

  lines.push('});', '', 'return <div ref={form.rootRef} />;');

  return lines.join('\n');
}

function buildCodeExample(example: DemoExample, demo: GraphqlDemo, scenario: RestScenario, requestMode: RequestCodeMode): GraphqlCodeExample {
  if (demo.id === 'html-payload' && requestMode === 'formie') {
    return {
      code: buildHtmlHookSnippet(example, scenario),
      language: 'tsx',
    };
  }

  return {
    code: buildUsageSnippet(example, demo, scenario),
    language: demo.id === 'submit-mutation' ? 'typescript' : 'tsx',
  };
}

export function GraphqlRoute({ mode, search, navigate }: GraphqlRouteProps) {
  const [activePanel, setActivePanel] = useState<GraphqlPanelId>('preview');
  const [activeRequestMode, setActiveRequestMode] = useState<RequestCodeMode>('formie');
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [serverResponse, setServerResponse] = useState<string>('Loading response...');
  const [serverResponseError, setServerResponseError] = useState<string | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const params = useMemo(() => {
    return new URLSearchParams(search);
  }, [search]);
  const isComponentRoute = mode === 'client-rendered';
  const selectedExample = useMemo(() => {
    return isComponentRoute
      ? resolveExample(DEFAULT_EXAMPLE_ID)
      : resolveExample(params.get('example') || DEFAULT_EXAMPLE_ID);
  }, [isComponentRoute, params]);
  const selectedDemo = useMemo(() => {
    return isComponentRoute
      ? resolveGraphqlDemoForMode('client-rendered', 'component-payload')
      : resolveGraphqlDemoForMode('server-rendered', params.get('demo') || DEFAULT_GRAPHQL_DEMO_ID);
  }, [isComponentRoute, params]);
  const selectedScenario = useMemo(() => {
    return resolveRestScenarioForMode('server-rendered', params.get('scenario') || DEFAULT_SCENARIO_ID);
  }, [params]);
  const selectedUrl = useMemo(() => {
    return buildGraphqlUrl(mode, selectedExample.id, selectedDemo.id, selectedDemo.mode === 'server-rendered' ? selectedScenario.id : undefined);
  }, [mode, selectedDemo.id, selectedExample.id, selectedDemo.mode, selectedScenario.id]);
  const previewMode = selectedDemo.mode;
  const htmlMount = useFormieHtml(useMemo(() => {
    const options: {
      transport: 'graphql';
      endpoint: string;
      formHandle: string;
      theme: 'formie' | 'none' | undefined;
      themeConfig?: RestScenario['themeConfig'];
    } = {
      transport: 'graphql' as const,
      endpoint: GRAPHQL_ENDPOINT,
      formHandle: selectedExample.handle,
      theme: selectedScenario.theme,
    };

    if (selectedScenario.themeConfig) {
      options.themeConfig = selectedScenario.themeConfig;
    }

    return options;
  }, [selectedExample.handle, selectedScenario.theme, selectedScenario.themeConfig]));
  const htmlError = previewMode === 'server-rendered' && htmlMount.state.error
    ? `Unable to load the "${selectedExample.title}" GraphQL demo form (${selectedExample.handle}). ${htmlMount.state.error.message}`
    : null;

  useEffect(() => {
    setActiveRequestMode(selectedDemo.id === 'html-payload' ? 'formie' : 'app');
  }, [selectedDemo.id]);

  useEffect(() => {
    setEventLog([]);
  }, [selectedExample.id, selectedDemo.id, selectedScenario.id]);

  const availableRequestModes = useMemo(() => {
    return selectedDemo.id === 'html-payload'
      ? (['formie', 'app'] as const)
      : (['app'] as const);
  }, [selectedDemo.id]);

  const codeExample = useMemo(() => {
    return buildCodeExample(selectedExample, selectedDemo, selectedScenario, activeRequestMode);
  }, [activeRequestMode, selectedDemo, selectedExample, selectedScenario]);

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
        if (selectedDemo.id === 'submit-mutation') {
          if (!disposed) {
            setServerResponse(JSON.stringify(buildFrontendContractSubmissionExample(selectedExample), null, 2));
          }

          return;
        }

        const payload = selectedDemo.id === 'html-payload'
          ? await requestGraphqlHtmlPayloadResponse(GRAPHQL_ENDPOINT, selectedExample.handle, {
            mode: 'server-rendered',
            endpoint: GRAPHQL_ENDPOINT,
            theme: selectedScenario.theme,
            ...(selectedScenario.themeConfig ? { themeConfig: selectedScenario.themeConfig } : {}),
          })
          : await requestGraphqlDefinitionEnvelopeResponse(GRAPHQL_ENDPOINT, selectedExample.handle);

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
  }, [activePanel, selectedDemo.id, selectedExample, selectedExample.handle, selectedScenario.theme, selectedScenario.themeConfig]);

  useEffect(() => {
    if (!htmlMount.state.instance || previewMode !== 'server-rendered') {
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
  }, [htmlMount.state.instance, previewMode]);

  useEffect(() => {
    const root = previewSurfaceRef.current;

    if (!root || previewMode !== 'server-rendered') {
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
  }, [previewMode, selectedExample.id, selectedScenario.id]);

  const contentSection = (
    <>
      <div className={`relative space-y-4 mt-4`}>
        <div className={`absolute right-4 top-0 -mt-4 z-10 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm ${isComponentRoute ? '' : '-mt-4'}`}>
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
            {previewMode === 'server-rendered' && htmlError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {htmlError}
              </div>
            ) : null}

            <div ref={previewSurfaceRef}>
              {previewMode === 'server-rendered' ? (
                <div
                  key={`graphql:${selectedExample.id}:${selectedScenario.id}`}
                  className="demo-preview"
                  data-scenario={selectedScenario.id}
                  ref={htmlMount.rootRef}
                />
              ) : null}

              {previewMode === 'client-rendered' ? (
                <ComponentDrivenPreview
                  key={`graphql-component:${selectedExample.id}`}
                  handle={selectedExample.handle}
                  source="graphql"
                  baseUrl={FORMIE_BASE_URL}
                  graphqlEndpoint={GRAPHQL_ENDPOINT}
                  onEvent={(event) => {
                    setEventLog((current) => {
                      return [createEventEntry(event.name, event.payload), ...current].slice(0, 50);
                    });
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className={activePanel === 'response' ? 'block space-y-4' : 'hidden'}>
          {serverResponseError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {serverResponseError}
            </div>
          ) : (
            <CodePanel code={serverResponse} language="json" />
          )}
        </div>

        <div className={activePanel === 'code' ? 'block space-y-4' : 'hidden'}>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 pt-8 text-slate-900 shadow-sm">
            {availableRequestModes.length > 1 ? (
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
            ) : null}

            <CodePanel code={codeExample.code} language={codeExample.language} />
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
              Base URL: <code className="rounded bg-white px-2 py-1 text-slate-700">{describeRestBaseUrl()}</code>
            </p>
            <p>
              GraphQL endpoint: <code className="rounded bg-white px-2 py-1 text-slate-700">{describeGraphqlEndpoint()}</code>
            </p>
            <p>
              Mode: <code className="rounded bg-white px-2 py-1 text-slate-700">{previewMode}</code>
            </p>
            <p>
              Transport: <code className="rounded bg-white px-2 py-1 text-slate-700">graphql</code>
            </p>
            <p>
              Demo id: <code className="rounded bg-white px-2 py-1 text-slate-700">{selectedDemo.id}</code>
            </p>
            <p>
              Example handle: <code className="rounded bg-white px-2 py-1 text-slate-700">{selectedExample.handle}</code>
            </p>
          </div>
        </details>
      </div>
    </>
  );

  return (
    <>
      {!isComponentRoute ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Choose form</h3>

              <div className="grid gap-3 md:grid-cols-3">
                {DEMO_EXAMPLES.map((item) => {
                  const href = buildGraphqlUrl(mode, item.id, selectedDemo.id, selectedScenario.id);
                  const isActive = item.id === selectedExample.id;

                  return (
                    <a
                      key={item.id}
                      href={href}
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
                    const href = buildGraphqlUrl(mode, selectedExample.id, selectedDemo.id, item.id);
                    const isActive = item.id === selectedScenario.id;

                    return (
                      <a
                        key={item.id}
                        href={href}
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
              {contentSection}
            </div>
          </>
        </section>
      ) : null}
      {isComponentRoute ? (
        <section
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          data-selected-url={selectedUrl}
        >
          {contentSection}
        </section>
      ) : null}
    </>
  );
}
