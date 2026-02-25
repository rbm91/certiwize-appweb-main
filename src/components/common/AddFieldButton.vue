<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';

const props = defineProps({
  section: { type: String, required: true }
});

const emit = defineEmits(['field-added']);

const auth = useAuthStore();
const navConfig = useNavConfigStore();

const isSuperAdmin = computed(() => auth.isSuperAdmin);
const showDialog = ref(false);
const saving = ref(false);

const newField = ref({
  label: '',
  type: 'text'
});

const fieldTypes = [
  { label: 'Texte', value: 'text' },
  { label: 'Zone de texte', value: 'textarea' },
  { label: 'Nombre', value: 'number' },
  { label: 'Date', value: 'date' },
  { label: 'Oui / Non', value: 'toggle' }
];

const openDialog = () => {
  newField.value = { label: '', type: 'text' };
  showDialog.value = true;
};

const addField = async () => {
  const label = newField.value.label.trim();
  if (!label) return;

  saving.value = true;
  await navConfig.addCustomField(props.section, {
    label,
    type: newField.value.type
  });
  saving.value = false;
  showDialog.value = false;
  emit('field-added');
};
</script>

<template>
  <div v-if="isSuperAdmin" class="add-field-container">
    <button @click="openDialog" class="add-field-button">
      <i class="pi pi-plus"></i>
      Ajouter un champ
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
          </div>

          <div class="add-field-dialog-footer">
            <button @click="showDialog = false" class="add-field-btn-cancel">Annuler</button>
            <button
              @click="addField"
              :disabled="!newField.label.trim() || saving"
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
  width: 420px;
  max-width: 90vw;
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
