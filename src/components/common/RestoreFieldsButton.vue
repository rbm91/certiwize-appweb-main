<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';

const props = defineProps({
  section: { type: String, required: true },
  // Map de fieldKey → label lisible pour l'affichage
  fieldLabels: { type: Object, default: () => ({}) }
});

const auth = useAuthStore();
const navConfig = useNavConfigStore();

const isSuperAdmin = computed(() => auth.isSuperAdmin);
const showDialog = ref(false);

const hiddenFields = computed(() => {
  return navConfig.getHiddenFieldsBySection(props.section);
});

const hasHiddenFields = computed(() => hiddenFields.value.length > 0);

const getFieldLabel = (fieldKey) => {
  // Chercher dans le map fourni ou afficher la clé
  return props.fieldLabels[fieldKey] || fieldKey.split('.').pop().replace(/_/g, ' ');
};

const restoreField = async (fieldKey) => {
  await navConfig.showField(fieldKey);
};

const restoreAll = async () => {
  for (const fieldKey of hiddenFields.value) {
    await navConfig.showField(fieldKey);
  }
  showDialog.value = false;
};
</script>

<template>
  <div v-if="isSuperAdmin && hasHiddenFields" class="restore-fields-container">
    <button @click="showDialog = true" class="restore-fields-button">
      <i class="pi pi-eye"></i>
      {{ hiddenFields.length }} champ{{ hiddenFields.length > 1 ? 's' : '' }} masqué{{ hiddenFields.length > 1 ? 's' : '' }}
    </button>

    <!-- Dialog restauration -->
    <teleport to="body">
      <div v-if="showDialog" class="restore-overlay" @click.self="showDialog = false">
        <div class="restore-dialog">
          <div class="restore-dialog-header">
            <h3>Champs masqués</h3>
            <button @click="showDialog = false" class="restore-dialog-close">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div class="restore-dialog-body">
            <p class="restore-dialog-hint">Cliquez sur un champ pour le restaurer :</p>
            <div class="restore-fields-list">
              <div
                v-for="fieldKey in hiddenFields"
                :key="fieldKey"
                class="restore-field-item"
                @click="restoreField(fieldKey)"
              >
                <i class="pi pi-eye-slash"></i>
                <span>{{ getFieldLabel(fieldKey) }}</span>
                <i class="pi pi-replay restore-field-icon"></i>
              </div>
            </div>
          </div>

          <div class="restore-dialog-footer">
            <button @click="showDialog = false" class="restore-btn-cancel">Fermer</button>
            <button @click="restoreAll" class="restore-btn-all">
              <i class="pi pi-replay"></i>
              Tout restaurer
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.restore-fields-container {
  margin-top: 8px;
}

.restore-fields-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #b45309;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.restore-fields-button:hover {
  background: #fef3c7;
  border-color: #d97706;
}

.restore-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.restore-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
  width: 420px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.restore-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.restore-dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.restore-dialog-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 14px;
  padding: 4px;
}

.restore-dialog-body {
  padding: 16px 20px;
  overflow-y: auto;
}

.restore-dialog-hint {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
}

.restore-fields-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.restore-field-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #475569;
  transition: background-color 0.15s;
}

.restore-field-item:hover {
  background: #f1f5f9;
}

.restore-field-item .pi-eye-slash {
  color: #94a3b8;
  font-size: 12px;
}

.restore-field-icon {
  margin-left: auto;
  color: #3b82f6;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.15s;
}

.restore-field-item:hover .restore-field-icon {
  opacity: 1;
}

.restore-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
}

.restore-btn-cancel {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
}

.restore-btn-all {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #f59e0b;
  color: white;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.restore-btn-all:hover {
  background: #d97706;
}
</style>
