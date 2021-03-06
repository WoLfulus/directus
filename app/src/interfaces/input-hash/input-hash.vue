<template>
	<v-input
		:placeholder="internalPlaceholder"
		:disabled="disabled"
		:type="masked ? 'password' : 'text'"
		:model-value="localValue"
		@update:model-value="emitValue"
		:class="{ hashed: isHashed && !localValue }"
	>
		<template #append>
			<v-icon class="lock" :name="isHashed && !localValue ? 'lock' : 'lock_open'" />
		</template>
	</v-input>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import { defineComponent, computed, ref, watch } from 'vue';

export default defineComponent({
	emits: ['input'],
	props: {
		value: {
			type: String,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		placeholder: {
			type: String,
			default: null,
		},
		masked: {
			type: Boolean,
			default: false,
		},
	},
	setup(props, { emit }) {
		const { t } = useI18n();

		const isHashed = ref(false);
		const localValue = ref<string | null>(null);

		const internalPlaceholder = computed(() => {
			return isHashed.value ? t('value_hashed') : props.placeholder;
		});

		watch(
			() => props.value,
			() => {
				isHashed.value = !!(props.value && props.value.length > 0);
			},
			{ immediate: true }
		);

		return { internalPlaceholder, isHashed, localValue, emitValue };

		function emitValue(newValue: string) {
			emit('input', newValue);
			localValue.value = newValue;
		}
	},
});
</script>

<style lang="scss" scoped>
.v-input {
	--v-input-font-family: var(--family-monospace);
	--v-icon-color: var(--warning);

	&.hashed {
		--v-icon-color: var(--primary);
	}
}

.lock {
	--v-icon-color: var(--warning);
}

.hashed {
	--v-input-placeholder-color: var(--primary);
}

.hashed .lock {
	--v-icon-color: var(--primary);
}
</style>
