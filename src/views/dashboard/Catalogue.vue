<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTrainingStore } from '../../stores/training';
import { useAuthStore } from '../../stores/auth';
import { storeToRefs } from 'pinia';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Dialog from 'primevue/dialog';
import SlowLoadingDialog from '../../components/dashboard/SlowLoadingDialog.vue';

const props = defineProps({
  tab: {
    type: String,
    default: 'formations'
  }
});

const router = useRouter();
const trainingStore = useTrainingStore();
const authStore = useAuthStore();
const { formations, loading } = storeToRefs(trainingStore);

const showSlowLoading = ref(false);

// Active tab index: 0 = formations, 1 = missions
const activeTab = ref(props.tab === 'missions' ? 1 : 0);

// -----------------------------------------------------------
// Missions placeholder data (will be replaced by store/API)
// -----------------------------------------------------------
const missions = ref([]);
const missionsLoading = ref(false);

// -----------------------------------------------------------
// Navigation helpers
// -----------------------------------------------------------
const goToCreateFormation = () => {
  router.push('/dashboard/catalogue/create');
};

const goToCreateMission = () => {
  router.push('/dashboard/catalogue/missions/create');
};

const editFormation = (id) => {
  router.push(`/dashboard/catalogue/edit/${id}`);
};

const editMission = (id) => {
  router.push(`/dashboard/catalogue/missions/edit/${id}`);
};

// --- PDF preview dialog ---
const pdfDialogVisible = ref(false);
const currentPdfUrl = ref('');

const viewPdf = (pdfUrl) => {
  if (pdfUrl) {
    currentPdfUrl.value = pdfUrl;
    pdfDialogVisible.value = true;
  }
};

const confirmDeleteFormation = (id) => {
  if (confirm('Voulez-vous vraiment supprimer cette formation ?')) {
    trainingStore.deleteFormation(id);
  }
};

const confirmDeleteMission = (id) => {
  if (confirm('Voulez-vous vraiment supprimer cette mission ?')) {
    // placeholder — will call a mission store later
    missions.value = missions.value.filter(m => m.id !== id);
  }
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('fr-FR');
};

const missionTypeSeverity = (type) => {
  const map = { conseil: 'success', coaching: 'warning', audit: 'info' };
  return map[type] || 'secondary';
};

// -----------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------
onMounted(async () => {
  loading.value = true;
  showSlowLoading.value = false;

  const slowTimer = setTimeout(() => {
    if (loading.value) {
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
  <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
    <SlowLoadingDialog :visible="showSlowLoading" />

    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Catalogue</h1>
    </div>

    <TabView v-model:activeIndex="activeTab">
      <!-- ============================================ -->
      <!-- TAB 1 : Bibliotheque formations              -->
      <!-- ============================================ -->
      <TabPanel header="Bibliotheque formations">
        <div class="flex justify-end mb-4">
          <Button label="Nouveau modele" icon="pi pi-plus" severity="primary" @click="goToCreateFormation" />
        </div>

        <DataTable
          :value="formations"
          :loading="loading"
          paginator
          :rows="10"
          stripedRows
          tableStyle="min-width: 50rem"
          dataKey="id"
          :globalFilterFields="['title']"
        >
          <template #empty>Aucune formation trouvee.</template>
          <template #loading>Chargement des formations...</template>

          <Column field="title" header="Titre" sortable style="width: 35%"></Column>

          <Column v-if="authStore.isAdmin" header="Cree par" style="width: 15%">
            <template #body="slotProps">
              <span class="text-sm text-gray-500">{{ slotProps.data.profiles?.email || 'N/A' }}</span>
            </template>
          </Column>

          <Column field="updated_at" header="Mis a jour" sortable style="width: 20%">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.updated_at) }}
            </template>
          </Column>

          <Column field="content.duree" header="Duree" style="width: 10%">
            <template #body="slotProps">
              {{ slotProps.data.content?.duree || '-' }}
            </template>
          </Column>

          <Column header="Actions" style="width: 20%">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button icon="pi pi-pencil" text rounded severity="info" @click="editFormation(slotProps.data.id)" v-tooltip.top="'Modifier'" />
                <Button
                  v-if="slotProps.data.pdf_url"
                  icon="pi pi-eye"
                  text
                  rounded
                  severity="success"
                  @click="viewPdf(slotProps.data.pdf_url)"
                  v-tooltip.top="'Aperçu PDF'"
                />
                <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteFormation(slotProps.data.id)" v-tooltip.top="'Supprimer'" />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <!-- ============================================ -->
      <!-- TAB 2 : Bibliotheque missions                -->
      <!-- ============================================ -->
      <TabPanel header="Bibliotheque missions">
        <div class="flex justify-end mb-4">
          <Button label="Nouveau modele mission" icon="pi pi-plus" severity="primary" @click="goToCreateMission" />
        </div>

        <DataTable
          :value="missions"
          :loading="missionsLoading"
          paginator
          :rows="10"
          stripedRows
          tableStyle="min-width: 50rem"
          dataKey="id"
        >
          <template #empty>Aucune mission trouvee.</template>
          <template #loading>Chargement des missions...</template>

          <Column field="titre" header="Titre" sortable style="width: 25%"></Column>

          <Column field="type" header="Type" sortable style="width: 15%">
            <template #body="slotProps">
              <Tag :value="slotProps.data.type" :severity="missionTypeSeverity(slotProps.data.type)" />
            </template>
          </Column>

          <Column field="duree_estimee" header="Duree" style="width: 15%">
            <template #body="slotProps">
              {{ slotProps.data.duree_estimee ? `${slotProps.data.duree_estimee} ${slotProps.data.duree_unite || 'jours'}` : '-' }}
            </template>
          </Column>

          <Column field="objectifs" header="Objectif" style="width: 25%">
            <template #body="slotProps">
              <span class="line-clamp-2 text-sm">{{ slotProps.data.objectifs || '-' }}</span>
            </template>
          </Column>

          <Column header="Actions" style="width: 20%">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button icon="pi pi-pencil" text rounded severity="info" @click="editMission(slotProps.data.id)" v-tooltip.top="'Modifier'" />
                <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteMission(slotProps.data.id)" v-tooltip.top="'Supprimer'" />
              </div>
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>
  </div>

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
</template>
