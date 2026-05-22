import {
  compositePartDefinitions,
  createFrontendFormInstance,
  createGraphqlFrontendTransport,
  createRestFrontendTransport,
  FRONTEND_CLIENT_EVENT_NAMES,
  isCompositeField,
  isRepeatableField,
  loadFrontendEnvelope,
  loadGraphqlFrontendEnvelope,
} from '@verbb/formie-core';
import type {
  FrontendFieldDefinition,
  FrontendFormInstance,
  FrontendFormState,
  FrontendSubmitAction,
} from '@verbb/formie-core';

export type ComponentPreviewOptions = {
  handle: string;
  source: 'rest' | 'graphql';
  baseUrl: string;
  graphqlEndpoint?: string;
  onFormEvent?: (name: string, payload: unknown) => void;
};

export type ComponentPreviewHandle = {
  destroy(): Promise<void>;
};

function fieldsOnPage(state: FrontendFormState): FrontendFieldDefinition[] {
  const page = state.definition.pages.find((p) => {
    return p.id === state.currentPageId;
  });

  if (!page) {
    return [];
  }

  return page.rows.flatMap((row) => {
    return row.fields;
  });
}

function fieldContract(field: FrontendFieldDefinition): Record<string, unknown> {
  return field.input && typeof field.input === 'object' ? field.input as Record<string, unknown> : {};
}

function fieldPlaceholder(field: FrontendFieldDefinition): string | undefined {
  const contract = fieldContract(field);
  return typeof contract.placeholder === 'string' ? contract.placeholder : undefined;
}

function resolveRendererType(field: FrontendFieldDefinition): string {
  const contract = fieldContract(field);
  const fieldKind = typeof contract.fieldKind === 'string' ? contract.fieldKind : '';

  if (field.type === 'single-line-text' || fieldKind === 'text') {
    return 'single-line-text';
  }

  if (field.type === 'multi-line-text' || fieldKind === 'textarea') {
    return 'multi-line-text';
  }

  if (field.type === 'number' || fieldKind === 'number') {
    return 'number';
  }

  if (field.type === 'email' || fieldKind === 'email') {
    return 'email';
  }

  if (field.type === 'phone' || fieldKind === 'tel') {
    return 'phone';
  }

  return field.type;
}

function renderUnsupportedField(container: HTMLElement, field: FrontendFieldDefinition): void {
  const wrap = document.createElement('div');
  wrap.className = 'starter-core-field mb-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900';
  wrap.innerHTML = `
    <p class="font-semibold">${escapeHtml(field.label || field.handle)}</p>
    <p class="mt-1 text-xs text-amber-800">This starter preview does not render <code>${escapeHtml(field.type)}</code> yet. Use the React starter or extend this file for full parity.</p>
  `;
  container.appendChild(wrap);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function partErrors(state: FrontendFormState, parentId: string, partHandle: string): string[] {
  return state.errors.fields[`${parentId}.${partHandle}`] || [];
}

function renderPartControl(
  parentField: FrontendFieldDefinition,
  part: FrontendFieldDefinition,
  state: FrontendFormState,
  instance: FrontendFormInstance,
): HTMLElement {
  const partWrap = document.createElement('div');
  partWrap.className = 'starter-component-subfield';

  const label = document.createElement('span');
  label.className = 'starter-component-subfield-label';
  label.textContent = part.label || part.handle;
  partWrap.appendChild(label);

  const rendererType = resolveRendererType(part);
  const parentValue = state.values[parentField.id];
  const currentObject = parentValue && typeof parentValue === 'object' && !Array.isArray(parentValue)
    ? parentValue as Record<string, unknown>
    : {};

  const input = document.createElement('input');
  input.className = 'starter-component-control';
  input.disabled = state.status === 'submitting' || state.fieldStates[parentField.id]?.disabled === true || state.fieldStates[part.id]?.disabled === true;
  input.placeholder = fieldPlaceholder(part) || '';
  input.value = currentObject[part.handle] == null ? '' : String(currentObject[part.handle]);

  if (rendererType === 'email') {
    input.type = 'email';
  } else if (rendererType === 'phone') {
    input.type = 'tel';
  } else if (rendererType === 'number') {
    input.type = 'number';
  } else if (rendererType === 'date') {
    input.type = 'date';
  } else {
    input.type = 'text';
  }

  input.addEventListener('input', () => {
    const next = { ...currentObject, [part.handle]: input.value };
    instance.setValue(parentField.id, next);
  });
  partWrap.appendChild(input);

  const errs = partErrors(state, parentField.id, part.handle);
  if (errs.length) {
    const ul = document.createElement('ul');
    ul.className = 'grid gap-1 text-sm text-red-600';
    errs.forEach((er) => {
      const li = document.createElement('li');
      li.textContent = er;
      ul.appendChild(li);
    });
    partWrap.appendChild(ul);
  }

  return partWrap;
}

function renderField(
  container: HTMLElement,
  field: FrontendFieldDefinition,
  state: FrontendFormState,
  instance: FrontendFormInstance,
): void {
  const fs = state.fieldStates[field.id];
  if (fs?.hidden) {
    return;
  }

  const disabled = state.status === 'submitting' || fs?.disabled;

  if (isRepeatableField(field)) {
    renderUnsupportedField(container, field);
    return;
  }

  if (isCompositeField(field)) {
    const wrap = document.createElement('div');
    wrap.className = 'starter-component-card';
    if (field.label) {
      const lab = document.createElement('div');
      lab.className = 'starter-component-label';
      lab.textContent = field.label;
      wrap.appendChild(lab);
    }
    if (field.instructions) {
      const ins = document.createElement('p');
      ins.className = 'starter-component-help';
      ins.textContent = field.instructions;
      wrap.appendChild(ins);
    }

    const partGrid = document.createElement('div');
    partGrid.className = 'starter-core-control starter-component-name-grid';
    const parts = compositePartDefinitions(field);
    parts.forEach((part) => {
      if (state.fieldStates[part.id]?.hidden) {
        return;
      }
      partGrid.appendChild(renderPartControl(field, part, state, instance));
    });
    wrap.appendChild(partGrid);

    container.appendChild(wrap);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'starter-component-card';

  const rendererType = resolveRendererType(field);

  if (rendererType !== 'agree' && field.label) {
    const lab = document.createElement('label');
    lab.className = 'starter-component-label';
    lab.htmlFor = `field-${field.id}`;
    lab.textContent = field.label;
    wrap.appendChild(lab);
  }

  if (rendererType !== 'agree' && field.instructions) {
    const ins = document.createElement('p');
    ins.className = 'starter-component-help';
    ins.textContent = field.instructions;
    wrap.appendChild(ins);
  }

  const value = state.values[field.id];
  const errs = state.errors.fields[field.id] || [];

  const controlWrap = document.createElement('div');
  controlWrap.className = 'starter-core-control grid gap-2';

  const contract = fieldContract(field);

  if (rendererType === 'single-line-text' || rendererType === 'email' || rendererType === 'phone' || rendererType === 'number') {
    const input = document.createElement('input');
    input.id = `field-${field.id}`;
    input.className = 'starter-component-control';
    input.disabled = !!disabled;
    if (rendererType === 'email') {
      input.type = 'email';
    } else if (rendererType === 'phone') {
      input.type = 'tel';
    } else if (rendererType === 'number') {
      input.type = 'number';
    } else {
      input.type = 'text';
    }
    input.value = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    input.placeholder = fieldPlaceholder(field) || '';
    input.addEventListener('input', () => {
      if (rendererType === 'number') {
        const n = input.valueAsNumber;
        instance.setValue(field.id, Number.isFinite(n) ? n : '');
      } else {
        instance.setValue(field.id, input.value);
      }
    });
    controlWrap.appendChild(input);
  } else if (rendererType === 'multi-line-text') {
    const ta = document.createElement('textarea');
    ta.id = `field-${field.id}`;
    ta.rows = 4;
    ta.className = 'starter-component-control';
    ta.disabled = !!disabled;
    ta.placeholder = fieldPlaceholder(field) || '';
    ta.value = typeof value === 'string' ? value : '';
    ta.addEventListener('input', () => {
      instance.setValue(field.id, ta.value);
    });
    controlWrap.appendChild(ta);
  } else if (rendererType === 'dropdown') {
    const sel = document.createElement('select');
    sel.id = `field-${field.id}`;
    sel.className = 'starter-component-control';
    sel.disabled = !!disabled;
    const options = Array.isArray(contract.options) ? contract.options as Array<Record<string, unknown>> : [];
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Select…';
    sel.appendChild(empty);
    options.forEach((opt) => {
      const o = document.createElement('option');
      const v = opt.value != null ? String(opt.value) : '';
      o.value = v;
      o.textContent = typeof opt.label === 'string' ? opt.label : v;
      sel.appendChild(o);
    });
    sel.value = typeof value === 'string' ? value : '';
    sel.addEventListener('change', () => {
      instance.setValue(field.id, sel.value);
    });
    controlWrap.appendChild(sel);
  } else if (rendererType === 'checkboxes') {
    const opts = Array.isArray(contract.options) ? contract.options as Array<Record<string, unknown>> : [];
    const selected = Array.isArray(value) ? value as unknown[] : [];
    opts.forEach((opt) => {
      const v = opt.value != null ? String(opt.value) : '';
      const row = document.createElement('label');
      row.className = 'flex items-center gap-2 text-sm text-slate-800';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.disabled = !!disabled;
      cb.checked = selected.map(String).includes(v);
      cb.addEventListener('change', () => {
        const next = new Set(selected.map(String));
        if (cb.checked) {
          next.add(v);
        } else {
          next.delete(v);
        }
        instance.setValue(field.id, [...next]);
      });
      row.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = typeof opt.label === 'string' ? opt.label : v;
      row.appendChild(span);
      controlWrap.appendChild(row);
    });
  } else if (rendererType === 'radio') {
    const opts = Array.isArray(contract.options) ? contract.options as Array<Record<string, unknown>> : [];
    const current = typeof value === 'string' ? value : '';
    opts.forEach((opt) => {
      const v = opt.value != null ? String(opt.value) : '';
      const row = document.createElement('label');
      row.className = 'flex items-center gap-2 text-sm text-slate-800';
      const rb = document.createElement('input');
      rb.type = 'radio';
      rb.name = `field-${field.id}`;
      rb.disabled = !!disabled;
      rb.checked = current === v;
      rb.addEventListener('change', () => {
        if (rb.checked) {
          instance.setValue(field.id, v);
        }
      });
      row.appendChild(rb);
      const span = document.createElement('span');
      span.textContent = typeof opt.label === 'string' ? opt.label : v;
      row.appendChild(span);
      controlWrap.appendChild(row);
    });
  } else if (rendererType === 'agree') {
    const row = document.createElement('label');
    row.className = 'flex items-center gap-2 text-sm text-slate-800';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.disabled = !!disabled;
    cb.checked = value === true;
    cb.addEventListener('change', () => {
      instance.setValue(field.id, cb.checked);
    });
    row.appendChild(cb);
    const span = document.createElement('span');
    span.textContent = field.label || 'Agree';
    row.appendChild(span);
    controlWrap.appendChild(row);
  } else if (rendererType === 'date' || rendererType === 'file' || rendererType === 'signature' || rendererType === 'address' || rendererType === 'repeater') {
    renderUnsupportedField(container, field);
    return;
  } else {
    renderUnsupportedField(container, field);
    return;
  }

  wrap.appendChild(controlWrap);

  if (errs.length) {
    const ul = document.createElement('ul');
    ul.className = 'grid gap-1 text-sm text-red-600';
    errs.forEach((er) => {
      const li = document.createElement('li');
      li.textContent = er;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
  }

  container.appendChild(wrap);
}

function renderActions(
  container: HTMLElement,
  state: FrontendFormState,
  instance: FrontendFormInstance,
): void {
  const page = state.definition.pages.find((p) => {
    return p.id === state.currentPageId;
  });

  if (!page) {
    return;
  }

  const bar = document.createElement('div');
  bar.className = 'starter-core-actions flex flex-wrap gap-3 pt-2';

  page.actions.secondary.forEach((sec) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50';
    btn.textContent = sec.label;
    btn.disabled = state.status === 'submitting';
    btn.addEventListener('click', () => {
      void instance.submit(sec.type as FrontendSubmitAction);
    });
    bar.appendChild(btn);
  });

  const primary = document.createElement('button');
  primary.type = 'button';
  primary.className = 'rounded-xl border border-violet-500 bg-gradient-to-br from-violet-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:opacity-95';
  primary.textContent = page.actions.primary.label;
  primary.disabled = state.status === 'submitting';
  primary.addEventListener('click', () => {
    void instance.submit(page.actions.primary.type as FrontendSubmitAction);
  });
  bar.appendChild(primary);

  container.appendChild(bar);
}

function renderMessages(container: HTMLElement, state: FrontendFormState): void {
  const { lastSubmitResult } = state;
  if (!lastSubmitResult) {
    return;
  }

  if (lastSubmitResult.messages?.error) {
    const el = document.createElement('div');
    el.className = 'starter-core-msg starter-core-msg-error mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800';
    el.textContent = lastSubmitResult.messages.error;
    container.appendChild(el);
  }

  if (lastSubmitResult.success && lastSubmitResult.messages?.notice) {
    const el = document.createElement('div');
    el.className = 'starter-core-msg starter-core-msg-success mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800';
    el.textContent = lastSubmitResult.messages.notice;
    container.appendChild(el);
  }
}

function paintRoot(
  root: HTMLElement,
  state: FrontendFormState,
  instance: FrontendFormInstance,
): void {
  root.innerHTML = '';
  root.className = 'starter-component-form starter-core-preview text-slate-900';

  const formErrors = state.errors.form;
  if (formErrors.length) {
    const box = document.createElement('div');
    box.className = 'mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800';
    box.textContent = formErrors.join(' ');
    root.appendChild(box);
  }

  renderMessages(root, state);

  const fieldRoot = document.createElement('div');
  fieldRoot.className = 'starter-core-fields';
  fieldsOnPage(state).forEach((field) => {
    renderField(fieldRoot, field, state, instance);
  });
  root.appendChild(fieldRoot);

  renderActions(root, state, instance);

  if (state.status === 'submitting') {
    const loading = document.createElement('p');
    loading.className = 'mt-3 text-sm text-slate-500';
    loading.textContent = 'Submitting…';
    root.appendChild(loading);
  }
}

export async function mountComponentPreview(
  container: HTMLElement,
  options: ComponentPreviewOptions,
): Promise<ComponentPreviewHandle> {
  const { handle, source, baseUrl, graphqlEndpoint, onFormEvent } = options;

  if (source === 'graphql' && !graphqlEndpoint) {
    throw new Error('GraphQL endpoint is required for GraphQL component preview.');
  }

  const envelope = source === 'graphql'
    ? await loadGraphqlFrontendEnvelope({
      endpoint: graphqlEndpoint as string,
      formHandle: handle,
    })
    : await loadFrontendEnvelope({
      endpoint: baseUrl,
      formHandle: handle,
    });

  const transport = source === 'graphql'
    ? createGraphqlFrontendTransport({
      endpoint: graphqlEndpoint as string,
      formHandle: handle,
    })
    : createRestFrontendTransport({
      endpoint: baseUrl,
      formHandle: handle,
    });

  const instance = createFrontendFormInstance({
    envelope,
    transport,
  });

  const unsubs: Array<() => void> = [];

  FRONTEND_CLIENT_EVENT_NAMES.forEach((eventName: string) => {
    unsubs.push(instance.on(eventName, (payload: unknown) => {
      onFormEvent?.(eventName, payload);
    }));
  });

  unsubs.push(instance.subscribe((state) => {
    paintRoot(container, state, instance);
  }));

  return {
    async destroy() {
      unsubs.forEach((u) => {
        u();
      });
      await instance.destroy();
    },
  };
}
