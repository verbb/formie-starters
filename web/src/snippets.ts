import type { DemoExample, RestScenario } from './demo-data';
import {
  FORMIE_BASE_URL,
  GRAPHQL_ENDPOINT,
} from './demo-data';

export function buildWebMountSnippet(example: DemoExample, scenario: RestScenario, transport: 'rest' | 'graphql'): string {
  const endpoint = transport === 'graphql' ? GRAPHQL_ENDPOINT : FORMIE_BASE_URL;
  const lines = [
    "import { registerFormieWebComponents } from '@verbb/formie-web-components';",
    '',
    'registerFormieWebComponents();',
    '',
    "const form = document.createElement('formie-form');",
    "form.mode = 'html';",
    `form.transport = '${transport}';`,
    `form.endpoint = '${endpoint}';`,
    `form.formHandle = '${example.handle}';`,
    `form.theme = '${scenario.theme}';`,
  ];

  if (scenario.themeConfig) {
    lines.push(`form.themeConfig = ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, '\n')};`);
  }

  lines.push('', 'root.append(form);');

  return lines.join('\n');
}

export function buildWebAppFetchHtmlSnippet(example: DemoExample, scenario: RestScenario): string {
  const renderOptions: Record<string, unknown> = {
    theme: scenario.theme,
  };

  if (scenario.themeConfig) {
    renderOptions.themeConfig = scenario.themeConfig;
  }

  return [
    "import { registerFormieWebComponents } from '@verbb/formie-web-components';",
    '',
    `const endpoint = '${FORMIE_BASE_URL}';`,
    'registerFormieWebComponents();',
    '',
    "const response = await fetch(`${endpoint}/actions/formie/server/forms/render`, {",
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
    "const form = document.createElement('formie-form');",
    'form.payload = payload;',
    'root.append(form);',
  ].join('\n');
}

export function buildHtmlOptions(scenario: RestScenario): Record<string, unknown> {
  const options: Record<string, unknown> = {
    theme: scenario.theme,
  };

  if (scenario.themeConfig) {
    options.themeConfig = scenario.themeConfig;
  }

  return options;
}

export function buildGraphqlHtmlHookSnippet(example: DemoExample, scenario: RestScenario): string {
  const lines = [
    "import { registerFormieWebComponents } from '@verbb/formie-web-components';",
    '',
    'registerFormieWebComponents();',
    '',
    "const form = document.createElement('formie-form');",
    "form.mode = 'html';",
    "form.transport = 'graphql';",
    `form.endpoint = '${GRAPHQL_ENDPOINT}';`,
    `form.formHandle = '${example.handle}';`,
    `form.theme = '${scenario.theme}';`,
  ];

  if (scenario.themeConfig) {
    lines.push(`form.themeConfig = ${JSON.stringify(scenario.themeConfig, null, 2).replace(/\n/g, '\n')};`);
  }

  lines.push('', 'root.append(form);');

  return lines.join('\n');
}

export function buildGraphqlHtmlAppFetchSnippet(example: DemoExample, scenario: RestScenario): string {
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
    "import { registerFormieWebComponents } from '@verbb/formie-web-components';",
    '',
    `const graphqlEndpoint = '${GRAPHQL_ENDPOINT}';`,
    `const query = ${JSON.stringify(query)};`,
    `const variables = ${variables};`,
    'registerFormieWebComponents();',
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
    'const result = await response.json();',
    'const payload = result.data.formieHtmlForm;',
    "const form = document.createElement('formie-form');",
    'form.payload = payload;',
    'root.append(form);',
  ].join('\n');
}

const COMPONENT_CORE_CUSTOM_ELEMENTS_SNIPPET = [
  '// Custom field host: label + default slot (control is projected here) + errors.',
  'class DemoField extends HTMLElement {',
  '  constructor() {',
  '    super();',
  "    this.attachShadow({ mode: 'open' }).innerHTML = `",
  '      <style>',
  '        label { display: block; font-weight: 600; margin-bottom: 0.35rem; }',
  '        ul { margin: 0.35rem 0 0; padding-left: 1.1rem; color: #b91c1c; font-size: 0.875rem; }',
  '      </style>',
  '      <label part="label"></label>',
  '      <slot></slot>',
  '      <ul part="errors" hidden></ul>',
  '    `;',
  '    this._field = undefined;',
  '    this._errors = [];',
  '  }',
  '',
  '  get field() {',
  '    return this._field;',
  '  }',
  '',
  '  set field(v) {',
  '    this._field = v;',
  '    this.#sync();',
  '  }',
  '',
  '  get errors() {',
  '    return this._errors;',
  '  }',
  '',
  '  set errors(v) {',
  '    this._errors = Array.isArray(v) ? v : [];',
  '    this.#sync();',
  '  }',
  '',
  '  #sync() {',
  '    const root = this.shadowRoot;',
  '    if (!root) return;',
  '    const label = root.querySelector(\'[part="label"]\');',
  '    const ul = root.querySelector(\'[part="errors"]\');',
  '    const f = this._field;',
  '    if (label) {',
  '      label.textContent = f?.label != null ? String(f.label) : \'\';',
  '    }',
  '    if (ul) {',
  '      ul.hidden = !this._errors?.length;',
  "      ul.innerHTML = this._errors.map((e) => `<li>${String(e).replace(/</g, '&lt;')}</li>`).join('');",
  '    }',
  '  }',
  '}',
  '',
  '// Custom control: Formie sets field, value, disabled, …; you emit value changes on the wire-up event.',
  'class DemoTextControl extends HTMLElement {',
  '  connectedCallback() {',
  '    if (this.querySelector(\'input\')) return;',
  "    const input = document.createElement('input');",
  "    input.type = 'text';",
  "    input.addEventListener('input', () => {",
  '      this.dispatchEvent(',
  '        new CustomEvent(FORMIE_CONTROL_VALUE_EVENT, {',
  '          detail: input.value,',
  '          bubbles: true,',
  '          composed: true,',
  '        }),',
  '      );',
  '    });',
  '    this.append(input);',
  '    this.#push();',
  '  }',
  '',
  '  get value() {',
  '    return this._value;',
  '  }',
  '',
  '  set value(v) {',
  '    this._value = v;',
  '    this.#push();',
  '  }',
  '',
  '  get field() {',
  '    return this._field;',
  '  }',
  '',
  '  set field(v) {',
  '    this._field = v;',
  '    this.#push();',
  '  }',
  '',
  '  get disabled() {',
  '    return this._disabled;',
  '  }',
  '',
  '  set disabled(v) {',
  '    this._disabled = Boolean(v);',
  '    this.#push();',
  '  }',
  '',
  '  get hidden() {',
  '    return this._hidden;',
  '  }',
  '',
  '  set hidden(v) {',
  '    this._hidden = Boolean(v);',
  '    this.#push();',
  '  }',
  '',
  '  get errorKey() {',
  '    return this._errorKey;',
  '  }',
  '',
  '  set errorKey(v) {',
  '    this._errorKey = v;',
  '  }',
  '',
  '  #push() {',
  '    const input = this.querySelector(\'input\');',
  '    if (!input) return;',
  '    if (this._value !== undefined && this._value !== null) {',
  "      input.value = String(this._value);",
  '    }',
  '    input.disabled = Boolean(this._disabled);',
  '    input.hidden = Boolean(this._hidden);',
  '  }',
  '}',
  '',
  "customElements.define('demo-field', DemoField);",
  "customElements.define('demo-text-field', DemoTextControl);",
  '',
  'getFormieRegistry()',
  "  .registerField('demo-field')",
  "  .registerFieldControl('single-line-text', 'demo-text-field');",
].join('\n');

function buildComponentCoreMountSnippet(example: DemoExample, transport: 'rest' | 'graphql'): string {
  const endpoint = transport === 'graphql' ? GRAPHQL_ENDPOINT : FORMIE_BASE_URL;
  const transportLit = transport === 'graphql' ? 'graphql' : 'rest';

  return [
    "import {",
    '  registerFormieWebComponents,',
    '  getFormieRegistry,',
    '  FORMIE_CONTROL_VALUE_EVENT,',
    "} from '@verbb/formie-web-components';",
    '',
    '// Built-in custom elements (formie-core-form, formie-form, …).',
    'registerFormieWebComponents();',
    '',
    COMPONENT_CORE_CUSTOM_ELEMENTS_SNIPPET,
    '',
    "const el = document.createElement('formie-core-form');",
    `el.endpoint = '${endpoint}';`,
    `el.formHandle = '${example.handle}';`,
    `el.transport = '${transportLit}';`,
    '// el.addEventListener(\'formie:submit:result\', (e) => { … });',
    '// el.addEventListener(\'formie:client:ready\', () => { el.getFormieInstance()?.subscribe(…); });',
    'root.append(el);',
  ].join('\n');
}

export function buildComponentCoreRestSnippet(example: DemoExample): string {
  return buildComponentCoreMountSnippet(example, 'rest');
}

export function buildRestComponentAppFetchSnippet(example: DemoExample): string {
  return [
    "import {",
    '  createFrontendFormInstance,',
    '  createRestFrontendTransport,',
    '  type FrontendFormEnvelope,',
    "} from '@verbb/formie-core';",
    '',
    `const endpoint = '${FORMIE_BASE_URL}';`,
    `const handle = '${example.handle}';`,
    '',
    "const response = await fetch(`${endpoint}/actions/formie/client/forms/load`, {",
    "  method: 'POST',",
    "  credentials: 'same-origin',",
    '  headers: {',
    "    'Content-Type': 'application/json',",
    '  },',
    '  body: JSON.stringify({ handle }),',
    '});',
    '',
    'const envelope = await response.json() as FrontendFormEnvelope;',
    'const transport = createRestFrontendTransport({ endpoint, formHandle: handle });',
    'const instance = createFrontendFormInstance({ envelope, transport });',
  ].join('\n');
}

export function buildComponentCoreGraphqlSnippet(example: DemoExample): string {
  return buildComponentCoreMountSnippet(example, 'graphql');
}

export function buildFrontendContractSubmissionExample(example: DemoExample): { query: string; variables: Record<string, unknown> } {
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

export function buildGraphqlComponentUsageSnippet(example: DemoExample): string {
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
  ].join('\n');
}
