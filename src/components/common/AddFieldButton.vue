<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';

const props = defineProps({
  section: { type: String, required: true }
});

const emit = defineEmits(['field-added', 'open-manager']);

const auth = useAuthStore();
const navConfig = useNavConfigStore();

const isSuperAdmin = computed(() => auth.isSuperAdmin);
const showDialog = ref(false);
const saving = ref(false);

const newField = ref({
  label: '',
  type: 'text',
  placeholder: '',
  options: []
});

const newOption = ref('');

const fieldTypes = [
  { label: 'Texte', value: 'text' },
  { label: 'Zone de texte', value: 'textarea' },
  { label: 'Nombre', value: 'number' },
  { label: 'Date', value: 'date' },
  { label: 'Oui / Non', value: 'toggle' },
  { label: 'Liste déroulante', value: 'select' }
];

const openDialog = () => {
  newField.value = { label: '', type: 'text', placeholder: '', options: [] };
  newOption.value = '';
  showDialog.value = true;
};

const addOption = () => {
  const opt = newOption.value.trim();
  if (!opt || newField.value.options.includes(opt)) return;
  newField.value.options.push(opt);
  newOption.value = '';
};

const removeOption = (index) => {
  newField.value.options.splice(index, 1);
};

const isValid = computed(() => {
  if (!newField.value.label.trim()) return false;
  if (newField.value.type === 'select' && newField.value.options.length < 2) return false;
  return true;
});

const addField = () => {
  if (!isValid.value) return;

  const fieldData = {
    label: newField.value.label.trim(),
    type: newField.value.type,
    placeholder: newField.value.placeholder.trim() || undefined,
    options: newField.value.type === 'select' ? [...newField.value.options] : undefined
  };
  showDialog.value = false;
  emit('field-added');

  navConfig.addCustomField(props.section, fieldData);
};
</script>

<template>
  <div v-if="isSuperAdmin" class="add-field-container">
    <button @click="openDialog" class="add-field-button">
      <i class="pi pi-plus"></i>
      Ajouter un champ
    </button>
    <button @click="$emit('open-manager')" class="add-field-button add-field-gear" title="Gérer les champs">
      <i class="pi pi-cog"></i>
    </button>

    <!-- Dialog d'ajout -->
    <teleport to="body">
      <div v-if="showDialog" class="add-field-overlay" @click.self="showDialog = false">
        <div class="add-field-dialog">
          <div class="add-field-dialog-header">
            <h3>Ajouter un champ personnalisé</h3>
            <button @click="showDialog = false" class="add-field-dialog-close">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div class="add-field-dialog-body">
            <div class="add-field-form-group">
              <label>Libellé du champ</label>
              <input
                v-model="newField.label"
                type="text"
                placeholder="Ex: Numéro de dossier"
                class="add-field-input"
                @keydown.enter="addField"
              />
            </div>

            <div class="add-field-form-group">
              <label>Type de champ</label>
              <select v-model="newField.type" class="add-field-select">
                <option v-for="t in fieldTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>

            <div class="add-field-form-group">
              <label>Texte suggéré <span class="add-field-optional">(optionnel)</span></label>
              <input
                v-model="newField.placeholder"
                type="text"
                placeholder="Ex: Saisir le numéro..."
                class="add-field-input"
              />
            </div>

            <!-- Options pour liste déroulante -->
            <div v-if="newField.type === 'select'" class="add-field-form-group">
              <label>Options de la liste <span class="add-field-required">(min. 2)</span></label>
              <div class="add-field-options-list">
                <div v-for="(opt, i) in newField.options" :key="i" class="add-field-option-item">
                  <span>{{ opt }}</span>
                  <button @click="removeOption(i)" class="add-field-option-remove" type="button">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>
              <div class="add-field-option-add">
                <input
                  v-model="newOption"
                  type="text"
                  placeholder="Nouvelle option..."
                  class="add-field-input"
                  @keydown.enter.prevent="addOption"
                />
                <button @click="addOption" :disabled="!newOption.trim()" class="add-field-option-btn" type="button">
                  <i class="pi pi-plus"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="add-field-dialog-footer">
            <button @click="showDialog = false" class="add-field-btn-cancel">Annuler</button>
            <button
              @click="addField"
              :disabled="!isValid || saving"
              class="add-field-btn-confirm"
            >
              <i v-if="saving" class="pi pi-spin pi-spinner"></i>
              <i v-else class="pi pi-plus"></i>
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.add-field-container {
  margin-top: 12px;
  display: inline-flex;
  gap: 6px;
}

.add-field-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.add-field-gear {
  padding: 6px 10px;
}

.add-field-button:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.add-field-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.add-field-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  width: 460px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.add-field-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.add-field-dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.add-field-dialog-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  padding: 4px;
}

.add-field-dialog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-field-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-field-form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.add-field-optional {
  font-weight: 400;
  color: #94a3b8;
  font-size: 12px;
}

.add-field-required {
  font-weight: 400;
  color: #f59e0b;
  font-size: 12px;
}

.add-field-input,
.add-field-select {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.add-field-input:focus,
.add-field-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.add-field-options-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.add-field-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #334155;
}

.add-field-option-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 11px;
  padding: 2px;
  transition: color 0.15s;
}

.add-field-option-remove:hover {
  color: #ef4444;
}

.add-field-option-add {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.add-field-option-add .add-field-input {
  flex: 1;
}

.add-field-option-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
  color: #3b82f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.add-field-option-btn:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #3b82f6;
}

.add-field-option-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.add-field-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
}

.add-field-btn-cancel {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
}

.add-field-btn-confirm {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.add-field-btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-field-btn-confirm:hover:not(:disabled) {
  background: #2563eb;
}
</style>
