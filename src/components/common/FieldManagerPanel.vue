<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';

const props = defineProps({
  visible: { type: Boolean, default: false },
  section: { type: String, required: true },
  title: { type: String, default: 'Gérer les champs' },
  /** Champs existants (hardcodés) : { 'training.titre': 'Titre', ... } */
  fieldLabels: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:visible', 'fields-changed']);

const auth = useAuthStore();
const navConfig = useNavConfigStore();
const isSuperAdmin = computed(() => auth.isSuperAdmin);

// État local
const customFields = ref([]);
const editingKey = ref(null);
const editValue = ref('');
const editInput = ref(null);
const saving = ref(false);
const expandedKey = ref(null); // Champ dont les options sont déployées

// Liste des champs existants (à partir du prop fieldLabels)
const existingFields = computed(() => {
  return Object.entries(props.fieldLabels).map(([key, defaultLabel]) => {
    const customLabel = navConfig.config?.topNav?.labels?.[key] || navConfig.config?.labels?.[key];
    return {
      key,
      label: customLabel || defaultLabel,
      defaultLabel,
      isHidden: navConfig.isFieldHidden(key),
      isBuiltin: true,
      placeholder: navConfig.config?.placeholders?.[key] || '',
      isRequired: navConfig.isFieldRequired(key)
    };
  });
});

// Couleurs par type de champ custom
const typeColors = {
  text: '#3b82f6',
  textarea: '#8b5cf6',
  number: '#f59e0b',
  date: '#10b981',
  toggle: '#ec4899',
  select: '#6366f1'
};

const typeLabels = {
  text: 'Texte',
  textarea: 'Zone texte',
  number: 'Nombre',
  date: 'Date',
  toggle: 'Oui/Non',
  select: 'Liste'
};

// Charger les champs custom quand le panneau s'ouvre
watch(() => props.visible, (val) => {
  if (val) {
    const storeFields = navConfig.config?.customFields?.[props.section] || [];
    customFields.value = storeFields.map(f => ({
      ...f,
      isRequired: navConfig.isFieldRequired(f.key)
    }));
    editingKey.value = null;
    expandedKey.value = null;
  }
});

const close = () => {
  emit('update:visible', false);
  editingKey.value = null;
};

// === CHAMPS EXISTANTS ===

const toggleBuiltinField = async (fieldKey, isCurrentlyHidden) => {
  saving.value = true;
  if (isCurrentlyHidden) {
    await navConfig.showField(fieldKey);
  } else {
    await navConfig.hideField(fieldKey);
  }
  saving.value = false;
  emit('fields-changed');
};

const startEditBuiltin = (fieldKey, currentLabel) => {
  editingKey.value = fieldKey;
  editValue.value = currentLabel;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
};

const saveEditBuiltin = async () => {
  if (!editingKey.value) return;
  const trimmed = editValue.value.trim();
  if (trimmed) {
    saving.value = true;
    await navConfig.updateCustomLabel(editingKey.value, trimmed);
    saving.value = false;
  }
  editingKey.value = null;
};

const toggleExpanded = (key) => {
  expandedKey.value = expandedKey.value === key ? null : key;
};

const savePlaceholder = async (fieldKey, value) => {
  saving.value = true;
  await navConfig.updateFieldPlaceholder(fieldKey, value);
  saving.value = false;
};

const toggleRequired = async (fieldKey) => {
  saving.value = true;
  await navConfig.toggleFieldRequired(fieldKey);
  // Mettre à jour le champ custom local aussi
  const cf = customFields.value.find(f => f.key === fieldKey);
  if (cf) cf.isRequired = navConfig.isFieldRequired(fieldKey);
  saving.value = false;
};

// === CHAMPS CUSTOM ===

const startEditCustom = (index) => {
  const field = customFields.value[index];
  editingKey.value = field.key;
  editValue.value = field.label;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
};

const saveEditCustom = async () => {
  if (!editingKey.value) return;
  const trimmed = editValue.value.trim();
  if (trimmed) {
    const field = customFields.value.find(f => f.key === editingKey.value);
    if (field) {
      field.label = trimmed;
      saving.value = true;
      await navConfig.updateCustomFieldLabel(props.section, field.key, trimmed);
      saving.value = false;
    }
  }
  editingKey.value = null;
};

const cancelEdit = () => {
  editingKey.value = null;
};

const moveUp = (index) => {
  if (index <= 0) return;
  const temp = customFields.value[index];
  customFields.value[index] = customFields.value[index - 1];
  customFields.value[index - 1] = temp;
  saveOrder();
};

const moveDown = (index) => {
  if (index >= customFields.value.length - 1) return;
  const temp = customFields.value[index];
  customFields.value[index] = customFields.value[index + 1];
  customFields.value[index + 1] = temp;
  saveOrder();
};

const removeField = async (index) => {
  const field = customFields.value[index];
  if (!confirm(`Supprimer le champ "${field.label}" ?`)) return;
  customFields.value.splice(index, 1);
  await navConfig.removeCustomField(props.section, field.key);
  emit('fields-changed');
};

const saveOrder = async () => {
  saving.value = true;
  const orderedKeys = customFields.value.map(f => f.key);
  await navConfig.reorderCustomFields(props.section, orderedKeys);
  saving.value = false;
  emit('fields-changed');
};

const totalCount = computed(() => existingFields.value.length + customFields.value.length);
</script>

<template>
  <teleport to="body">
    <transition name="fmp-fade">
      <div v-if="visible && isSuperAdmin" class="fmp-overlay" @click.self="close">
        <transition name="fmp-slide">
          <div v-if="visible" class="fmp-panel">
            <!-- Header -->
            <div class="fmp-header">
              <div class="fmp-header-left">
                <i class="pi pi-cog fmp-header-icon"></i>
                <h3>{{ title }}</h3>
              </div>
              <button @click="close" class="fmp-close">
                <i class="pi pi-times"></i>
              </button>
            </div>

            <div class="fmp-body">
              <!-- Section : Champs existants -->
              <div v-if="existingFields.length > 0" class="fmp-section">
                <div class="fmp-section-title">Champs du formulaire</div>

                <div
                  v-for="field in existingFields"
                  :key="field.key"
                  class="fmp-field-block"
                >
                  <div class="fmp-field-item" :class="{ 'fmp-field-hidden': field.isHidden }">
                    <!-- Indicateur -->
                    <div class="fmp-color-dot" style="background-color: #94a3b8;"></div>

                    <!-- Label -->
                    <div class="fmp-field-content" v-if="editingKey === field.key">
                      <input
                        ref="editInput"
                        v-model="editValue"
                        @keydown.enter.prevent="saveEditBuiltin"
                        @keydown.escape.prevent="cancelEdit"
                        @blur="saveEditBuiltin"
                        class="fmp-edit-input"
                      />
                    </div>
                    <div class="fmp-field-content" v-else @dblclick="startEditBuiltin(field.key, field.label)">
                      <span class="fmp-field-label" :class="{ 'fmp-label-hidden': field.isHidden }">{{ field.label }}</span>
                      <span v-if="field.isRequired" class="fmp-required-badge">*</span>
                    </div>

                    <!-- Actions -->
                    <div class="fmp-field-actions">
                      <button @click="toggleExpanded(field.key)" class="fmp-action-btn" :class="{ 'fmp-action-active': expandedKey === field.key }" title="Options">
                        <i class="pi pi-sliders-h"></i>
                      </button>
                      <button @click="startEditBuiltin(field.key, field.label)" class="fmp-action-btn" title="Renommer">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button
                        @click="toggleBuiltinField(field.key, field.isHidden)"
                        class="fmp-action-btn"
                        :class="{ 'fmp-action-visible': !field.isHidden, 'fmp-action-hidden-btn': field.isHidden }"
                        :title="field.isHidden ? 'Afficher' : 'Masquer'"
                      >
                        <i :class="field.isHidden ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Options dépliées -->
                  <div v-if="expandedKey === field.key" class="fmp-field-options">
                    <div class="fmp-option-row">
                      <label class="fmp-option-label">Texte suggéré</label>
                      <input
                        type="text"
                        :value="field.placeholder"
                        @change="savePlaceholder(field.key, $event.target.value)"
                        class="fmp-option-input"
                        placeholder="Ex: Saisir le titre..."
                      />
                    </div>
                    <div class="fmp-option-row">
                      <label class="fmp-option-label">Obligatoire</label>
                      <label class="fmp-toggle">
                        <input
                          type="checkbox"
                          :checked="field.isRequired"
                          @change="toggleRequired(field.key)"
                        />
                        <span class="fmp-toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Séparateur -->
              <div v-if="existingFields.length > 0 && customFields.length > 0" class="fmp-separator"></div>

              <!-- Section : Champs personnalisés -->
              <div v-if="customFields.length > 0" class="fmp-section">
                <div class="fmp-section-title">Champs personnalisés</div>

                <div
                  v-for="(field, index) in customFields"
                  :key="field.key"
                  class="fmp-field-block"
                >
                  <div class="fmp-field-item">
                    <div class="fmp-color-dot" :style="{ backgroundColor: typeColors[field.type] || '#94a3b8' }"></div>

                    <div class="fmp-field-content" v-if="editingKey === field.key">
                      <input
                        ref="editInput"
                        v-model="editValue"
                        @keydown.enter.prevent="saveEditCustom"
                        @keydown.escape.prevent="cancelEdit"
                        @blur="saveEditCustom"
                        class="fmp-edit-input"
                      />
                    </div>
                    <div class="fmp-field-content" v-else @dblclick="startEditCustom(index)">
                      <span class="fmp-field-label">{{ field.label }}</span>
                      <span v-if="field.isRequired" class="fmp-required-badge">*</span>
                      <span class="fmp-type-badge" :style="{ color: typeColors[field.type] || '#94a3b8' }">
                        {{ typeLabels[field.type] || field.type }}
                      </span>
                    </div>

                    <div class="fmp-field-actions">
                      <button @click="toggleExpanded(field.key)" class="fmp-action-btn" :class="{ 'fmp-action-active': expandedKey === field.key }" title="Options">
                        <i class="pi pi-sliders-h"></i>
                      </button>
                      <button @click="startEditCustom(index)" class="fmp-action-btn" title="Renommer">
                        <i class="pi pi-pencil"></i>
                      </button>
                      <button @click="moveUp(index)" :disabled="index === 0" class="fmp-action-btn" title="Monter">
                        <i class="pi pi-arrow-up"></i>
                      </button>
                      <button @click="moveDown(index)" :disabled="index === customFields.length - 1" class="fmp-action-btn" title="Descendre">
                        <i class="pi pi-arrow-down"></i>
                      </button>
                      <button @click="removeField(index)" class="fmp-action-btn fmp-action-delete" title="Supprimer">
                        <i class="pi pi-trash"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Options dépliées -->
                  <div v-if="expandedKey === field.key" class="fmp-field-options">
                    <div class="fmp-option-row">
                      <label class="fmp-option-label">Texte suggéré</label>
                      <input
                        type="text"
                        :value="field.placeholder || ''"
                        @change="savePlaceholder(field.key, $event.target.value)"
                        class="fmp-option-input"
                        placeholder="Ex: Saisir une valeur..."
                      />
                    </div>
                    <div class="fmp-option-row">
                      <label class="fmp-option-label">Obligatoire</label>
                      <label class="fmp-toggle">
                        <input
                          type="checkbox"
                          :checked="field.isRequired"
                          @change="toggleRequired(field.key)"
                        />
                        <span class="fmp-toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Vide -->
              <div v-if="existingFields.length === 0 && customFields.length === 0" class="fmp-empty">
                <i class="pi pi-inbox" style="font-size: 24px; color: #cbd5e1;"></i>
                <p>Aucun champ</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="fmp-footer">
              <span v-if="saving" class="fmp-saving">
                <i class="pi pi-spin pi-spinner"></i> Sauvegarde...
              </span>
              <span v-else class="fmp-saved">
                <i class="pi pi-check"></i> {{ totalCount }} champ{{ totalCount !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.fmp-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  justify-content: flex-end;
  z-index: 9999;
}

.fmp-panel {
  width: 440px;
  max-width: 90vw;
  background: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
}

.fmp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.fmp-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fmp-header-icon {
  color: #64748b;
  font-size: 18px;
}

.fmp-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.fmp-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s;
}

.fmp-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.fmp-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.fmp-section {
  margin-bottom: 4px;
}

.fmp-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  padding: 4px 4px 8px;
}

.fmp-separator {
  border-top: 1px dashed #e2e8f0;
  margin: 12px 0;
}

.fmp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 14px;
}

.fmp-field-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  transition: box-shadow 0.15s, opacity 0.15s;
}

.fmp-field-block:has(.fmp-field-options) .fmp-field-item {
  border-radius: 10px 10px 0 0;
}

.fmp-field-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.fmp-field-hidden {
  opacity: 0.5;
  background: #f8fafc;
}

.fmp-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.fmp-field-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fmp-field-label {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fmp-label-hidden {
  text-decoration: line-through;
  color: #94a3b8;
}

.fmp-type-badge {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.fmp-edit-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.fmp-field-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.fmp-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #94a3b8;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.fmp-action-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #475569;
}

.fmp-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.fmp-action-visible:hover:not(:disabled) {
  background: #fef2f2;
  color: #ef4444;
}

.fmp-action-hidden-btn {
  color: #10b981;
}

.fmp-action-hidden-btn:hover:not(:disabled) {
  background: #ecfdf5;
  color: #059669;
}

.fmp-action-delete:hover:not(:disabled) {
  background: #fef2f2;
  color: #ef4444;
}

.fmp-action-active {
  background: #eff6ff;
  color: #3b82f6;
}

.fmp-required-badge {
  color: #ef4444;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.fmp-field-block {
  margin-bottom: 8px;
}

.fmp-field-options {
  padding: 10px 12px 10px 34px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fmp-option-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fmp-option-label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  min-width: 90px;
}

.fmp-option-input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.fmp-option-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
}

.fmp-toggle {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
}

.fmp-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.fmp-toggle-slider {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #cbd5e1;
  border-radius: 20px;
  transition: background-color 0.2s;
}

.fmp-toggle-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.fmp-toggle input:checked + .fmp-toggle-slider {
  background-color: #3b82f6;
}

.fmp-toggle input:checked + .fmp-toggle-slider::before {
  transform: translateX(16px);
}

.fmp-footer {
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
}

.fmp-saving {
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fmp-saved {
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fmp-fade-enter-active,
.fmp-fade-leave-active {
  transition: opacity 0.2s ease;
}
.fmp-fade-enter-from,
.fmp-fade-leave-to {
  opacity: 0;
}

.fmp-slide-enter-active,
.fmp-slide-leave-active {
  transition: transform 0.25s ease;
}
.fmp-slide-enter-from,
.fmp-slide-leave-to {
  transform: translateX(100%);
}
</style>
