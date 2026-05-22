import { useEffect, useMemo, useState } from 'react';
import {
  FormieClientForm,
  type FrontendFormEnvelope,
  type FormieFieldProps,
  type FormieFieldComponentProps,
  type FormieReactEvent,
} from '@verbb/formie-react';
import { requestGraphqlDefinitionEnvelope } from '../lib/server-payloads';

type PreviewSource = 'rest' | 'graphql';

type ComponentDrivenPreviewProps = {
  handle: string;
  source: PreviewSource;
  baseUrl: string;
  graphqlEndpoint?: string;
  onEvent?: (event: FormieReactEvent) => void;
};

function StarterField({ field, errors, children }: FormieFieldProps) {
  const isNamePartField = field.type === 'name-first' || field.type === 'name-last';

  if (isNamePartField) {
    return (
      <div className="starter-component-subfield">
        {field.label ? (
          <label className="starter-component-subfield-label">
            {field.label}
          </label>
        ) : null}

        <div className="starter-component-injected-control grid gap-2 text-slate-900">
          {children}
        </div>

        {errors.length ? (
          <ul className="grid gap-1 text-sm text-red-600">
            {errors.map((error, index) => {
              return (
                <li key={`${field.id}:${error}:${index}`}>
                  {error}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="starter-component-card">
      {field.label ? (
        <label className="starter-component-label">
          {field.label}
        </label>
      ) : null}

      {field.instructions ? (
        <p className="starter-component-help">
          {field.instructions}
        </p>
      ) : null}

      <div className="starter-component-injected-control grid gap-2 text-slate-900">
        {children}
      </div>

      {errors.length ? (
        <ul className="grid gap-1 text-sm text-red-600">
          {errors.map((error, index) => {
            return (
              <li key={`${field.id}:${error}:${index}`}>
                {error}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function StarterTextField({ field, value, disabled, setValue }: FormieFieldComponentProps) {
  return (
    <input
      type="text"
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      placeholder={typeof field.input.placeholder === 'string' ? field.input.placeholder : undefined}
      className="starter-component-control"
      onChange={(event) => {
        setValue(event.target.value);
      }}
    />
  );
}

export function ComponentDrivenPreview({
  handle,
  source,
  baseUrl,
  graphqlEndpoint,
  onEvent,
}: ComponentDrivenPreviewProps) {
  const [graphqlDefinition, setGraphqlDefinition] = useState<FrontendFormEnvelope | null>(null);
  const [graphqlError, setGraphqlError] = useState<string | null>(null);
  const formSource = useMemo(() => {
    return source === 'graphql'
      ? {
          definition: graphqlDefinition as FrontendFormEnvelope,
          transport: {
            type: 'graphql' as const,
            endpoint: graphqlEndpoint as string,
            formHandle: handle,
          },
        }
      : {
          transport: 'rest' as const,
          endpoint: baseUrl,
          formHandle: handle,
        };
  }, [baseUrl, graphqlDefinition, graphqlEndpoint, handle, source]);

  useEffect(() => {
    if (source !== 'graphql') {
      setGraphqlDefinition(null);
      setGraphqlError(null);
      return;
    }

    if (!graphqlEndpoint) {
      setGraphqlError('A GraphQL endpoint is required for the GraphQL component preview.');
      return;
    }

    let disposed = false;

    void requestGraphqlDefinitionEnvelope(graphqlEndpoint, handle)
      .then((definition) => {
        if (!disposed) {
          setGraphqlDefinition(definition);
          setGraphqlError(null);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setGraphqlError(error instanceof Error ? error.message : 'Unable to load the GraphQL component payload.');
        }
      });

    return () => {
      disposed = true;
    };
  }, [graphqlEndpoint, handle, source]);

  if (graphqlError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {graphqlError}
      </div>
    );
  }

  if (source === 'graphql' && !graphqlDefinition) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Loading component payload...
      </div>
    );
  }

  return (
    <FormieClientForm
      className="starter-component-form"
      source={formSource}
      components={{
        Field: StarterField,
      }}
      fieldComponents={{
        'single-line-text': StarterTextField,
      }}
      onEvent={onEvent}
    />
  );
}
