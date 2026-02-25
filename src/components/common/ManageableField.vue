<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';

const props = defineProps({
  fieldKey: { type: String, required: true }
});

const auth = useAuthStore();
const navConfig = useNavConfigStore();

const isSuperAdmin = computed(() => auth.isSuperAdmin);
const isHidden = computed(() => navConfig.isFieldHidden(props.fieldKey));

const hideField = async () => {
  if (confirm('Masquer ce champ ? Il sera caché pour tous les utilisateurs. Vous pourrez le restaurer via le bouton "Restaurer".')) {
    await navConfig.hideField(props.fieldKey);
  }
};
</script>

<template>
  <!-- Champ masqué : rien affiché sauf indicateur pour super_admin -->
  <div v-if="isHidden && isSuperAdmin" class="manageable-field-hidden">
    <span class="manageable-field-hidden-label">
      <i class="pi pi-eye-slash"></i>
      Champ masqué
    </span>
  </div>

  <!-- Champ masqué pour user normal : rien du tout -->
  <template v-else-if="isHidden">
    <!-- masqué -->
  </template>

  <!-- Champ visible -->
  <div v-else class="manageable-field-wrapper">
    <slot />
    <button
      v-if="isSuperAdmin"
      @click.stop.prevent="hideField"
      class="manageable-field-delete"
      title="Masquer ce champ"
    >
      <i class="pi pi-times"></i>
    </button>
  </div>
</template>

<style scoped>
.manageable-field-wrapper {
  position: relative;
}

.manageable-field-wrapper:hover .manageable-field-delete {
  opacity: 1;
}

.manageable-field-delete {
  position: absolute;
  top: 0;
  right: -8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.15s, background-color 0.15s;
  font-size: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 5;
}

.manageable-field-delete:hover {
  background: #fecaca;
  opacity: 1;
}

.manageable-field-hidden {
  padding: 4px 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0.5;
  font-size: 11px;
  color: #94a3b8;
}

.manageable-field-hidden-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
