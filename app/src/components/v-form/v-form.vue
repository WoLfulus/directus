<template>
	<div class="v-form" ref="el" :class="gridClass">
		<v-notice type="danger" v-if="unknownValidationErrors.length > 0" class="full">
			<div>
				<p>{{ t('unknown_validation_errors') }}</p>
				<ul>
					<li v-for="(validationError, index) of unknownValidationErrors" :key="index">
						<strong v-if="validationError.field">{{ validationError.field }}:</strong>
						<template v-if="validationError.code === 'RECORD_NOT_UNIQUE'">
							{{ t('validationError.unique', validationError) }}
						</template>
						<template v-else>
							{{ t(`validationError.${validationError.code}`, validationError) }}
						</template>
					</li>
				</ul>
			</div>
		</v-notice>

		<form-field
			v-for="(field, index) in formFields"
			:field="field"
			:autofocus="index === firstEditableFieldIndex && autofocus"
			:key="field.field"
			:model-value="(modelValue || {})[field.field]"
			:initial-value="(initialValues || {})[field.field]"
			:disabled="disabled"
			:batch-mode="batchMode"
			:batch-active="batchActiveFields.includes(field.field)"
			:primary-key="primaryKey"
			:loading="loading"
			:validation-error="validationErrors.find((err) => err.field === field.field)"
			@update:model-value="setValue(field, $event)"
			@unset="unsetValue(field)"
			@toggle-batch="toggleBatchField(field)"
		/>
	</div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, PropType, computed, ref, provide } from 'vue';
import { useFieldsStore } from '@/stores/';
import { Field, FieldRaw } from '@/types';
import { useElementSize } from '@/composables/use-element-size';
import { clone, cloneDeep } from 'lodash';
import { md } from '@/utils/md';
import FormField from './form-field.vue';
import useFormFields from '@/composables/use-form-fields';
import { ValidationError } from './types';
import { translate } from '@/utils/translate-object-values';

type FieldValues = {
	[field: string]: any;
};

export default defineComponent({
	emits: ['update:modelValue'],
	components: { FormField },
	props: {
		collection: {
			type: String,
			default: undefined,
		},
		fields: {
			type: Array as PropType<Field[]>,
			default: undefined,
		},
		initialValues: {
			type: Object as PropType<FieldValues>,
			default: null,
		},
		modelValue: {
			type: Object as PropType<FieldValues>,
			default: null,
		},
		loading: {
			type: Boolean,
			default: false,
		},
		batchMode: {
			type: Boolean,
			default: false,
		},
		// Note: can be null when the form is used in batch mode
		primaryKey: {
			type: [String, Number],
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		validationErrors: {
			type: Array as PropType<ValidationError[]>,
			default: () => [],
		},
		autofocus: {
			type: Boolean,
			default: false,
		},
	},
	setup(props, { emit }) {
		const { t } = useI18n();

		const el = ref<Element>();
		const fieldsStore = useFieldsStore();

		const values = computed(() => {
			return Object.assign({}, props.initialValues, props.modelValue);
		});

		const { formFields, gridClass } = useForm();
		const { toggleBatchField, batchActiveFields } = useBatch();

		const firstEditableFieldIndex = computed(() => {
			for (let i = 0; i < formFields.value.length; i++) {
				if (formFields.value[i].meta && !formFields.value[i].meta.readonly) {
					return i;
				}
			}
			return null;
		});

		/**
		 * The validation errors that don't apply to any visible fields. This can occur if an admin accidentally
		 * made a hidden field required for example. We want to show these errors at the top of the page, so the
		 * admin can be made aware
		 */
		const unknownValidationErrors = computed(() => {
			const fieldKeys = formFields.value.map((field: FieldRaw) => field.field);
			return props.validationErrors.filter((error) => fieldKeys.includes(error.field) === false);
		});

		provide('values', values);

		return {
			t,
			el,
			formFields,
			gridClass,
			values,
			setValue,
			batchActiveFields,
			toggleBatchField,
			unsetValue,
			md,
			unknownValidationErrors,
			firstEditableFieldIndex,
		};

		function useForm() {
			const fields = computed(() => {
				if (props.collection) {
					return fieldsStore.getFieldsForCollection(props.collection);
				}

				if (props.fields) {
					return props.fields;
				}

				throw new Error('[v-form]: You need to pass either the collection or fields prop.');
			});

			const { formFields } = useFormFields(fields);

			const formFieldsParsed = computed(() => {
				return translate(
					formFields.value.map((field: Field) => {
						if (
							field.schema?.has_auto_increment === true ||
							(field.schema?.is_primary_key === true && props.primaryKey !== '+')
						) {
							const fieldClone = cloneDeep(field) as any;
							if (!fieldClone.meta) fieldClone.meta = {};
							fieldClone.meta.readonly = true;
							return fieldClone;
						}

						return field;
					})
				);
			});

			const { width } = useElementSize(el);

			const gridClass = computed<string | null>(() => {
				if (el.value === null) return null;

				if (width.value > 792) {
					return 'grid with-fill';
				} else {
					return 'grid';
				}
			});

			return { formFields: formFieldsParsed, gridClass, isDisabled };

			function isDisabled(field: Field) {
				return (
					props.loading ||
					props.disabled === true ||
					field.meta?.readonly === true ||
					(props.batchMode && batchActiveFields.value.includes(field.field) === false)
				);
			}
		}

		function setValue(field: Field, value: any) {
			const edits = props.modelValue ? clone(props.modelValue) : {};
			edits[field.field] = value;
			emit('update:modelValue', edits);
		}

		function unsetValue(field: Field) {
			if (field.field in (props.modelValue || {})) {
				const newEdits = { ...props.modelValue };
				delete newEdits[field.field];
				emit('update:modelValue', newEdits);
			}
		}

		function useBatch() {
			const batchActiveFields = ref<string[]>([]);

			return { batchActiveFields, toggleBatchField };

			function toggleBatchField(field: Field) {
				if (batchActiveFields.value.includes(field.field)) {
					batchActiveFields.value = batchActiveFields.value.filter((fieldKey) => fieldKey !== field.field);

					unsetValue(field);
				} else {
					batchActiveFields.value = [...batchActiveFields.value, field.field];
					setValue(field, field.schema?.default_value);
				}
			}
		}
	},
});
</script>

<style lang="scss" scoped>
@import '@/styles/mixins/form-grid';

.v-form {
	@include form-grid;
}
</style>
