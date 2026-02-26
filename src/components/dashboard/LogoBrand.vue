<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useCompanyStore } from '../../stores/company';
import { supabase } from '../../supabase';

const props = defineProps({
  compact: { type: Boolean, default: false }
});

const authStore = useAuthStore();
const companyStore = useCompanyStore();
const fileInput = ref(null);
const uploading = ref(false);

const isSuperAdmin = computed(() => authStore.isSuperAdmin);
const logoUrl = computed(() => companyStore.company?.logo_url || '');

// Charger les données company si pas encore fait
onMounted(async () => {
  if (!companyStore.company) {
    await companyStore.fetchCompany();
  }
});

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  uploading.value = true;
  try {
    await authStore.refreshSession();
    const fileName = `${Date.now()}-logo-${file.name}`;
    const { error } = await supabase.storage.from('company-logos').upload(fileName, file);
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
    const newUrl = urlData.publicUrl;

    // Sauvegarder dans le company store
    await companyStore.savePartial({ logo_url: newUrl });
  } catch (err) {
    console.error('[LogoBrand] Upload error:', err);
  } finally {
    uploading.value = false;
    // Reset input pour pouvoir re-upload le même fichier
    if (fileInput.value) fileInput.value.value = '';
  }
};
</script>

<template>
  <div class="logo-brand" :class="{ 'logo-brand-compact': compact }">
    <div class="logo-brand-wrapper">
      <!-- Logo custom ou défaut -->
      <img
        v-if="logoUrl"
        :src="logoUrl"
        alt="Logo"
        class="logo-brand-img"
      />
      <img
        v-else
        src="/certigestion-logo.svg"
        alt="Certigestion"
        class="logo-brand-img"
      />

      <!-- Bouton upload (super_admin only) -->
      <button
        v-if="isSuperAdmin"
        @click.stop.prevent="triggerUpload"
        class="logo-brand-upload"
        :class="{ 'logo-brand-uploading': uploading }"
        title="Changer le logo"
      >
        <i v-if="uploading" class="pi pi-spin pi-spinner"></i>
        <i v-else class="pi pi-camera"></i>
      </button>
    </div>

    <!-- Input file caché -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleUpload"
    />
  </div>
</template>

<style scoped>
.logo-brand {
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-brand-wrapper {
  position: relative;
  display: inline-flex;
}

.logo-brand-img {
  height: 44px;
  max-width: 180px;
  object-fit: contain;
  border-radius: 6px;
}

.logo-brand-compact .logo-brand-img {
  height: 32px;
  max-width: 140px;
}

.logo-brand-upload {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #1e293b;
  background: #334155;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.logo-brand-wrapper:hover .logo-brand-upload {
  opacity: 1;
}

.logo-brand-upload:hover {
  background: #3b82f6;
  color: white;
}

.logo-brand-uploading {
  opacity: 1 !important;
  background: #3b82f6;
  color: white;
}
</style>
