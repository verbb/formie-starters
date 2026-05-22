import { FORMIE_BASE_URL, GRAPHQL_ENDPOINT, type DemoExample, type RestScenario, type StarterStory } from "./demo-data";

function buildHtmlOptions(scenario: RestScenario): Record<string, unknown> {
  const options: Record<string, unknown> = {
    theme: scenario.theme,
  };

  if (scenario.themeConfig) {
    options.themeConfig = scenario.themeConfig;
  }

  return options;
}

function buildHtmlHookSnippet(example: DemoExample, scenario: RestScenario, transport: "rest" | "graphql"): string {
  const lines = [
    "import { useFormieHtml } from '@verbb/formie-react';",
    "",
    "const form = useFormieHtml({",
    `  transport: '${transport}',`,
    `  endpoint: '${transport === "graphql" ? GRAPHQL_ENDPOINT : FORMIE_BASE_URL}',`,
    `  formHandle: '${example.handle}',`,
    `  theme: '${scenario.theme}',`,
  ];

  if (scenario.themeConfig) {
    lines.push(`  themeConfig: ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, "\n  ")},`);
  }

  lines.push("});", "", "return <div ref={form.rootRef} />;");

  return lines.join("\n");
}

function buildComponentDrivenSnippet(example: DemoExample, transport: "rest" | "graphql"): string {
  if (transport === "rest") {
    return [
      "import { FormieClientForm, type FormieFieldProps, type FormieFieldComponentProps } from '@verbb/formie-react';",
      "",
      "function Field({ field, children }: FormieFieldProps) {",
      "  return (",
      "    <div className='my-field'>",
      "      <label>{field.label}</label>",
      "      {children}",
      "    </div>",
      "  );",
      "}",
      "",
      "function TextField({ value, setValue }: FormieFieldComponentProps) {",
      "  return (",
      "    <input",
      "      type='text'",
      "      value={typeof value === 'string' ? value : ''}",
      "      onChange={(event) => setValue(event.target.value)}",
      "      className='my-text-input'",
      "    />",
      "  );",
      "}",
      "",
      "return (",
      "  <FormieForm",
      "    source={{",
      "      transport: 'rest',",
      `      endpoint: '${FORMIE_BASE_URL}',`,
      `      formHandle: '${example.handle}',`,
      "    }}",
      "    components={{",
      "      Field,",
      "    }}",
      "    fieldComponents={{",
      "      'single-line-text': TextField,",
      "    }}",
      "  />",
      ");",
    ].join("\n");
  }

  const query = [
    "query FrontendForm($handle: String!) {",
    "  formieClientForm(handle: $handle) {",
    "    schemaVersion",
    "    definition",
    "    session {",
    "      id",
    "      currentPageId",
    "      tokens",
    "      continuation",
    "    }",
    "  }",
    "}",
  ].join("\n");
  const variables = JSON.stringify(
    {
      handle: example.handle,
    },
    null,
    2,
  );

  return [
    "import { useEffect, useState } from 'react';",
    "import {",
    "  FormieForm,",
    "  type FrontendFormEnvelope,",
    "  type FormieFieldProps,",
    "  type FormieFieldComponentProps,",
    "} from '@verbb/formie-react';",
    "",
    `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
    `const query = ${JSON.stringify(query)};`,
    `const variables = ${variables.replace(/\n/g, "\n")};`,
    "",
    "function Field({ field, children }: FormieFieldProps) {",
    "  return (",
    "    <div className='my-field'>",
    "      <label>{field.label}</label>",
    "      {children}",
    "    </div>",
    "  );",
    "}",
    "",
    "function TextField({ value, setValue }: FormieFieldComponentProps) {",
    "  return (",
    "    <input",
    "      type='text'",
    "      value={typeof value === 'string' ? value : ''}",
    "      onChange={(event) => setValue(event.target.value)}",
    "      className='my-text-input'",
    "    />",
    "  );",
    "}",
    "",
    "const [definition, setDefinition] = useState<FrontendFormEnvelope | null>(null);",
    "",
    "useEffect(() => {",
    "  void fetch(graphqlEndpoint, {",
    "    method: 'POST',",
    "    credentials: 'same-origin',",
    "    headers: {",
    "      'Content-Type': 'application/json',",
    "      Accept: 'application/json',",
    "    },",
    "    body: JSON.stringify({",
    "      query,",
    "      variables,",
    "    }),",
    "  }).then(async (response) => {",
    "    const result = await response.json();",
    "    setDefinition(result.data.formieClientForm);",
    "  });",
    "}, []);",
    "",
    "if (!definition) {",
    "  return <div>Loading...</div>;",
    "}",
    "",
    "return (",
    "  <FormieForm",
    "    source={{",
    "      definition,",
    "      transport: {",
    "        type: 'graphql',",
    "        endpoint: graphqlEndpoint,",
    `        formHandle: '${example.handle}',`,
    "      },",
    "    }}",
    "    components={{",
    "      Field,",
    "    }}",
    "    fieldComponents={{",
    "      'single-line-text': TextField,",
    "    }}",
    "  />",
    ");",
  ].join("\n");
}

function buildRestByoHtmlSnippet(example: DemoExample, scenario: RestScenario): string {
  const renderOptions = buildHtmlOptions(scenario);

  return [
    "import { useEffect, useState } from 'react';",
    "import { FormieForm, type FormEndpointPayload } from '@verbb/formie-react';",
    "",
    `const endpoint = '${FORMIE_BASE_URL}';`,
    "",
    "const [payload, setPayload] = useState<FormEndpointPayload | null>(null);",
    "",
    "useEffect(() => {",
    "  void fetch(`${endpoint}/actions/formie/server/forms/render`, {",
    "    method: 'POST',",
    "    credentials: 'same-origin',",
    "    headers: {",
    "      'Content-Type': 'application/json',",
    "    },",
    "    body: JSON.stringify({",
    `      handle: '${example.handle}',`,
    `      renderOptions: ${JSON.stringify(renderOptions, null, 6).replace(/\n/g, "\n      ")},`,
    "    }),",
    "  }).then(async (response) => {",
    "    const result = await response.json();",
    "    setPayload(result);",
    "  });",
    "}, []);",
    "",
    "if (!payload) {",
    "  return <div>Loading...</div>;",
    "}",
    "",
    'return <FormieForm source={{ payload }} />;',
  ].join("\n");
}

function buildGraphqlHtmlAppFetchSnippet(example: DemoExample, scenario: RestScenario): string {
  const query = [
    "query HtmlFormPayload($handle: String!, $input: ServerRenderPayloadInput) {",
    "  formieHtmlForm(handle: $handle, input: $input) {",
    "    html",
    "  }",
    "}",
  ].join("\n");
  const variables = JSON.stringify(
    {
      handle: example.handle,
      input: buildHtmlOptions(scenario),
    },
    null,
    2,
  );

  return [
    "import { useEffect, useState } from 'react';",
    "import { FormieForm, type FormEndpointPayload } from '@verbb/formie-react';",
    "",
    `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
    `const query = ${JSON.stringify(query)};`,
    `const variables = ${variables.replace(/\n/g, "\n")};`,
    "",
    "const [payload, setPayload] = useState<FormEndpointPayload | null>(null);",
    "",
    "useEffect(() => {",
    "  void fetch(graphqlEndpoint, {",
    "    method: 'POST',",
    "    credentials: 'same-origin',",
    "    headers: {",
    "      'Content-Type': 'application/json',",
    "      Accept: 'application/json',",
    "    },",
    "    body: JSON.stringify({",
    "      query,",
    "      variables,",
    "    }),",
    "  }).then(async (response) => {",
    "    const result = await response.json();",
    "    setPayload(result.data.formieHtmlForm);",
    "  });",
    "}, []);",
    "",
    "if (!payload) {",
    "  return <div>Loading...</div>;",
    "}",
    "",
    "return (",
    "  <FormieForm",
    "    source={{",
    "      payload,",
    "    }}",
    "  />",
    ");",
  ].join("\n");
}

export type RequestCodeMode = "formie" | "app";

export function buildStarterCodeSnippet(
  story: StarterStory,
  example: DemoExample,
  scenario: RestScenario,
  requestMode: RequestCodeMode,
): string {
  if (story.mode === "server-rendered" && story.transport === "rest") {
    return requestMode === "formie" ? buildHtmlHookSnippet(example, scenario, "rest") : buildRestByoHtmlSnippet(example, scenario);
  }

  if (story.mode === "server-rendered" && story.transport === "graphql") {
    return requestMode === "formie" ? buildHtmlHookSnippet(example, scenario, "graphql") : buildGraphqlHtmlAppFetchSnippet(example, scenario);
  }

  return buildComponentDrivenSnippet(example, story.transport);
}
