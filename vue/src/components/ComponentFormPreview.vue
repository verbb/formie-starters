<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  useSlots,
  type PropType,
} from 'vue';
import {
  FormieClientForm,
  type FormieDefinitionSource,
  type FormieFieldComponentProps,
  type FormieFieldProps,
  type FormieVueEvent,
} from '@verbb/formie-vue';

const props = defineProps<{
  handle: string;
  source: 'rest' | 'graphql';
  baseUrl: string;
  graphqlEndpoint?: string;
}>();

const emit = defineEmits<{
  runtimeEvent: [payload: { name: string; payload: unknown }];
}>();

const loadError = computed(() => {
  if (props.source === 'graphql' && !props.graphqlEndpoint) {
    return 'A GraphQL endpoint is required for the GraphQL component preview.';
  }

  return null;
});

const formSource = computed((): FormieDefinitionSource => {
  if (props.source === 'graphql') {
    return {
      transport: 'graphql',
      endpoint: props.graphqlEndpoint || '',
      formHandle: props.handle,
    };
  }

  return {
    transport: 'rest',
    endpoint: props.baseUrl,
    formHandle: props.handle,
  };
});

const StarterField = defineComponent({
  name: 'StarterField',
  props: {
    field: {
      type: Object as PropType<FormieFieldProps['field']>,
      required: true,
    },
    errors: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },
  setup(fieldProps) {
    const slots = useSlots();

    return () => {
      const isNamePartField = fieldProps.field.type === 'name-first' || fieldProps.field.type === 'name-last';

      if (isNamePartField) {
        return h('div', {
          class: 'starter-component-subfield',
        }, [
          fieldProps.field.label ? h('label', {
            class: 'starter-component-subfield-label',
          }, fieldProps.field.label) : null,
          h('div', {
            class: 'starter-component-injected-control grid gap-2 text-slate-900',
          }, slots.default?.() || []),
          fieldProps.errors.length ? h('ul', {
            class: 'grid gap-1 text-sm text-red-600',
          }, fieldProps.errors.map((error, index) => {
            return h('li', {
              key: `${fieldProps.field.id}:${error}:${index}`,
            }, error);
          })) : null,
        ]);
      }

      return h('div', {
        class: 'starter-component-card',
      }, [
        fieldProps.field.label ? h('label', {
          class: 'starter-component-label',
        }, fieldProps.field.label) : null,
        fieldProps.field.instructions ? h('p', {
          class: 'starter-component-help',
        }, fieldProps.field.instructions) : null,
        h('div', {
          class: 'starter-component-injected-control grid gap-2 text-slate-900',
        }, slots.default?.() || []),
        fieldProps.errors.length ? h('ul', {
          class: 'grid gap-1 text-sm text-red-600',
        }, fieldProps.errors.map((error, index) => {
          return h('li', {
            key: `${fieldProps.field.id}:${error}:${index}`,
          }, error);
        })) : null,
      ]);
    };
  },
});

const StarterTextField = defineComponent({
  name: 'StarterTextField',
  props: {
    field: {
      type: Object as PropType<FormieFieldComponentProps['field']>,
      required: true,
    },
    value: {
      type: null,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    setValue: {
      type: Function as PropType<FormieFieldComponentProps['setValue']>,
      required: true,
    },
  },
  setup(fieldProps) {
    return () => h('input', {
      type: 'text',
      value: typeof fieldProps.value === 'string' ? fieldProps.value : '',
      disabled: fieldProps.disabled,
      placeholder: typeof fieldProps.field.input.placeholder === 'string' ? fieldProps.field.input.placeholder : undefined,
      class: 'starter-component-control',
      onInput: (event: Event) => {
        fieldProps.setValue((event.target as HTMLInputElement).value);
      },
    });
  },
});

const components = {
  Field: StarterField,
};

const fieldComponents = {
  'single-line-text': StarterTextField,
};

function onFormEvent(event: FormieVueEvent) {
  emit('runtimeEvent', event);
}
</script>

<template>
  <div
    v-if="loadError"
    class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
  >
    {{ loadError }}
  </div>

  <FormieClientForm
    v-else
    class-name="starter-component-form"
    :source="formSource"
    :components="components"
    :field-components="fieldComponents"
    @event="onFormEvent"
  />
</template>
