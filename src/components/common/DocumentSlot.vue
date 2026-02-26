<script setup>
import { ref, computed } from 'vue';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../stores/auth';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import FileUpload from 'primevue/fileupload';
import InputText from 'primevue/inputtext';

const props = defineProps({
  modelValue: { type: Object, default: null },
  label: { type: String, required: true },
  slotKey: { type: String, required: true },
  accept: { type: String, default: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.jpg,.jpeg,.png' },
  maxFileSize: { type: Number, default: 10485760 }, // 10 MB
  libraryDocs: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const auth = useAuthStore();
const toast = useToast();

const uploading = ref(false);
const showLibraryDialog = ref(false);
const showUrlDialog = ref(false);
const urlInput = ref('');
const urlName = ref('');
const librarySearch = ref('');

// -- Bibliothèque filtrée --
const filteredLibraryDocs = computed(() => {
  if (!librarySearch.value) return props.libraryDocs;
  const q = librarySearch.value.toLowerCase();
  return props.libraryDocs.filter(d =>
    (d.titre || '').toLowerCase().includes(q) ||
    (d.categorie || '').toLowerCase().includes(q) ||
    (d.nom_fichier || '').toLowerCase().includes(q)
  );
});

// -- Icone selon le type de source --
const sourceIcon = computed(() => {
  if (!props.modelValue) return '';
  switch (props.modelValue.type) {
    case 'upload': return 'pi pi-upload';
    case 'library': return 'pi pi-folder-open';
    case 'url': return 'pi pi-link';
    default: return 'pi pi-file';
  }
});

const sourceLabel = computed(() => {
  if (!props.modelValue) return '';
  switch (props.modelValue.type) {
    case 'upload': return 'Fichier charg\u00e9';
    case 'library': return 'Biblioth\u00e8que';
    case 'url': return 'Lien web';
    default: return '';
  }
});

// -- Upload fichier --
const handleUpload = async (event) => {
  const file = event.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    await auth.refreshSession();
    const orgId = auth.currentOrganization?.id || 'no-org';
    const userId = auth.user?.id || 'unknown';
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${orgId}/${userId}/session-docs/${props.slotKey}-${Date.now()}-${cleanName}`;

    const { error: uploadErr } = await supabase.storage
      .from('project-docs')
      .upload(fileName, file);

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('project-docs')
      .getPublicUrl(fileName);

    emit('update:modelValue', {
      type: 'upload',
      url: urlData.publicUrl,
      nom: file.name,
    });

    toast.add({
      severity: 'success',
      summary: 'Document charg\u00e9',
      detail: `"${file.name}" a \u00e9t\u00e9 charg\u00e9 avec succ\u00e8s.`,
      life: 3000,
    });
  } catch (err) {
    console.error('[DocumentSlot] Upload error:', err);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: err.message || 'Impossible de charger le fichier.',
      life: 5000,
    });
  } finally {
    uploading.value = false;
  }
};

// -- Sélection depuis la bibliothèque --
const selectFromLibrary = (doc) => {
  emit('update:modelValue', {
    type: 'library',
    url: doc.url,
    nom: doc.titre || doc.nom_fichier || 'Document',
    library_id: doc.id,
  });
  showLibraryDialog.value = false;
  librarySearch.value = '';
};

// -- Lien web --
const openUrlDialog = () => {
  urlInput.value = props.modelValue?.type === 'url' ? props.modelValue.url : '';
  urlName.value = props.modelValue?.type === 'url' ? props.modelValue.nom : '';
  showUrlDialog.value = true;
};

const confirmUrl = () => {
  if (!urlInput.value.trim()) return;
  emit('update:modelValue', {
    type: 'url',
    url: urlInput.value.trim(),
    nom: urlName.value.trim() || urlInput.value.trim(),
  });
  showUrlDialog.value = false;
  urlInput.value = '';
  urlName.value = '';
};

// -- Supprimer --
const removeDocument = () => {
  emit('update:modelValue', null);
};

// -- Ouvrir le document --
const openDocument = () => {
  if (props.modelValue?.url) {
    window.open(props.modelValue.url, '_blank');
  }
};
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-900/30">
    <!-- Label -->
    <div class="flex items-center gap-2 mb-3">
      <i class="pi pi-paperclip text-sm text-gray-400"></i>
      <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ label }}</span>
    </div>

    <!-- Etat : document présent -->
    <template v-if="modelValue">
      <div class="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-100 dark:border-gray-700">
        <i :class="sourceIcon" class="text-blue-500 text-sm flex-shrink-0"></i>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {{ modelValue.nom }}
          </p>
          <p class="text-xs text-gray-400">{{ sourceLabel }}</p>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <Button
            icon="pi pi-external-link"
            text
            rounded
            size="small"
            severity="info"
            v-tooltip.top="'Voir le document'"
            @click="openDocument"
          />
          <Button
            icon="pi pi-times"
            text
            rounded
            size="small"
            severity="danger"
            v-tooltip.top="'Retirer'"
            @click="removeDocument"
          />
        </div>
      </div>
    </template>

    <!-- Etat : pas de document -->
    <template v-else>
      <p class="text-xs text-gray-400 dark:text-gray-500 italic mb-3">Aucun document</p>
      <div class="flex flex-wrap gap-2">
        <!-- Upload -->
        <FileUpload
          mode="basic"
          :accept="accept"
          :maxFileSize="maxFileSize"
          :auto="true"
          :disabled="uploading"
          :chooseLabel="uploading ? 'Envoi...' : 'Charger'"
          chooseIcon="pi pi-upload"
          class="p-button-sm p-button-outlined"
          @select="handleUpload"
        />
        <!-- Bibliothèque -->
        <Button
          label="Biblioth\u00e8que"
          icon="pi pi-folder-open"
          size="small"
          outlined
          :disabled="libraryDocs.length === 0"
          @click="showLibraryDialog = true"
        />
        <!-- Lien web -->
        <Button
          label="Lien web"
          icon="pi pi-link"
          size="small"
          outlined
          @click="openUrlDialog"
        />
      </div>
    </template>

    <!-- Dialog : Bibliothèque -->
    <Dialog
      v-model:visible="showLibraryDialog"
      header="Choisir un document"
      :modal="true"
      :style="{ width: '600px' }"
      :dismissableMask="true"
    >
      <div class="mb-4">
        <InputText
          v-model="librarySearch"
          placeholder="Rechercher..."
          class="w-full"
        />
      </div>
      <div v-if="filteredLibraryDocs.length === 0" class="text-center py-8 text-gray-400">
        <i class="pi pi-inbox text-3xl mb-2"></i>
        <p class="text-sm">Aucun document dans la biblioth\u00e8que.</p>
      </div>
      <div v-else class="space-y-2 max-h-80 overflow-y-auto">
        <div
          v-for="doc in filteredLibraryDocs"
          :key="doc.id"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border border-gray-100 dark:border-gray-700"
          @click="selectFromLibrary(doc)"
        >
          <i class="pi pi-file text-blue-500"></i>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ doc.titre || doc.nom_fichier }}</p>
            <p class="text-xs text-gray-400">{{ doc.categorie || 'Sans cat\u00e9gorie' }}</p>
          </div>
          <Button icon="pi pi-check" text rounded size="small" severity="success" />
        </div>
      </div>
    </Dialog>

    <!-- Dialog : Lien web -->
    <Dialog
      v-model:visible="showUrlDialog"
      header="Ajouter un lien web"
      :modal="true"
      :style="{ width: '450px' }"
      :dismissableMask="true"
    >
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">URL du document</label>
          <InputText
            v-model="urlInput"
            placeholder="https://..."
            class="w-full"
            @keydown.enter="confirmUrl"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Nom (optionnel)</label>
          <InputText
            v-model="urlName"
            placeholder="Nom du document"
            class="w-full"
            @keydown.enter="confirmUrl"
          />
        </div>
      </div>
      <template #footer>
        <Button label="Annuler" text @click="showUrlDialog = false" />
        <Button label="Confirmer" icon="pi pi-check" :disabled="!urlInput.trim()" @click="confirmUrl" />
      </template>
    </Dialog>
  </div>
</template>
