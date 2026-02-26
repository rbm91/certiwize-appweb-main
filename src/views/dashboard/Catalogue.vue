<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTrainingStore } from '../../stores/training';
import { useAuthStore } from '../../stores/auth';
import { FORMATION_TYPES } from '../../config/constants';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Dialog from 'primevue/dialog';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

import SlowLoadingDialog from '../../components/dashboard/SlowLoadingDialog.vue';

const props = defineProps({
  tab: { type: String, default: 'formations' }
});

const trainingStore = useTrainingStore();
const authStore = useAuthStore();
const confirm = useConfirm();
const toast = useToast();

// ── State ──

const activeTab = ref(
  props.tab === 'missions' ? 2 : props.tab === 'sur-mesure' ? 1 : 0
);
const globalSearch = ref('');
const showArchived = ref(false);
const showSlowLoading = ref(false);

// ── Missions placeholder ──

const missions = ref([]);
const missionsLoading = ref(false);

// ── Computed : filtrage ──

const filteredCatalogue = computed(() => {
  const source = showArchived.value
    ? trainingStore.archivedFormations.filter(f => !f.type || f.type === 'catalogue')
    : trainingStore.catalogueFormations;

  if (!globalSearch.value) return source;
  const search = globalSearch.value.toLowerCase().trim();
  return source.filter(f => (f.title || '').toLowerCase().includes(search));
});

const filteredSurMesure = computed(() => {
  const source = showArchived.value
    ? trainingStore.archivedFormations.filter(f => f.type === 'sur_mesure')
    : trainingStore.surMesureFormations;

  if (!globalSearch.value) return source;
  const search = globalSearch.value.toLowerCase().trim();
  return source.filter(f => (f.title || '').toLowerCase().includes(search));
});

// ── Navigation ──

const goToCreateFormation = () => {
  window.location.href = '/dashboard/catalogue/create';
};

const goToCreateMission = () => {
  window.location.href = '/dashboard/catalogue/missions/create';
};

const editFormation = (id) => {
  window.location.href = `/dashboard/catalogue/edit/${id}`;
};

// ── Archive / Restore ──

const handleArchive = (formation) => {
  confirm.require({
    message: `Archiver la formation "${formation.title}" ?`,
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Archiver',
    rejectLabel: 'Annuler',
    accept: async () => {
      const result = await trainingStore.softDeleteFormation(formation.id);
      if (result.success) {
        toast.add({ severity: 'success', summary: 'Archivé', detail: 'Formation archivée avec succès.', life: 3000 });
      } else {
        toast.add({ severity: 'error', summary: 'Erreur', detail: result.error || 'Impossible d\'archiver.', life: 5000 });
      }
    }
  });
};

const handleRestore = (formation) => {
  confirm.require({
    message: `Restaurer la formation "${formation.title}" ?`,
    header: 'Confirmation',
    icon: 'pi pi-replay',
    acceptLabel: 'Restaurer',
    rejectLabel: 'Annuler',
    accept: async () => {
      const result = await trainingStore.restoreFormation(formation.id);
      if (result.success) {
        toast.add({ severity: 'success', summary: 'Restauré', detail: 'Formation restaurée avec succès.', life: 3000 });
        await trainingStore.fetchArchivedFormations();
      } else {
        toast.add({ severity: 'error', summary: 'Erreur', detail: result.error || 'Impossible de restaurer.', life: 5000 });
      }
    }
  });
};

const handleDelete = (formation) => {
  confirm.require({
    message: `Supprimer définitivement la formation "${formation.title}" ? Cette action est irréversible.`,
    header: 'Suppression',
    icon: 'pi pi-trash',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Supprimer',
    rejectLabel: 'Annuler',
    accept: async () => {
      try {
        await trainingStore.deleteFormation(formation.id);
        toast.add({ severity: 'success', summary: 'Supprimé', detail: 'Formation supprimée définitivement.', life: 3000 });
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: err.message || 'Impossible de supprimer.', life: 5000 });
      }
    }
  });
};

// ── Helpers ──

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
};

const getTypeLabel = (type) => {
  const found = FORMATION_TYPES.find(t => t.value === type);
  return found ? found.label : 'Catalogue';
};

const getTypeSeverity = (type) => {
  const found = FORMATION_TYPES.find(t => t.value === type);
  return found ? found.severity : 'info';
};

// ── PDF preview ──

const pdfDialogVisible = ref(false);
const currentPdfUrl = ref('');

const viewPdf = (pdfUrl) => {
  if (pdfUrl) {
    currentPdfUrl.value = pdfUrl;
    pdfDialogVisible.value = true;
  }
};

// ── Toggle archives ──

const toggleArchived = async () => {
  showArchived.value = !showArchived.value;
  if (showArchived.value) {
    await trainingStore.fetchArchivedFormations();
  }
};

// ── Lifecycle ──

onMounted(async () => {
  showSlowLoading.value = false;

  const slowTimer = setTimeout(() => {
    if (trainingStore.loading) {
      showSlowLoading.value = true;
    }
  }, 10000);

  try {
    await trainingStore.fetchFormations();
  } finally {
    clearTimeout(slowTimer);
    showSlowLoading.value = false;
  }
});
</script>

<template>
  <div class="p-6">
    <ConfirmDialog />
    <SlowLoadingDialog :visible="showSlowLoading" />

    <!-- En-tête -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">Catalogue</h1>
      <div class="flex gap-2">
        <Button
          v-if="activeTab !== 2"
          label="Nouveau modèle"
          icon="pi pi-plus"
          @click="goToCreateFormation"
        />
        <Button
          v-if="activeTab === 2"
          label="Nouveau modèle mission"
          icon="pi pi-plus"
          @click="goToCreateMission"
        />
      </div>
    </div>

    <!-- Barre de filtres -->
    <div class="flex flex-col lg:flex-row gap-3 mb-5">
      <div class="relative flex-1">
        <i class="pi pi-search absolute top-1/2 -translate-y-1/2 left-3 text-surface-400" />
        <InputText
          v-model="globalSearch"
          placeholder="Rechercher par titre..."
          class="w-full pl-10"
        />
      </div>
      <Button
        v-if="activeTab !== 2"
        :label="showArchived ? 'Voir actives' : 'Voir archives'"
        :icon="showArchived ? 'pi pi-eye' : 'pi pi-box'"
        :severity="showArchived ? 'warn' : 'secondary'"
        outlined
        @click="toggleArchived"
      />
    </div>

    <TabView v-model:activeIndex="activeTab">
      <!-- ============================================ -->
      <!-- TAB 1 : Formations catalogue                 -->
      <!-- ============================================ -->
      <TabPanel header="Formations catalogue">
        <DataTable
          :value="filteredCatalogue"
          :loading="trainingStore.loading"
          stripedRows
          paginator
          :rows="20"
          rowHover
          dataKey="id"
          sortField="updated_at"
          :sortOrder="-1"
        >
          <template #empty>
            <div class="flex flex-col items-center justify-center py-10 text-surface-500">
              <i class="pi pi-book text-4xl mb-3" />
              <p class="text-lg font-medium">{{ showArchived ? 'Aucune formation archivée' : 'Aucune formation catalogue' }}</p>
              <p class="text-sm mt-1">{{ showArchived ? 'Toutes les formations sont actives.' : 'Créez votre premier modèle de formation.' }}</p>
            </div>
          </template>

          <template #loading>
            <div class="flex items-center justify-center py-10 text-surface-500">
              <i class="pi pi-spin pi-spinner text-2xl mr-3" />
              Chargement des formations...
            </div>
          </template>

          <Column field="title" header="Titre" sortable style="min-width: 14rem">
            <template #body="{ data }">
              <span class="font-semibold text-surface-900 dark:text-surface-0">{{ data.title || '-' }}</span>
            </template>
          </Column>

          <Column v-if="authStore.isAdmin" header="Créé par" style="min-width: 12rem">
            <template #body="{ data }">
              <span class="text-sm text-surface-600 dark:text-surface-300">{{ data.profiles?.email || 'N/A' }}</span>
            </template>
          </Column>

          <Column header="Durée" style="min-width: 7rem">
            <template #body="{ data }">
              {{ data.content?.duree ? `${data.content.duree}h` : '-' }}
            </template>
          </Column>

          <Column field="updated_at" header="Mis à jour" sortable style="min-width: 10rem">
            <template #body="{ data }">
              {{ formatDate(data.updated_at) }}
            </template>
          </Column>

          <Column header="Actions" style="min-width: 10rem" :exportable="false">
            <template #body="{ data }">
              <div class="flex gap-1" @click.stop>
                <Button icon="pi pi-pencil" text rounded severity="info" v-tooltip.top="'Modifier'" @click="editFormation(data.id)" />
                <Button v-if="data.pdf_url" icon="pi pi-eye" text rounded severity="success" v-tooltip.top="'Aperçu PDF'" @click="viewPdf(data.pdf_url)" />
                <Button v-if="!showArchived" icon="pi pi-box" text rounded severity="warn" v-tooltip.top="'Archiver'" @click="handleArchive(data)" />
                <Button v-else icon="pi pi-replay" text rounded severity="warn" v-tooltip.top="'Restaurer'" @click="handleRestore(data)" />
                <Button icon="pi pi-trash" text rounded severity="danger" v-tooltip.top="'Supprimer'" @click="handleDelete(data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ============================================ -->
      <!-- TAB 2 : Formations sur mesure                -->
      <!-- ============================================ -->
      <TabPanel header="Formations sur mesure">
        <DataTable
          :value="filteredSurMesure"
          :loading="trainingStore.loading"
          stripedRows
          paginator
          :rows="20"
          rowHover
          dataKey="id"
          sortField="updated_at"
          :sortOrder="-1"
        >
          <template #empty>
            <div class="flex flex-col items-center justify-center py-10 text-surface-500">
              <i class="pi pi-pencil text-4xl mb-3" />
              <p class="text-lg font-medium">{{ showArchived ? 'Aucune formation sur mesure archivée' : 'Aucune formation sur mesure' }}</p>
              <p class="text-sm mt-1">{{ showArchived ? 'Toutes les formations sur mesure sont actives.' : 'Créez une formation personnalisée pour vos clients.' }}</p>
            </div>
          </template>

          <template #loading>
            <div class="flex items-center justify-center py-10 text-surface-500">
              <i class="pi pi-spin pi-spinner text-2xl mr-3" />
              Chargement des formations...
            </div>
          </template>

          <Column field="title" header="Titre" sortable style="min-width: 14rem">
            <template #body="{ data }">
              <span class="font-semibold text-surface-900 dark:text-surface-0">{{ data.title || '-' }}</span>
            </template>
          </Column>

          <Column v-if="authStore.isAdmin" header="Créé par" style="min-width: 12rem">
            <template #body="{ data }">
              <span class="text-sm text-surface-600 dark:text-surface-300">{{ data.profiles?.email || 'N/A' }}</span>
            </template>
          </Column>

          <Column header="Durée" style="min-width: 7rem">
            <template #body="{ data }">
              {{ data.content?.duree ? `${data.content.duree}h` : '-' }}
            </template>
          </Column>

          <Column field="updated_at" header="Mis à jour" sortable style="min-width: 10rem">
            <template #body="{ data }">
              {{ formatDate(data.updated_at) }}
            </template>
          </Column>

          <Column header="Actions" style="min-width: 10rem" :exportable="false">
            <template #body="{ data }">
              <div class="flex gap-1" @click.stop>
                <Button icon="pi pi-pencil" text rounded severity="info" v-tooltip.top="'Modifier'" @click="editFormation(data.id)" />
                <Button v-if="data.pdf_url" icon="pi pi-eye" text rounded severity="success" v-tooltip.top="'Aperçu PDF'" @click="viewPdf(data.pdf_url)" />
                <Button v-if="!showArchived" icon="pi pi-box" text rounded severity="warn" v-tooltip.top="'Archiver'" @click="handleArchive(data)" />
                <Button v-else icon="pi pi-replay" text rounded severity="warn" v-tooltip.top="'Restaurer'" @click="handleRestore(data)" />
                <Button icon="pi pi-trash" text rounded severity="danger" v-tooltip.top="'Supprimer'" @click="handleDelete(data)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ============================================ -->
      <!-- TAB 3 : Missions                             -->
      <!-- ============================================ -->
      <TabPanel header="Missions">
        <DataTable
          :value="missions"
          :loading="missionsLoading"
          stripedRows
          paginator
          :rows="20"
          rowHover
          dataKey="id"
        >
          <template #empty>
            <div class="flex flex-col items-center justify-center py-10 text-surface-500">
              <i class="pi pi-briefcase text-4xl mb-3" />
              <p class="text-lg font-medium">Aucune mission trouvée</p>
              <p class="text-sm mt-1">Créez votre premier modèle de mission.</p>
            </div>
          </template>

          <Column field="titre" header="Titre" sortable style="min-width: 14rem" />
          <Column field="type" header="Type" sortable style="min-width: 10rem">
            <template #body="{ data }">
              <Tag :value="data.type" :severity="data.type === 'conseil' ? 'success' : data.type === 'coaching' ? 'warn' : 'info'" />
            </template>
          </Column>
          <Column field="duree_estimee" header="Durée" style="min-width: 10rem">
            <template #body="{ data }">
              {{ data.duree_estimee ? `${data.duree_estimee} ${data.duree_unite || 'jours'}` : '-' }}
            </template>
          </Column>
          <Column field="objectifs" header="Objectif" style="min-width: 14rem">
            <template #body="{ data }">
              <span class="line-clamp-2 text-sm">{{ data.objectifs || '-' }}</span>
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>

    <!-- ====== DIALOG APERCU PDF ====== -->
    <Dialog
      v-model:visible="pdfDialogVisible"
      modal
      header="Aperçu de la formation"
      :style="{ width: '90vw', maxWidth: '1100px' }"
      :contentStyle="{ padding: 0, height: '80vh', display: 'flex', flexDirection: 'column' }"
      :dismissableMask="true"
    >
      <div class="flex flex-col h-full">
        <iframe
          :src="currentPdfUrl"
          class="w-full flex-grow border-0"
          title="Aperçu PDF"
        ></iframe>
        <div class="flex justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700">
          <a :href="currentPdfUrl" download target="_blank" rel="noopener">
            <Button label="Télécharger" icon="pi pi-download" severity="secondary" size="small" />
          </a>
          <Button label="Fermer" icon="pi pi-times" severity="secondary" size="small" @click="pdfDialogVisible = false" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
