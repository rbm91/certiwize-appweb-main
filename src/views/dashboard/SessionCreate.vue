<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';

import { usePrestationsStore } from '../../stores/prestations';
import { useTiersStore } from '../../stores/tiers';
import WorkflowTimeline from '../../components/dashboard/WorkflowTimeline.vue';
import { FORMATION_WORKFLOW_STEPS } from '../../config/constants';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Calendar from 'primevue/calendar';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const store = usePrestationsStore();
const tiersStore = useTiersStore();

// -- Edit mode --
const editId = computed(() => route.params.id || null);
const isEdit = computed(() => !!editId.value);
const loading = ref(false);
const saving = ref(false);

// -- Workflow step --
const currentStep = ref(1);
const totalSteps = FORMATION_WORKFLOW_STEPS.length;

// -- Form data --
const form = ref({
  // Step 1 - Identification
  intitule: '',
  client_id: null,
  payeur_id: null,
  formateur_id: null,
  apprenants: [],
  date_debut: null,
  date_fin: null,
  duree_heures: null,
  montant_ht: null,

  // Step 2 - Analyse du besoin
  contexte: '',
  objectifs: '',
  public_vise: '',
  modalites: '',
  handicap_info: '',

  // Step 3-8 stored as workflow_data
  workflow_data: {},
});

// -- Tiers options --
const clientOptions = computed(() =>
  tiersStore.tiersByRole('client').map(t => ({
    label: t.nom_affiche || t.raison_sociale || t.email,
    value: t.id,
  }))
);

const financeurOptions = computed(() => {
  const clients = tiersStore.tiersByRole('client');
  const partenaires = tiersStore.tiersByRole('partenaire');
  return [...clients, ...partenaires].map(t => ({
    label: t.nom_affiche || t.raison_sociale || t.email,
    value: t.id,
  }));
});

const formateurOptions = computed(() =>
  tiersStore.tiersByRole('formateur').map(t => ({
    label: t.nom_affiche || t.email,
    value: t.id,
  }))
);

const apprenantOptions = computed(() =>
  tiersStore.tiersByRole('apprenant').map(t => ({
    label: t.nom_affiche || t.email,
    value: t.id,
  }))
);

// -- Navigation --
const goBack = () => router.push({ name: 'dashboard-sessions' });

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--;
};

const nextStep = () => {
  if (currentStep.value < totalSteps) currentStep.value++;
};

// -- Save --
const handleSave = async () => {
  saving.value = true;
  try {
    const payload = {
      type: 'formation',
      intitule: form.value.intitule,
      client_id: form.value.client_id,
      payeur_id: form.value.payeur_id,
      formateur_id: form.value.formateur_id,
      date_debut: form.value.date_debut ? new Date(form.value.date_debut).toISOString() : null,
      date_fin: form.value.date_fin ? new Date(form.value.date_fin).toISOString() : null,
      duree_heures: form.value.duree_heures,
      montant_ht: form.value.montant_ht,
      etape_courante: currentStep.value,
      workflow_data: {
        ...form.value.workflow_data,
        analyse_besoin: {
          contexte: form.value.contexte,
          objectifs: form.value.objectifs,
          public_vise: form.value.public_vise,
          modalites: form.value.modalites,
          handicap_info: form.value.handicap_info,
        },
      },
    };

    let result;
    if (isEdit.value) {
      result = await store.updatePrestation(editId.value, payload);
    } else {
      result = await store.createPrestation(payload);
    }

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: isEdit.value ? 'Session mise a jour' : 'Session creee',
        detail: `La session "${form.value.intitule}" a ete ${isEdit.value ? 'mise a jour' : 'creee'} avec succes.`,
        life: 3000,
      });

      // Add apprenants if creation
      if (!isEdit.value && result.data?.id && form.value.apprenants.length > 0) {
        for (const appId of form.value.apprenants) {
          await store.addApprenant(result.data.id, appId);
        }
      }

      router.push({ name: 'dashboard-session-view', params: { id: result.data?.id || editId.value } });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: result.error || 'Une erreur est survenue lors de la sauvegarde.',
        life: 5000,
      });
    }
  } finally {
    saving.value = false;
  }
};

// -- Load existing data --
onMounted(async () => {
  loading.value = true;
  try {
    if (tiersStore.activeTiers.length === 0) {
      await tiersStore.fetchTiers();
    }

    if (isEdit.value) {
      const data = await store.fetchPrestationById(editId.value);
      if (data) {
        form.value.intitule = data.intitule || '';
        form.value.client_id = data.client_id;
        form.value.payeur_id = data.payeur_id;
        form.value.formateur_id = data.formateur_id;
        form.value.date_debut = data.date_debut ? new Date(data.date_debut) : null;
        form.value.date_fin = data.date_fin ? new Date(data.date_fin) : null;
        form.value.duree_heures = data.duree_heures;
        form.value.montant_ht = data.montant_ht;
        form.value.workflow_data = data.workflow_data || {};
        currentStep.value = data.etape_courante || 1;

        // Restore analyse besoin
        const ab = data.workflow_data?.analyse_besoin || {};
        form.value.contexte = ab.contexte || '';
        form.value.objectifs = ab.objectifs || '';
        form.value.public_vise = ab.public_vise || '';
        form.value.modalites = ab.modalites || '';
        form.value.handicap_info = ab.handicap_info || '';

        // Restore apprenants
        if (data.prestation_apprenants) {
          form.value.apprenants = data.prestation_apprenants.map(pa => pa.apprenant_id);
        }
      }
    }
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

    <template v-else>
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
            {{ isEdit ? 'Modifier la session' : 'Nouvelle session de formation' }}
          </h1>
          <p class="text-surface-500 mt-1">Etape {{ currentStep }} sur {{ totalSteps }}</p>
        </div>
        <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" outlined @click="goBack" />
      </div>

      <!-- Workflow Timeline -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <WorkflowTimeline :steps="FORMATION_WORKFLOW_STEPS" :currentStep="currentStep - 1" />
      </div>

      <!-- Step Content Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">

        <!-- ====== STEP 1 : Identification ====== -->
        <div v-if="currentStep === 1">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-user mr-2"></i>Identification
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex flex-col gap-2 md:col-span-2">
              <label class="text-sm font-medium">Intitule de la formation *</label>
              <InputText v-model="form.intitule" placeholder="Ex: Formation Vue.js avancee" class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Client *</label>
              <Dropdown
                v-model="form.client_id"
                :options="clientOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selectionner un client"
                filter
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Financeur / Payeur</label>
              <Dropdown
                v-model="form.payeur_id"
                :options="financeurOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selectionner un financeur"
                filter
                showClear
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Formateur</label>
              <Dropdown
                v-model="form.formateur_id"
                :options="formateurOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selectionner un formateur"
                filter
                showClear
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Apprenants</label>
              <MultiSelect
                v-model="form.apprenants"
                :options="apprenantOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Selectionner les apprenants"
                filter
                :maxSelectedLabels="3"
                selectedItemsLabel="{0} apprenants"
                class="w-full"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Date de debut</label>
              <Calendar v-model="form.date_debut" dateFormat="dd/mm/yy" showIcon class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Date de fin</label>
              <Calendar v-model="form.date_fin" dateFormat="dd/mm/yy" showIcon class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Duree (heures)</label>
              <InputNumber v-model="form.duree_heures" :min="0" suffix=" h" class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Montant HT</label>
              <InputNumber v-model="form.montant_ht" :min="0" mode="currency" currency="EUR" locale="fr-FR" class="w-full" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 2 : Analyse du besoin ====== -->
        <div v-else-if="currentStep === 2">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-search mr-2"></i>Analyse du besoin
          </h2>
          <div class="grid grid-cols-1 gap-6">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Contexte de la demande</label>
              <Textarea v-model="form.contexte" rows="3" placeholder="Decrivez le contexte de la demande de formation..." class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Objectifs pedagogiques</label>
              <Textarea v-model="form.objectifs" rows="3" placeholder="Listez les objectifs vises par la formation..." class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Public vise</label>
              <Textarea v-model="form.public_vise" rows="2" placeholder="Decrivez le public cible et les prerequis..." class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Modalites pedagogiques</label>
              <Textarea v-model="form.modalites" rows="2" placeholder="Presentiel, distanciel, mixte, methodes..." class="w-full" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Prise en compte du handicap</label>
              <Textarea v-model="form.handicap_info" rows="2" placeholder="Amenagements prevus, accessibilite, referent handicap..." class="w-full" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 3 : Convention ====== -->
        <div v-else-if="currentStep === 3">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-file mr-2"></i>Convention
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-file text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Generation automatique</p>
            <p class="text-sm text-center max-w-md">
              La convention de formation sera generee automatiquement a partir des informations
              saisies lors des etapes precedentes. Vous pourrez la personnaliser et la telecharger.
            </p>
            <Message severity="info" :closable="false" class="mt-4">
              Fonctionnalite disponible prochainement.
            </Message>
          </div>
        </div>

        <!-- ====== STEP 4 : Convocation ====== -->
        <div v-else-if="currentStep === 4">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-envelope mr-2"></i>Convocation
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-envelope text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Convocation des apprenants</p>
            <p class="text-sm text-center max-w-md">
              Les convocations seront envoyees automatiquement aux apprenants inscrits
              avec les informations pratiques de la session.
            </p>
            <Message severity="info" :closable="false" class="mt-4">
              Fonctionnalite disponible prochainement.
            </Message>
          </div>
        </div>

        <!-- ====== STEP 5 : Realisation ====== -->
        <div v-else-if="currentStep === 5">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-play mr-2"></i>Realisation
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-play text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Suivi de la realisation</p>
            <p class="text-sm text-center max-w-md">
              Gerez les emargements, le suivi des presences et les evenements
              survenus pendant la formation.
            </p>
            <Message severity="info" :closable="false" class="mt-4">
              Fonctionnalite disponible prochainement.
            </Message>
          </div>
        </div>

        <!-- ====== STEP 6 : Evaluation des acquis ====== -->
        <div v-else-if="currentStep === 6">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-check-circle mr-2"></i>Evaluation des acquis
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-check-circle text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Evaluation des acquis</p>
            <p class="text-sm text-center max-w-md">
              Configurez et envoyez les evaluations de validation des acquis
              aux apprenants (quiz, QCM, mise en situation).
            </p>
            <Message severity="info" :closable="false" class="mt-4">
              Fonctionnalite disponible prochainement.
            </Message>
          </div>
        </div>

        <!-- ====== STEP 7 : Satisfaction ====== -->
        <div v-else-if="currentStep === 7">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-star mr-2"></i>Satisfaction
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-star text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Enquetes de satisfaction</p>
            <p class="text-sm text-center max-w-md">
              Envoyez les questionnaires de satisfaction aux stagiaires,
              au formateur et au financeur.
            </p>
            <Message severity="info" :closable="false" class="mt-4">
              Fonctionnalite disponible prochainement.
            </Message>
          </div>
        </div>

        <!-- ====== STEP 8 : Cloture ====== -->
        <div v-else-if="currentStep === 8">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-lock mr-2"></i>Cloture
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-lock text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Cloture de la session</p>
            <p class="text-sm text-center max-w-md">
              Verifiez que tous les documents sont complets et cloturez la session.
              La cloture finalise le dossier de formation.
            </p>
            <Message severity="warn" :closable="false" class="mt-4">
              Attention : la cloture est bloquee si un signal qualite est ouvert
              sur cette session (incident, reclamation non traite).
            </Message>
            <Message severity="info" :closable="false" class="mt-2">
              Fonctionnalite disponible prochainement.
            </Message>
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between items-center mt-6">
        <Button
          label="Precedent"
          icon="pi pi-chevron-left"
          severity="secondary"
          outlined
          :disabled="currentStep === 1"
          @click="prevStep"
        />

        <div class="flex gap-3">
          <Button
            label="Enregistrer"
            icon="pi pi-save"
            severity="info"
            :loading="saving"
            @click="handleSave"
          />
          <Button
            v-if="currentStep < totalSteps"
            label="Suivant"
            icon="pi pi-chevron-right"
            iconPos="right"
            @click="nextStep"
          />
        </div>
      </div>
    </template>
  </div>
</template>
