<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';

import { usePrestationsStore } from '../../stores/prestations';
import WorkflowTimeline from '../../components/dashboard/WorkflowTimeline.vue';
import {
  FORMATION_WORKFLOW_STEPS,
  PRESTATION_COLORS,
  PRESTATION_STATUTS,
} from '../../config/constants';

import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const store = usePrestationsStore();

// -- State --
const loading = ref(true);
const prestation = ref(null);
const showCloseDialog = ref(false);
const showArchiveDialog = ref(false);
const actionLoading = ref(false);

// -- Computed --
const prestationId = computed(() => route.params.id);

const displayReference = computed(() => {
  if (!prestation.value) return '';
  return prestation.value.reference || '-';
});

const displayIntitule = computed(() => {
  if (!prestation.value) return '';
  return prestation.value.intitule || 'Sans intitule';
});

const statutLabel = computed(() => {
  if (!prestation.value) return '-';
  const opt = PRESTATION_STATUTS.find(s => s.value === prestation.value.statut);
  return opt ? opt.label : prestation.value.statut || '-';
});

const statutSeverity = computed(() => {
  if (!prestation.value) return 'secondary';
  const opt = PRESTATION_STATUTS.find(s => s.value === prestation.value.statut);
  return opt ? opt.severity : 'secondary';
});

const currentStepIndex = computed(() => {
  if (!prestation.value) return 0;
  return (prestation.value.etape_courante || 1) - 1;
});

const clientName = computed(() => {
  if (!prestation.value?.client) return '-';
  return prestation.value.client.nom_affiche || prestation.value.client.raison_sociale || '-';
});

const payeurName = computed(() => {
  if (!prestation.value?.payeur) return '-';
  return prestation.value.payeur.nom_affiche || prestation.value.payeur.raison_sociale || '-';
});

const formateurName = computed(() => {
  if (!prestation.value?.formateur) return '-';
  return prestation.value.formateur.nom_affiche || '-';
});

const apprenants = computed(() => {
  if (!prestation.value?.prestation_apprenants) return [];
  return prestation.value.prestation_apprenants;
});

const documents = computed(() => {
  if (!prestation.value?.prestation_documents) return [];
  return prestation.value.prestation_documents;
});

const analyseBesoin = computed(() => {
  if (!prestation.value?.workflow_data?.analyse_besoin) return null;
  return prestation.value.workflow_data.analyse_besoin;
});

// -- Helpers --
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

const formatEur = (value) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
};

// -- Navigation --
const goBack = () => router.push({ name: 'dashboard-sessions' });
const goEdit = () => router.push({ name: 'dashboard-session-edit', params: { id: prestationId.value } });

// -- Actions --
const handleClose = async () => {
  actionLoading.value = true;
  try {
    const result = await store.closePrestation(prestationId.value);
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: 'Session cloturee',
        detail: 'La session a ete cloturee avec succes.',
        life: 3000,
      });
      showCloseDialog.value = false;
      prestation.value = await store.fetchPrestationById(prestationId.value);
    } else {
      toast.add({
        severity: 'error',
        summary: 'Cloture impossible',
        detail: result.error || 'Une erreur est survenue.',
        life: 5000,
      });
    }
  } finally {
    actionLoading.value = false;
  }
};

const handleArchive = async () => {
  actionLoading.value = true;
  try {
    const result = await store.softDeletePrestation(prestationId.value);
    if (result.success) {
      toast.add({
        severity: 'success',
        summary: 'Session archivee',
        detail: 'La session a ete archivee avec succes.',
        life: 3000,
      });
      showArchiveDialog.value = false;
      router.push({ name: 'dashboard-sessions' });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: result.error || 'Une erreur est survenue.',
        life: 5000,
      });
    }
  } finally {
    actionLoading.value = false;
  }
};

// -- Init --
onMounted(async () => {
  loading.value = true;
  try {
    const data = await store.fetchPrestationById(prestationId.value);
    prestation.value = data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="p-6">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Not found -->
    <div v-else-if="!prestation" class="text-center py-20">
      <Message severity="error" :closable="false">
        Session introuvable. L'identifiant est peut-etre invalide ou la session a ete supprimee.
      </Message>
      <Button label="Retour a la liste" icon="pi pi-arrow-left" class="mt-4" @click="goBack" />
    </div>

    <!-- Main content -->
    <template v-else>
      <!-- ====== HEADER ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3 flex-wrap">
              <span
                class="inline-block w-3 h-3 rounded-full"
                :style="{ backgroundColor: PRESTATION_COLORS.formation }"
              ></span>
              <span class="text-sm font-mono text-surface-500">{{ displayReference }}</span>
              <Tag :value="statutLabel" :severity="statutSeverity" />
            </div>
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
              {{ displayIntitule }}
            </h1>
          </div>
          <div class="flex gap-2 shrink-0">
            <Button label="Modifier" icon="pi pi-pencil" severity="info" @click="goEdit" />
            <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" outlined @click="goBack" />
          </div>
        </div>
      </div>

      <!-- ====== WORKFLOW TIMELINE ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <WorkflowTimeline :steps="FORMATION_WORKFLOW_STEPS" :currentStep="currentStepIndex" />
      </div>

      <!-- ====== INFORMATIONS GENERALES ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-4">
          <i class="pi pi-info-circle mr-2"></i>Informations generales
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <div>
            <span class="text-sm text-gray-500 block">Client</span>
            <span class="font-medium">{{ clientName }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Payeur / Financeur</span>
            <span class="font-medium">{{ payeurName }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Formateur</span>
            <span class="font-medium">{{ formateurName }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Date de debut</span>
            <span class="font-medium">{{ formatDate(prestation.date_debut) }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Date de fin</span>
            <span class="font-medium">{{ formatDate(prestation.date_fin) }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Duree</span>
            <span class="font-medium">{{ prestation.duree_heures ? prestation.duree_heures + ' h' : '-' }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Montant HT</span>
            <span class="font-medium">{{ formatEur(prestation.montant_ht) }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Etape courante</span>
            <span class="font-medium">{{ prestation.etape_courante || 1 }} / {{ FORMATION_WORKFLOW_STEPS.length }}</span>
          </div>
          <div>
            <span class="text-sm text-gray-500 block">Date de creation</span>
            <span class="font-medium">{{ formatDate(prestation.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- ====== APPRENANTS ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-4">
          <i class="pi pi-users mr-2"></i>Apprenants
          <Tag :value="String(apprenants.length)" severity="info" class="ml-2 text-xs" rounded />
        </h2>
        <DataTable
          :value="apprenants"
          :paginator="apprenants.length > 10"
          :rows="10"
          dataKey="id"
        >
          <template #empty>
            <div class="flex flex-col items-center justify-center py-8 text-surface-500">
              <i class="pi pi-users text-4xl mb-3"></i>
              <p class="text-sm">Aucun apprenant rattache a cette session.</p>
            </div>
          </template>
          <Column header="Nom" style="min-width: 14rem">
            <template #body="{ data }">
              <span class="font-medium">{{ data.apprenant?.nom_affiche || '-' }}</span>
            </template>
          </Column>
          <Column header="Email" style="min-width: 14rem">
            <template #body="{ data }">
              <span class="text-sm text-surface-500">{{ data.apprenant?.email || '-' }}</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- ====== DOCUMENTS ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-4">
          <i class="pi pi-file mr-2"></i>Documents
          <Tag :value="String(documents.length)" severity="info" class="ml-2 text-xs" rounded />
        </h2>
        <DataTable
          :value="documents"
          :paginator="documents.length > 10"
          :rows="10"
          dataKey="id"
        >
          <template #empty>
            <div class="flex flex-col items-center justify-center py-8 text-surface-500">
              <i class="pi pi-file text-4xl mb-3"></i>
              <p class="text-sm">Aucun document rattache a cette session.</p>
            </div>
          </template>
          <Column field="nom_fichier" header="Nom du fichier" sortable style="min-width: 14rem">
            <template #body="{ data }">
              <span class="font-medium">{{ data.nom_fichier || '-' }}</span>
            </template>
          </Column>
          <Column field="type_document" header="Type" sortable style="min-width: 10rem">
            <template #body="{ data }">
              <Tag :value="data.type_document || '-'" severity="info" class="text-xs" />
            </template>
          </Column>
          <Column header="Lien" style="min-width: 8rem">
            <template #body="{ data }">
              <a
                v-if="data.url_stockage"
                :href="data.url_stockage"
                target="_blank"
                class="text-primary underline text-sm"
              >
                <i class="pi pi-external-link mr-1"></i>Ouvrir
              </a>
              <span v-else class="text-surface-400 text-sm">-</span>
            </template>
          </Column>
        </DataTable>
      </div>

      <!-- ====== ANALYSE DU BESOIN ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-4">
          <i class="pi pi-search mr-2"></i>Analyse du besoin
        </h2>
        <div v-if="analyseBesoin" class="grid grid-cols-1 gap-4">
          <div v-if="analyseBesoin.contexte">
            <span class="text-sm text-gray-500 block mb-1">Contexte de la demande</span>
            <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ analyseBesoin.contexte }}</p>
          </div>
          <div v-if="analyseBesoin.objectifs">
            <span class="text-sm text-gray-500 block mb-1">Objectifs pedagogiques</span>
            <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ analyseBesoin.objectifs }}</p>
          </div>
          <div v-if="analyseBesoin.public_vise">
            <span class="text-sm text-gray-500 block mb-1">Public vise</span>
            <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ analyseBesoin.public_vise }}</p>
          </div>
          <div v-if="analyseBesoin.modalites">
            <span class="text-sm text-gray-500 block mb-1">Modalites pedagogiques</span>
            <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ analyseBesoin.modalites }}</p>
          </div>
          <div v-if="analyseBesoin.handicap_info">
            <span class="text-sm text-gray-500 block mb-1">Prise en compte du handicap</span>
            <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{{ analyseBesoin.handicap_info }}</p>
          </div>
          <div
            v-if="!analyseBesoin.contexte && !analyseBesoin.objectifs && !analyseBesoin.public_vise && !analyseBesoin.modalites && !analyseBesoin.handicap_info"
            class="text-surface-400 text-sm italic"
          >
            Aucune donnee d'analyse du besoin renseignee.
          </div>
        </div>
        <div v-else class="text-surface-400 text-sm italic">
          Aucune donnee d'analyse du besoin renseignee.
        </div>
      </div>

      <!-- ====== ACTIONS ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-4">
          <i class="pi pi-cog mr-2"></i>Actions
        </h2>
        <div class="flex flex-wrap gap-3">
          <Button
            label="Cloturer la session"
            icon="pi pi-lock"
            severity="success"
            :disabled="prestation.statut === 'terminee' || prestation.statut === 'annulee'"
            @click="showCloseDialog = true"
          />
          <Button
            label="Archiver"
            icon="pi pi-trash"
            severity="danger"
            outlined
            @click="showArchiveDialog = true"
          />
        </div>
      </div>

      <!-- ====== DIALOG : Cloture ====== -->
      <Dialog
        v-model:visible="showCloseDialog"
        header="Confirmer la cloture"
        :modal="true"
        :style="{ width: '28rem' }"
      >
        <div class="flex flex-col gap-3 pt-2">
          <p class="text-surface-600 dark:text-surface-300">
            Etes-vous sur de vouloir cloturer cette session ?
          </p>
          <p class="text-sm text-surface-400">
            La session passera au statut "Terminee". Cette action verifiera qu'aucun signal qualite
            n'est ouvert avant de proceder.
          </p>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Annuler" severity="secondary" text @click="showCloseDialog = false" />
            <Button
              label="Cloturer"
              icon="pi pi-lock"
              severity="success"
              :loading="actionLoading"
              @click="handleClose"
            />
          </div>
        </template>
      </Dialog>

      <!-- ====== DIALOG : Archiver ====== -->
      <Dialog
        v-model:visible="showArchiveDialog"
        header="Confirmer l'archivage"
        :modal="true"
        :style="{ width: '28rem' }"
      >
        <div class="flex flex-col gap-3 pt-2">
          <p class="text-surface-600 dark:text-surface-300">
            Etes-vous sur de vouloir archiver cette session ?
          </p>
          <p class="text-sm text-surface-400">
            La session sera supprimee de la liste active. Vous pourrez la retrouver dans les archives.
          </p>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button label="Annuler" severity="secondary" text @click="showArchiveDialog = false" />
            <Button
              label="Archiver"
              icon="pi pi-trash"
              severity="danger"
              :loading="actionLoading"
              @click="handleArchive"
            />
          </div>
        </template>
      </Dialog>
    </template>
  </div>
</template>
