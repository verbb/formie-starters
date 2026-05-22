import type { DemoExample, GraphqlDemo, RestScenario } from './demo-data';

export function buildVueUseFormieHtmlRest(example: DemoExample, scenario: RestScenario, baseUrl: string): string {
  const lines = [
    "import { useFormieHtml } from '@verbb/formie-vue';",
    '',
    'const { rootRef } = useFormieHtml({',
    "  transport: 'rest',",
    `  endpoint: '${baseUrl}',`,
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

export function buildVueUseFormieHtmlGraphql(example: DemoExample, scenario: RestScenario, graphqlEndpoint: string): string {
  const lines = [
    "import { useFormieHtml } from '@verbb/formie-vue';",
    '',
    'const { rootRef } = useFormieHtml({',
    "  transport: 'graphql',",
    `  endpoint: '${graphqlEndpoint}',`,
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

export function buildVueComponentStarterNote(example: DemoExample, baseUrl: string, source: 'rest' | 'graphql'): string {
  const transport = source === 'graphql' ? 'GraphQL' : 'REST';
  return [
    '// This Nuxt starter renders the component contract with @verbb/formie-core (createFrontendFormInstance).',
    `// ${transport}: load envelope for handle "${example.handle}" then map fields in your own Vue layer.`,
    '',
    "import { createFrontendFormInstance, loadFrontendEnvelope, createRestFrontendTransport } from '@verbb/formie-core';",
    '',
    `const envelope = await loadFrontendEnvelope({ endpoint: '${baseUrl}', formHandle: '${example.handle}' });`,
    'const transport = createRestFrontendTransport({',
    `  endpoint: '${baseUrl}',`,
    `  formHandle: '${example.handle}',`,
    '});',
    'const instance = createFrontendFormInstance({ envelope, transport });',
    '',
    '// Bind inputs with instance.setValue(fieldId, value) and instance.submit("submit" | "next" | "back").',
  ].join('\n');
}

export function buildRestByoHtmlSnippetVue(example: DemoExample, scenario: RestScenario, baseUrl: string): string {
  const renderOptions: Record<string, unknown> = {
    theme: scenario.theme,
  };

  if (scenario.themeConfig) {
    renderOptions.themeConfig = scenario.themeConfig;
  }

  return [
    "import { createVueFormieClient } from '@verbb/formie-vue';",
    '',
    `const endpoint = '${baseUrl}';`,
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

export function buildRestByoComponentSnippetVue(example: DemoExample, baseUrl: string): string {
  return [
    "import { createFrontendFormInstance, loadFrontendEnvelope, createRestFrontendTransport } from '@verbb/formie-core';",
    '',
    `const endpoint = '${baseUrl}';`,
    `const envelope = await loadFrontendEnvelope({ endpoint, formHandle: '${example.handle}' });`,
    'const transport = createRestFrontendTransport({ endpoint, formHandle: envelope.definition.handle });',
    'const instance = createFrontendFormInstance({ envelope, transport });',
    '',
    '// Render from instance.subscribe(() => ...) and bind your own Vue templates.',
  ].join('\n');
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

export function buildGraphqlUsageSnippetVue(
  example: DemoExample,
  demo: GraphqlDemo,
  scenario: RestScenario,
  graphqlEndpoint: string,
): string {
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
      "import { createVueFormieClient } from '@verbb/formie-vue';",
      '',
      `const graphqlEndpoint = '${graphqlEndpoint}';`,
      `const query = ${JSON.stringify(query)};`,
      `const variables = ${variables.replace(/\n/g, '\n')};`,
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
      'const client = createVueFormieClient();',
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
    const variables = JSON.stringify({ handle: example.handle }, null, 2);
    return [
      "import { createFrontendFormInstance, createGraphqlFrontendTransport, loadGraphqlFrontendEnvelope } from '@verbb/formie-core';",
      '',
      `const graphqlEndpoint = '${graphqlEndpoint}';`,
      `const envelope = await loadGraphqlFrontendEnvelope({ endpoint: graphqlEndpoint, formHandle: '${example.handle}' });`,
      'const transport = createGraphqlFrontendTransport({',
      '  endpoint: graphqlEndpoint,',
      `  formHandle: '${example.handle}',`,
      '});',
      'const instance = createFrontendFormInstance({ envelope, transport });',
      '',
      `// Query for reference: ${query}`,
      `// Variables: ${variables}`,
    ].join('\n');
  }

  if (demo.id === 'submit-mutation') {
    const exampleRequest = buildFrontendContractSubmissionExample(example);
    return [
      `const endpoint = '${graphqlEndpoint}';`,
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

export function graphqlCodeLanguage(demo: GraphqlDemo, requestMode: 'formie' | 'app'): 'tsx' | 'typescript' {
  if (demo.id === 'submit-mutation') {
    return 'typescript';
  }
  if (demo.id === 'html-payload' && requestMode === 'formie') {
    return 'tsx';
  }
  return 'tsx';
}

export { buildFrontendContractSubmissionExample };
