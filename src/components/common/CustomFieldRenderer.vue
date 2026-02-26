<script setup>
import { computed } from 'vue';
import { useNavConfigStore } from '../../stores/navConfig';
import { useAuthStore } from '../../stores/auth';
import EditableLabel from './EditableLabel.vue';

const props = defineProps({
  section: { type: String, required: true },
  modelValue: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue']);

const navConfig = useNavConfigStore();
const auth = useAuthStore();

const isSuperAdmin = computed(() => auth.isSuperAdmin);
const customFields = computed(() => {
  return navConfig.config?.customFields?.[props.section] || [];
});

const updateValue = (fieldKey, value) => {
  const newValues = { ...props.modelValue, [fieldKey]: value };
  emit('update:modelValue', newValues);
};

const removeField = async (fieldKey) => {
  if (confirm('Supprimer ce champ personnalisé ? Cette action est irréversible.')) {
    await navConfig.removeCustomField(props.section, fieldKey);
    const newValues = { ...props.modelValue };
    delete newValues[fieldKey];
    emit('update:modelValue', newValues);
  }
};
</script>

<template>
  <template v-for="field in customFields" :key="field.key">
    <div class="custom-field-item">
      <div class="flex flex-col gap-2">
        <EditableLabel
          :labelKey="`custom.${field.key}`"
          :defaultLabel="field.label"
          tag="label"
        />
        <span v-if="navConfig.isFieldRequired(field.key)" class="custom-field-required">* Obligatoire</span>

        <!-- Texte -->
        <input
          v-if="field.type === 'text'"
          type="text"
          :value="modelValue[field.key] || ''"
          @input="updateValue(field.key, $event.target.value)"
          class="custom-field-input"
          :placeholder="navConfig.getFieldPlaceholder(field.key, field.placeholder || field.label)"
        />

        <!-- Zone de texte -->
        <textarea
          v-else-if="field.type === 'textarea'"
          :value="modelValue[field.key] || ''"
          @input="updateValue(field.key, $event.target.value)"
          class="custom-field-textarea"
          :placeholder="navConfig.getFieldPlaceholder(field.key, field.placeholder || field.label)"
          rows="3"
        />

        <!-- Nombre -->
        <input
          v-else-if="field.type === 'number'"
          type="number"
          :value="modelValue[field.key] || ''"
          @input="updateValue(field.key, $event.target.value)"
          class="custom-field-input"
          :placeholder="navConfig.getFieldPlaceholder(field.key, field.placeholder || field.label)"
        />

        <!-- Date -->
        <input
          v-else-if="field.type === 'date'"
          type="date"
          :value="modelValue[field.key] || ''"
          @input="updateValue(field.key, $event.target.value)"
          class="custom-field-input"
        />

        <!-- Toggle Oui/Non -->
        <label v-else-if="field.type === 'toggle'" class="custom-field-toggle">
          <input
            type="checkbox"
            :checked="modelValue[field.key] || false"
            @change="updateValue(field.key, $event.target.checked)"
          />
          <span>{{ modelValue[field.key] ? 'Oui' : 'Non' }}</span>
        </label>

        <!-- Liste déroulante -->
        <select
          v-else-if="field.type === 'select'"
          :value="modelValue[field.key] || ''"
          @change="updateValue(field.key, $event.target.value)"
          class="custom-field-input"
        >
          <option value="" disabled>{{ navConfig.getFieldPlaceholder(field.key, field.placeholder || 'Choisir...') }}</option>
          <option v-for="opt in (field.options || [])" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>

      <!-- Bouton supprimer pour super_admin -->
      <button
        v-if="isSuperAdmin"
        @click="removeField(field.key)"
        class="custom-field-remove"
        title="Supprimer ce champ personnalisé"
      >
        <i class="pi pi-trash"></i>
      </button>
    </div>
  </template>
</template>

<style scoped>
.custom-field-item {
  position: relative;
  padding: 8px 0;
  border-left: 3px solid #3b82f6;
  padding-left: 12px;
  margin-top: 4px;
}

.custom-field-input,
.custom-field-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}

.custom-field-input:focus,
.custom-field-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.custom-field-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.custom-field-remove {
  position: absolute;
  top: 8px;
  right: 0;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  opacity: 0.5;
  font-size: 12px;
  padding: 4px;
  transition: opacity 0.15s;
}

.custom-field-remove:hover {
  opacity: 1;
}

.custom-field-required {
  color: #ef4444;
  font-size: 11px;
  font-weight: 500;
}
</style>
