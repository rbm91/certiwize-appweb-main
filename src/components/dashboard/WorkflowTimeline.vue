<template>
  <div class="flex items-center gap-2 p-4">
    <div v-for="(step, i) in steps" :key="i" class="flex items-center gap-1">
      <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            :class="i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-blue-500 text-white' : 'bg-surface-200 text-surface-500'">
        {{ i + 1 }}
      </span>

      <!-- Mode édition inline pour super_admin -->
      <template v-if="editable && isSuperAdmin && editingIndex === i">
        <input
          ref="editInput"
          v-model="editValue"
          @keydown.enter.prevent="saveEdit(i)"
          @keydown.escape.prevent="cancelEdit"
          @blur="saveEdit(i)"
          class="text-sm border-b-2 border-blue-500 outline-none bg-transparent px-1 min-w-[60px]"
          :style="{ width: Math.max(editValue.length * 7, 60) + 'px' }"
        />
      </template>
      <template v-else>
        <span class="text-sm hidden md:inline workflow-step-label" @dblclick="startEdit(i, step.label)">
          {{ step.label }}
          <button
            v-if="editable && isSuperAdmin"
            @click.stop="startEdit(i, step.label)"
            class="workflow-step-pencil"
            title="Modifier le label"
          >
            <i class="pi pi-pencil"></i>
          </button>
        </span>
      </template>

      <i v-if="i < steps.length - 1" class="pi pi-chevron-right text-surface-300 mx-1"></i>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({
  steps: { type: Array, default: () => [] },
  currentStep: { type: Number, default: 0 },
  editable: { type: Boolean, default: false }
});

const emit = defineEmits(['step-renamed']);

const authStore = useAuthStore();
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const editingIndex = ref(-1);
const editValue = ref('');
const editInput = ref(null);

const startEdit = (index, label) => {
  if (!props.editable || !isSuperAdmin.value) return;
  editingIndex.value = index;
  editValue.value = label;
  nextTick(() => {
    editInput.value?.focus?.();
    editInput.value?.select?.();
  });
};

const saveEdit = (index) => {
  if (editingIndex.value === -1) return;
  const trimmed = editValue.value.trim();
  if (trimmed && trimmed !== props.steps[index]?.label) {
    emit('step-renamed', { index, stepNumber: props.steps[index]?.step, label: trimmed });
  }
  editingIndex.value = -1;
};

const cancelEdit = () => {
  editingIndex.value = -1;
};
</script>

<style scoped>
.workflow-step-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.workflow-step-pencil {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0.6;
  font-size: 9px;
  padding: 0;
  transition: opacity 0.15s, color 0.15s;
}

.workflow-step-pencil:hover {
  opacity: 1;
  color: #3b82f6;
}
</style>
