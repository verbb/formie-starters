export type EventLogEntry = {
  id: string;
  name: string;
  time: string;
  summary: string;
  detail: string;
};

export const OBSERVED_FORMIE_EVENTS = [
  'formie:mount:after',
  'formie:validator:ready',
  'formie:validator:show-error',
  'formie:page:navigate',
  'formie:page:navigate:after',
  'formie:page:navigate:error',
  'formie:submit:before',
  'formie:submit:after',
  'formie:submit:final:before',
  'formie:submit:final:after',
  'formie:submit:result',
  'formie:file-upload:uploaded',
  'formie:refresh-tokens:after',
  'formie:refresh-tokens:refreshed',
  'formie:state:reset',
] as const;

function sanitizeDetail(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      return sanitizeDetail(item);
    });
  }

  if (typeof Element !== 'undefined' && value instanceof Element) {
    return `<${value.tagName.toLowerCase()}>`;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      return [key, sanitizeDetail(item)];
    }));
  }

  return value;
}

function stringifyDetail(value: unknown): string {
  if (value == null) {
    return 'No payload';
  }

  try {
    return JSON.stringify(sanitizeDetail(value), null, 2);
  } catch {
    return String(value);
  }
}

function summarizeDetail(eventName: string, value: unknown): string {
  if (!value || typeof value !== 'object') {
    return 'No payload';
  }

  const record = value as Record<string, unknown>;
  const nested = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : null;

  if (eventName === 'formie:submit:result') {
    const ok = record.ok === true ? 'ok' : 'error';
    const code = typeof record.code === 'string' ? ` (${record.code})` : '';
    return `${ok}${code}`;
  }

  if (eventName === 'formie:file-upload:uploaded') {
    const assetIds = Array.isArray(nested?.assetIds) ? nested.assetIds.length : 0;
    return `${assetIds} uploaded asset${assetIds === 1 ? '' : 's'}`;
  }

  if (eventName.startsWith('formie:validator:show-error')) {
    return 'Validation error shown';
  }

  if (eventName.startsWith('formie:validator:clear-error')) {
    return 'Validation error cleared';
  }

  if (eventName === 'formie:state:reset') {
    return 'Form state reset';
  }

  const keys = Object.keys(record);
  return keys.length ? `Payload keys: ${keys.join(', ')}` : 'No payload';
}

export function createEventEntry(eventName: string, detail: unknown): EventLogEntry {
  return {
    id: `${eventName}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    name: eventName,
    time: new Date().toLocaleTimeString(),
    summary: summarizeDetail(eventName, detail),
    detail: stringifyDetail(detail),
  };
}
