<script setup>
import { ref, computed, nextTick, watch } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';

const props = defineProps({
  labelKey: { type: String, required: true },
  defaultLabel: { type: String, required: true },
  tag: { type: String, default: 'span' },
  category: { type: String, default: 'other' }
});

const auth = useAuthStore();
const navConfig = useNavConfigStore();

const editing = ref(false);
const editedLabel = ref('');
const saving = ref(false);
const inputRef = ref(null);

// Label affiché : custom → default → key
const displayLabel = computed(() => {
  const custom = navConfig.config?.labels?.[props.labelKey];
  return custom || props.defaultLabel;
});

const isSuperAdmin = computed(() => auth.isSuperAdmin);
const isRequired = computed(() => navConfig.isFieldRequired(props.labelKey));

const enterEditMode = () => {
  editedLabel.value = displayLabel.value;
  editing.value = true;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
};

const save = async () => {
  if (!editing.value) return;
  const trimmed = editedLabel.value.trim();
  editing.value = false;

  // Si vide ou identique au défaut → supprimer le custom
  if (!trimmed || trimmed === props.defaultLabel) {
    if (navConfig.config?.labels?.[props.labelKey]) {
      const newConfig = JSON.parse(JSON.stringify(navConfig.config));
      delete newConfig.labels[props.labelKey];
      await navConfig.saveConfig(newConfig);
    }
    return;
  }

  // Si identique au label actuel → rien à faire
  if (trimmed === displayLabel.value) return;

  // Sauvegarder le nouveau label
  saving.value = true;
  const newConfig = JSON.parse(JSON.stringify(navConfig.config || { version: 1, topNav: { order: [], labels: {} }, sidebar: { labels: {} }, labels: {} }));
  if (!newConfig.labels) newConfig.labels = {};
  newConfig.labels[props.labelKey] = trimmed;
  await navConfig.saveConfig(newConfig);
  saving.value = false;
};

const cancel = () => {
  editing.value = false;
};
</script>

<template>
  <component :is="tag" class="editable-label-wrapper">
    <!-- Mode lecture -->
    <template v-if="!editing">
      <span class="editable-label-text">{{ displayLabel }}</span>
      <span v-if="isRequired" class="editable-label-required">*</span>
      <button
        v-if="isSuperAdmin"
        @click.stop.prevent="enterEditMode"
        class="editable-label-pencil"
        :title="`Modifier : ${displayLabel}`"
      >
        <i class="pi pi-pencil"></i>
      </button>
      <i v-if="saving" class="pi pi-spin pi-spinner editable-label-spinner"></i>
    </template>

    <!-- Mode édition -->
    <template v-else>
      <input
        ref="inputRef"
        v-model="editedLabel"
        @keydown.enter.prevent="save"
        @keydown.escape.prevent="cancel"
        class="editable-label-input"
        :style="{ width: Math.max(editedLabel.length * 8, 60) + 'px' }"
      />
      <button @click.stop.prevent="save" class="editable-label-action editable-label-save" title="Valider">
        <i class="pi pi-check"></i>
      </button>
      <button @click.stop.prevent="cancel" class="editable-label-action editable-label-cancel" title="Annuler">
        <i class="pi pi-times"></i>
      </button>
    </template>
  </component>
</template>

<style scoped>
.editable-label-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.editable-label-text {
  /* Hérite du style parent */
}

.editable-label-pencil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s, color 0.15s, background-color 0.15s;
  font-size: 11px;
  padding: 0;
  flex-shrink: 0;
}

.editable-label-wrapper:hover .editable-label-pencil {
  opacity: 1;
}

.editable-label-pencil:hover {
  color: #3b82f6;
  background-color: #eff6ff;
}

.editable-label-input {
  font: inherit;
  color: inherit;
  background: transparent;
  border: none;
  border-bottom: 2px solid #3b82f6;
  outline: none;
  padding: 0;
  min-width: 60px;
  max-width: 300px;
}

.editable-label-required {
  color: #ef4444;
  font-weight: 700;
  font-size: 1em;
  margin-left: 2px;
}

.editable-label-spinner {
  font-size: 10px;
  color: #3b82f6;
  flex-shrink: 0;
}

.editable-label-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 11px;
  padding: 0;
  flex-shrink: 0;
  transition: background-color 0.15s, color 0.15s;
}

.editable-label-save {
  background: #dcfce7;
  color: #16a34a;
}

.editable-label-save:hover {
  background: #bbf7d0;
  color: #15803d;
}

.editable-label-cancel {
  background: #fee2e2;
  color: #dc2626;
}

.editable-label-cancel:hover {
  background: #fecaca;
  color: #b91c1c;
}
</style>
