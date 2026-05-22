import type { FrontendFormEnvelope } from '@verbb/formie-core';

// `credentials: 'include'` is incompatible with `Access-Control-Allow-Origin: *` (browser rule).
// Starters call Craft cross-origin from Vite; `same-origin` avoids credentialed CORS preflight failure
// and still sends cookies when the app and API share an origin.
const fetchCredentials: RequestCredentials = 'same-origin';

type GraphqlEnvelopeResponse = {
  data?: {
    formieClientForm?: FrontendFormEnvelope | null;
  };
  errors?: Array<{ message?: string }>;
};

function toServerRenderPayloadInput(input: Record<string, unknown>): Record<string, unknown> {
  const nextInput: Record<string, unknown> = {};

  ['theme', 'themeConfig', 'locale', 'siteId'].forEach((key) => {
    if (input[key] !== undefined) {
      nextInput[key] = input[key];
    }
  });

  return nextInput;
}

function buildUrl(baseUrl: string, path: string): string {
  if (!baseUrl) {
    return path;
  }
  return new URL(path, baseUrl).toString();
}

async function requestJson<T>(input: string, init: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function requestRestDefinitionEnvelope(baseUrl: string, handle: string): Promise<FrontendFormEnvelope> {
  return requestJson<FrontendFormEnvelope>(buildUrl(baseUrl, '/actions/formie/client/forms/load'), {
    method: 'POST',
    credentials: fetchCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handle,
    }),
  });
}

export async function requestRestHtmlPayload(
  baseUrl: string,
  handle: string,
  renderOptions: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(buildUrl(baseUrl, '/actions/formie/server/forms/render'), {
    method: 'POST',
    credentials: fetchCredentials,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handle,
      renderOptions,
    }),
  });
}

export async function requestGraphqlDefinitionEnvelopeResponse(graphqlEndpoint: string, handle: string): Promise<GraphqlEnvelopeResponse> {
  return requestJson<GraphqlEnvelopeResponse>(graphqlEndpoint, {
    method: 'POST',
    credentials: fetchCredentials,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
        query FrontendForm($handle: String!, $siteId: Int) {
          formieClientForm(handle: $handle, siteId: $siteId) {
            schemaVersion
            definition
            session {
              id
              currentPageId
              tokens
              continuation
            }
          }
        }
      `,
      variables: {
        handle,
      },
    }),
  });
}

export async function requestGraphqlDefinitionEnvelope(graphqlEndpoint: string, handle: string): Promise<FrontendFormEnvelope> {
  const payload = await requestGraphqlDefinitionEnvelopeResponse(graphqlEndpoint, handle);

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'GraphQL returned an error.');
  }

  if (!payload.data?.formieClientForm) {
    throw new Error('No frontend form definition was returned.');
  }

  return payload.data.formieClientForm;
}

export async function requestGraphqlHtmlPayloadResponse(
  graphqlEndpoint: string,
  handle: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(graphqlEndpoint, {
    method: 'POST',
    credentials: fetchCredentials,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: `
        query HtmlFormPayload($handle: String!, $input: ServerRenderPayloadInput) {
          formieHtmlForm(handle: $handle, input: $input) {
            html
          }
        }
      `,
      variables: {
        handle,
        input: toServerRenderPayloadInput(input),
      },
    }),
  });
}
