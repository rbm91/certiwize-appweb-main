<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useWorkflowConfigStore } from '../../stores/workflowConfig';

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'formation' }, // 'formation' | 'coaching' | 'conseil'
  title: { type: String, default: 'Configuration des étapes' }
});

const emit = defineEmits(['update:visible', 'steps-changed']);

const auth = useAuthStore();
const workflowConfig = useWorkflowConfigStore();
const isSuperAdmin = computed(() => auth.isSuperAdmin);

// État local
const steps = ref([]);
const editingIndex = ref(-1);
const editValue = ref('');
const editInput = ref(null);
const showAddForm = ref(false);
const newStepLabel = ref('');
const saving = ref(false);

// Couleurs pour les étapes (cycle)
const stepColors = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981',
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#06b6d4'
];

// Charger les étapes quand le panneau s'ouvre
watch(() => props.visible, async (val) => {
  if (val) {
    const storeSteps = workflowConfig.getStepperSteps(props.type);
    steps.value = storeSteps.map(s => ({ ...s }));
  }
});

const close = () => {
  emit('update:visible', false);
  editingIndex.value = -1;
  showAddForm.value = false;
};

// Déplacer une étape vers le haut
const moveUp = (index) => {
  if (index <= 0) return;
  const temp = steps.value[index];
  steps.value[index] = steps.value[index - 1];
  steps.value[index - 1] = temp;
  // Recalculer les numéros de step
  renumberSteps();
  saveSteps();
};

// Déplacer une étape vers le bas
const moveDown = (index) => {
  if (index >= steps.value.length - 1) return;
  const temp = steps.value[index];
  steps.value[index] = steps.value[index + 1];
  steps.value[index + 1] = temp;
  renumberSteps();
  saveSteps();
};

// Supprimer une étape
const removeStep = (index) => {
  if (steps.value.length <= 1) return; // garder au moins 1 étape
  if (!confirm(`Supprimer l'étape "${steps.value[index].label}" ?`)) return;
  steps.value.splice(index, 1);
  renumberSteps();
  saveSteps();
};

// Commencer l'édition du label
const startEdit = (index) => {
  editingIndex.value = index;
  editValue.value = steps.value[index].label;
  nextTick(() => {
    editInput.value?.focus();
    editInput.value?.select();
  });
};

// Sauvegarder l'édition
const saveEdit = async () => {
  if (editingIndex.value === -1) return;
  const trimmed = editValue.value.trim();
  if (trimmed) {
    steps.value[editingIndex.value].label = trimmed;
    await saveSteps();
  }
  editingIndex.value = -1;
};

// Annuler l'édition
const cancelEdit = () => {
  editingIndex.value = -1;
};

// Ajouter une nouvelle étape
const addStep = () => {
  const label = newStepLabel.value.trim();
  if (!label) return;
  steps.value.push({
    step: steps.value.length + 1,
    label,
    icon: 'pi-circle'
  });
  newStepLabel.value = '';
  showAddForm.value = false;
  saveSteps();
};

// Renuméroter les étapes
const renumberSteps = () => {
  steps.value.forEach((s, i) => {
    s.step = i + 1;
  });
};

// Sauvegarder vers le store
const saveSteps = async () => {
  saving.value = true;
  await workflowConfig.saveStepperSteps(props.type, steps.value);
  saving.value = false;
  emit('steps-changed', steps.value);
};
</script>

<template>
  <!-- Overlay -->
  <teleport to="body">
    <transition name="panel-fade">
      <div v-if="visible" class="smp-overlay" @click.self="close">
        <transition name="panel-slide">
          <div v-if="visible" class="smp-panel">
            <!-- Header -->
            <div class="smp-header">
              <div class="smp-header-left">
                <i class="pi pi-cog smp-header-icon"></i>
                <h3>{{ title }}</h3>
              </div>
              <button @click="close" class="smp-close">
                <i class="pi pi-times"></i>
              </button>
            </div>

            <!-- Liste des étapes -->
            <div class="smp-body">
              <div
                v-for="(step, index) in steps"
                :key="step.step"
                class="smp-step-item"
              >
                <!-- Drag handle -->
                <div class="smp-drag-handle">
                  <i class="pi pi-ellipsis-v"></i>
                  <i class="pi pi-ellipsis-v" style="margin-left: -6px;"></i>
                </div>

                <!-- Couleur indicateur -->
                <div class="smp-color-dot" :style="{ backgroundColor: stepColors[index % stepColors.length] }"></div>

                <!-- Label (éditable ou lecture) -->
                <div class="smp-step-content" v-if="editingIndex === index">
                  <input
                    ref="editInput"
                    v-model="editValue"
                    @keydown.enter.prevent="saveEdit"
                    @keydown.escape.prevent="cancelEdit"
                    @blur="saveEdit"
                    class="smp-edit-input"
                  />
                </div>
                <div class="smp-step-content" v-else @dblclick="startEdit(index)">
                  <span class="smp-step-label">{{ step.label }}</span>
                  <span v-if="index === 0" class="smp-default-badge">Défaut</span>
                </div>

                <!-- Actions -->
                <div class="smp-step-actions">
                  <button @click="startEdit(index)" class="smp-action-btn" title="Renommer">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button @click="moveUp(index)" :disabled="index === 0" class="smp-action-btn" title="Monter">
                    <i class="pi pi-arrow-up"></i>
                  </button>
                  <button @click="moveDown(index)" :disabled="index === steps.length - 1" class="smp-action-btn" title="Descendre">
                    <i class="pi pi-arrow-down"></i>
                  </button>
                  <button @click="removeStep(index)" :disabled="steps.length <= 1" class="smp-action-btn smp-action-delete" title="Supprimer">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Ajouter une étape -->
              <div v-if="showAddForm" class="smp-add-form">
                <input
                  v-model="newStepLabel"
                  @keydown.enter.prevent="addStep"
                  @keydown.escape.prevent="showAddForm = false"
                  placeholder="Nom de l'étape..."
                  class="smp-add-input"
                  autofocus
                />
                <div class="smp-add-actions">
                  <button @click="showAddForm = false" class="smp-add-cancel">Annuler</button>
                  <button @click="addStep" :disabled="!newStepLabel.trim()" class="smp-add-confirm">Ajouter</button>
                </div>
              </div>

              <button v-else @click="showAddForm = true" class="smp-add-btn">
                <i class="pi pi-plus"></i>
                Ajouter une étape
              </button>
            </div>

            <!-- Footer -->
            <div class="smp-footer">
              <span v-if="saving" class="smp-saving">
                <i class="pi pi-spin pi-spinner"></i> Sauvegarde...
              </span>
              <span v-else class="smp-saved">
                <i class="pi pi-check"></i> {{ steps.length }} étape{{ steps.length > 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.smp-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  justify-content: flex-end;
  z-index: 9999;
}

.smp-panel {
  width: 420px;
  max-width: 90vw;
  background: white;
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0,0,0,0.1);
}

.smp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.smp-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.smp-header-icon {
  color: #64748b;
  font-size: 18px;
}

.smp-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.smp-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.15s;
}

.smp-close:hover {
  background: #f1f5f9;
  color: #475569;
}

.smp-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.smp-step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 8px;
  background: white;
  transition: box-shadow 0.15s;
}

.smp-step-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.smp-drag-handle {
  display: flex;
  align-items: center;
  color: #cbd5e1;
  cursor: grab;
  font-size: 10px;
  flex-shrink: 0;
}

.smp-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}

.smp-step-content {
  flex: 1;
  min-width: 0;
}

.smp-step-label {
  font-size: 14px;
  color: #1e293b;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.smp-default-badge {
  display: inline-block;
  margin-left: 8px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
}

.smp-edit-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.smp-step-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.smp-action-btn {
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

.smp-action-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #475569;
}

.smp-action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.smp-action-delete:hover:not(:disabled) {
  background: #fef2f2;
  color: #ef4444;
}

.smp-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  margin-top: 4px;
}

.smp-add-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.smp-add-form {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-top: 4px;
}

.smp-add-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  margin-bottom: 8px;
}

.smp-add-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.smp-add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.smp-add-cancel {
  padding: 6px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
}

.smp-add-confirm {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.smp-add-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.smp-add-confirm:hover:not(:disabled) {
  background: #2563eb;
}

.smp-footer {
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  font-size: 13px;
}

.smp-saving {
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 6px;
}

.smp-saved {
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Transitions */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease;
}
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.25s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
