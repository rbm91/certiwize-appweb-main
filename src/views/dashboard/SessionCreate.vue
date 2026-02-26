<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';

import { usePrestationsStore } from '../../stores/prestations';
import { useTiersStore } from '../../stores/tiers';
import { useTrainingStore } from '../../stores/training';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../supabase';
import WorkflowTimeline from '../../components/dashboard/WorkflowTimeline.vue';
import StepManagerPanel from '../../components/common/StepManagerPanel.vue';
import { FORMATION_WORKFLOW_STEPS } from '../../config/constants';
import { useWorkflowConfigStore } from '../../stores/workflowConfig';
import { useNavConfigStore } from '../../stores/navConfig';

// Composants de personnalisation
import EditableLabel from '../../components/common/EditableLabel.vue';
import ManageableField from '../../components/common/ManageableField.vue';
import AddFieldButton from '../../components/common/AddFieldButton.vue';
import CustomFieldRenderer from '../../components/common/CustomFieldRenderer.vue';
import RestoreFieldsButton from '../../components/common/RestoreFieldsButton.vue';
import FieldManagerPanel from '../../components/common/FieldManagerPanel.vue';
import DocumentSlot from '../../components/common/DocumentSlot.vue';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Calendar from 'primevue/calendar';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import axios from 'axios';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const store = usePrestationsStore();
const tiersStore = useTiersStore();
const trainingStore = useTrainingStore();
const authStore = useAuthStore();
const workflowConfigStore = useWorkflowConfigStore();
const navConfig = useNavConfigStore();
const ph = (key, fallback) => navConfig.getFieldPlaceholder(key, fallback);

// -- Personnalisation des champs --
const customFieldValues = ref({
  identification: {},
  step2: {}, step3: {}, step4: {},
  step5: {}, step6: {}, step7: {},
});
const showFieldPanel = ref(false);
const activeFieldPanelSection = ref('session.main');
const openFieldPanel = (section) => {
  activeFieldPanelSection.value = section;
  showFieldPanel.value = true;
};

// -- Documents de la session (bibliothèque + helpers) --
const libraryDocs = ref([]);
const getDocument = (key) => form.value.workflow_data?.documents?.[key] || null;
const setDocument = (key, value) => {
  if (!form.value.workflow_data) form.value.workflow_data = {};
  if (!form.value.workflow_data.documents) form.value.workflow_data.documents = {};
  if (value) {
    form.value.workflow_data.documents[key] = value;
  } else {
    delete form.value.workflow_data.documents[key];
  }
};

// Labels pour restauration et FieldManagerPanel
const sessionFieldLabels = {
  'session.intitule': 'Intitulé de la formation',
  'session.client': 'Client',
  'session.payeur': 'Financeur / Payeur',
  'session.formateur': 'Formateur',
  'session.apprenants': 'Apprenants',
  'session.date_debut': 'Date de début',
  'session.date_fin': 'Date de fin',
  'session.duree_heures': 'Durée (heures)',
  'session.montant_ht': 'Montant HT',
  'session.contexte': 'Contexte de la demande',
  'session.objectifs': 'Objectifs pédagogiques',
  'session.public_vise': 'Public visé',
  'session.modalites': 'Modalités pédagogiques',
  'session.documents': 'Génération de documents',
};

// -- Edit mode --
const editId = computed(() => route.params.id || null);
const isEdit = computed(() => !!editId.value);
const loading = ref(false);
const saving = ref(false);
const savedPrestationId = ref(null); // ID de la session après première création (pour auto-save)

// -- Document generation --
const generatingConvention = ref(false);
const generatingConvocation = ref(false);
const generatingEtude = ref(false);
const generatingLivret = ref(false);

// -- Workflow step (dynamique depuis le store, fallback constants) --
const currentStep = ref(1);
const formationSteps = computed(() => workflowConfigStore.getStepperSteps('formation'));
const totalSteps = computed(() => formationSteps.value.length);
const showStepManager = ref(false);
const isSuperAdmin = computed(() => authStore.isSuperAdmin);

// -- Form data --
const form = ref({
  // Step 1 - Identification & Analyse du besoin
  intitule: '',
  formation_id: null,
  client_id: null,
  payeur_id: null,
  formateur_id: null,
  apprenants: [],
  date_debut: null,
  date_fin: null,
  duree_heures: null,
  montant_ht: null,
  contexte: '',
  objectifs: '',
  public_vise: '',
  modalites: '',

  // Step 2+ stored as workflow_data
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
  const fournisseurs = tiersStore.tiersByRole('fournisseur');
  return [...clients, ...fournisseurs].map(t => ({
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

// Options formations du catalogue
const formationOptions = computed(() => {
  const options = trainingStore.formations.map(f => ({
    label: f.title,
    value: f.id,
  }));
  // Ajouter l'option "Formation sur mesure" en premier
  options.unshift({ label: '✏️ Formation sur mesure (saisie libre)', value: '__custom__' });
  return options;
});

const selectedFormation = ref(null);
const customIntitule = ref(false);

const onFormationSelect = (event) => {
  const val = event.value;
  if (val === '__custom__') {
    customIntitule.value = true;
    form.value.intitule = '';
    form.value.formation_id = null;
  } else {
    customIntitule.value = false;
    const formation = trainingStore.formations.find(f => f.id === val);
    if (formation) {
      form.value.intitule = formation.title;
      form.value.formation_id = formation.id;
    }
  }
};

// -- Navigation --
const goBack = () => router.push({ name: 'dashboard-sessions' });

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--;
};

const nextStep = async () => {
  if (currentStep.value < totalSteps.value) {
    // Auto-save avant de passer à l'étape suivante
    await handleSave(false); // false = ne pas rediriger
    currentStep.value++;
  }
};

// -- Synchronisation des apprenants --
// Compare la liste sélectionnée avec celle en base et ajoute/supprime les différences
const syncApprenants = async (prestationId, newApprenantIds) => {
  try {
    // Récupérer les apprenants actuellement rattachés en base
    const { data: existing, error: fetchErr } = await supabase
      .from('prestation_apprenants')
      .select('apprenant_id')
      .eq('prestation_id', prestationId);

    if (fetchErr) throw fetchErr;

    const existingIds = (existing || []).map(pa => pa.apprenant_id);

    // Apprenants à ajouter (dans la sélection mais pas en base)
    const toAdd = newApprenantIds.filter(id => !existingIds.includes(id));
    // Apprenants à supprimer (en base mais plus dans la sélection)
    const toRemove = existingIds.filter(id => !newApprenantIds.includes(id));

    for (const appId of toAdd) {
      await store.addApprenant(prestationId, appId);
    }
    for (const appId of toRemove) {
      await store.removeApprenant(prestationId, appId);
    }

    return { success: true, added: toAdd.length, removed: toRemove.length };
  } catch (err) {
    console.error('[SessionCreate] syncApprenants:', err.message);
    return { success: false, error: err.message };
  }
};

// -- Document generation functions --
const generateDocument = async (type, loadingRef, webhookUrl) => {
  if (!editId.value && !form.value.intitule) {
    toast.add({
      severity: 'warn',
      summary: 'Attention',
      detail: 'Veuillez d\'abord enregistrer la session avant de générer des documents.',
      life: 4000,
    });
    return;
  }

  loadingRef.value = true;
  try {
    const payload = {
      session_id: editId.value,
      user_id: authStore.user?.id,
      intitule: form.value.intitule,
      client_id: form.value.client_id,
      payeur_id: form.value.payeur_id,
      formateur_id: form.value.formateur_id,
      apprenants: form.value.apprenants,
      date_debut: form.value.date_debut,
      date_fin: form.value.date_fin,
      duree_heures: form.value.duree_heures,
      montant_ht: form.value.montant_ht,
      contexte: form.value.contexte,
      objectifs: form.value.objectifs,
      public_vise: form.value.public_vise,
      modalites: form.value.modalites,
    };

    const response = await axios.post(webhookUrl, payload);

    toast.add({
      severity: 'success',
      summary: 'Document généré',
      detail: `Le document ${type} a été généré avec succès.`,
      life: 3000,
    });

    return response.data;
  } catch (error) {
    console.error(`Erreur génération ${type}:`, error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: `Impossible de générer le document ${type}. ${error.message}`,
      life: 5000,
    });
  } finally {
    loadingRef.value = false;
  }
};

const generateConvention = () => {
  const webhookUrl = import.meta.env.VITE_N8N_HOOK_PROJ_CONVENTION;
  if (!webhookUrl) {
    toast.add({
      severity: 'error',
      summary: 'Configuration manquante',
      detail: 'Le webhook de génération de convention n\'est pas configuré.',
      life: 4000,
    });
    return;
  }
  return generateDocument('Convention', generatingConvention, webhookUrl);
};

const generateConvocation = () => {
  const webhookUrl = import.meta.env.VITE_N8N_HOOK_PROJ_CONVOCATION;
  if (!webhookUrl) {
    toast.add({
      severity: 'error',
      summary: 'Configuration manquante',
      detail: 'Le webhook de génération de convocation n\'est pas configuré.',
      life: 4000,
    });
    return;
  }
  return generateDocument('Convocation', generatingConvocation, webhookUrl);
};

const generateEtude = () => {
  const webhookUrl = import.meta.env.VITE_N8N_HOOK_PROJ_ETUDE;
  if (!webhookUrl) {
    toast.add({
      severity: 'error',
      summary: 'Configuration manquante',
      detail: 'Le webhook de génération du projet d\'étude n\'est pas configuré.',
      life: 4000,
    });
    return;
  }
  return generateDocument('Projet d\'étude', generatingEtude, webhookUrl);
};

const generateLivret = () => {
  const webhookUrl = import.meta.env.VITE_N8N_HOOK_PROJ_LIVRET;
  if (!webhookUrl) {
    toast.add({
      severity: 'error',
      summary: 'Configuration manquante',
      detail: 'Le webhook de génération du livret n\'est pas configuré.',
      life: 4000,
    });
    return;
  }
  return generateDocument('Livret', generatingLivret, webhookUrl);
};

// -- Save --
// redirect = true : redirige vers la vue session après sauvegarde
// redirect = false : sauvegarde silencieuse (auto-save entre étapes)
const handleSave = async (redirect = true) => {
  saving.value = true;
  try {
    const payload = {
      type: 'formation',
      intitule: form.value.intitule,
      formation_id: form.value.formation_id,
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
        },
      },
    };

    let result;
    if (isEdit.value || savedPrestationId.value) {
      // Si la session a déjà été créée (même dans cette même page), on fait un update
      const idToUpdate = editId.value || savedPrestationId.value;
      result = await store.updatePrestation(idToUpdate, payload);
      // Garder la même data.id
      if (result.success && !result.data?.id) {
        result.data = { ...result.data, id: idToUpdate };
      }
    } else {
      result = await store.createPrestation(payload);
      // Stocker l'ID pour les sauvegardes suivantes (auto-save entre étapes)
      if (result.success && result.data?.id) {
        savedPrestationId.value = result.data.id;
      }
    }

    if (result.success) {
      const prestationId = result.data?.id || editId.value || savedPrestationId.value;

      // Synchroniser les apprenants (création ET édition)
      if (prestationId && form.value.apprenants.length > 0) {
        await syncApprenants(prestationId, form.value.apprenants);
      }

      if (redirect) {
        toast.add({
          severity: 'success',
          summary: isEdit.value ? 'Session mise à jour' : 'Session créée',
          detail: `La session "${form.value.intitule}" a été ${isEdit.value ? 'mise à jour' : 'créée'} avec succès.`,
          life: 3000,
        });

        router.push({ name: 'dashboard-session-view', params: { id: prestationId } });
      } else {
        toast.add({
          severity: 'success',
          summary: 'Enregistré',
          detail: 'Les données ont été sauvegardées avec succès.',
          life: 2000,
        });
      }
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

// -- Renommer une étape du stepper (super_admin) --
const handleStepRenamed = async ({ stepNumber, label }) => {
  await workflowConfigStore.renameStepperStep('formation', stepNumber, label);
};

// -- Load existing data --
onMounted(async () => {
  loading.value = true;
  try {
    // Charger la config workflow et navConfig pour les steps dynamiques + personnalisation
    await workflowConfigStore.fetchConfig();
    await navConfig.fetchConfig();

    if (tiersStore.activeTiers.length === 0) {
      await tiersStore.fetchTiers();
    }
    if (trainingStore.formations.length === 0) {
      await trainingStore.fetchFormations();
    }

    // Charger les documents de la bibliothèque (boîte à outils) pour les DocumentSlots
    try {
      const { data: libData } = await supabase
        .from('boite_outils_documents')
        .select('*')
        .eq('user_id', authStore.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      libraryDocs.value = libData || [];
    } catch (err) {
      console.warn('[SessionCreate] Fetch library docs:', err.message);
    }

    // Auto-configurer la dépendance PSH (Commentaire PSH visible seulement si Présence de PSH = Oui)
    const mainCustomFields = navConfig.config?.customFields?.['session.main'] || [];
    const presencePSH = mainCustomFields.find(f => f.type === 'toggle' && f.label.toLowerCase().includes('psh'));
    const commentairePSH = mainCustomFields.find(f => f.type !== 'toggle' && f.label.toLowerCase().includes('psh') && f.key !== presencePSH?.key);
    if (presencePSH && commentairePSH) {
      // Configurer la dépendance showIf si pas encore fait
      if (!commentairePSH.showIf) {
        await navConfig.setFieldShowIf('session.main', commentairePSH.key, { key: presencePSH.key, value: true });
      }
      // S'assurer que Présence de PSH est toujours avant Commentaire PSH
      const idxPresence = mainCustomFields.indexOf(presencePSH);
      const idxCommentaire = mainCustomFields.indexOf(commentairePSH);
      if (idxPresence > idxCommentaire) {
        const orderedKeys = mainCustomFields.map(f => f.key);
        // Retirer les deux clés PSH et les réinsérer dans le bon ordre
        const filtered = orderedKeys.filter(k => k !== presencePSH.key && k !== commentairePSH.key);
        const insertAt = Math.min(idxPresence, idxCommentaire);
        filtered.splice(insertAt, 0, presencePSH.key, commentairePSH.key);
        await navConfig.reorderCustomFields('session.main', filtered);
      }
    }

    if (isEdit.value) {
      const data = await store.fetchPrestationById(editId.value);
      if (data) {
        form.value.intitule = data.intitule || '';
        form.value.formation_id = data.formation_id || null;
        // Restaurer la sélection du dropdown
        if (data.formation_id) {
          selectedFormation.value = data.formation_id;
        } else if (data.intitule) {
          selectedFormation.value = '__custom__';
          customIntitule.value = true;
        }
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
          <p class="text-surface-500 mt-1">Étape {{ currentStep }} sur {{ totalSteps }}</p>
        </div>
        <Button label="Retour" icon="pi pi-arrow-left" severity="secondary" outlined @click="goBack" />
      </div>

      <!-- Workflow Timeline -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex items-center">
        <WorkflowTimeline :steps="formationSteps" :currentStep="currentStep - 1" :editable="true" @step-renamed="handleStepRenamed" class="flex-1" />
      </div>

      <!-- Step Content Card -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">

        <!-- ====== STEP 1 : Identification & Analyse du besoin ====== -->
        <div v-if="currentStep === 1">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-user mr-2"></i><EditableLabel labelKey="session.step1_title" defaultLabel="Identification & Analyse du besoin" />
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ManageableField fieldKey="session.intitule" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.intitule" defaultLabel="Intitulé de la formation" /></label>
                <Dropdown
                  v-model="selectedFormation"
                  :options="formationOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="ph('session.intitule', 'Sélectionner une formation du catalogue')"
                  filter
                  class="w-full"
                  @change="onFormationSelect"
                />
                <InputText
                  v-if="customIntitule"
                  v-model="form.intitule"
                  :placeholder="ph('session.intitule_custom', 'Saisissez l\'intitulé de la formation sur mesure')"
                  class="w-full mt-2"
                />
                <small v-if="!customIntitule && form.intitule" class="text-green-600">
                  <i class="pi pi-check-circle mr-1"></i>{{ form.intitule }}
                </small>
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.client">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.client" defaultLabel="Client" /></label>
                <Dropdown
                  v-model="form.client_id"
                  :options="clientOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="ph('session.client', 'Sélectionner un client')"
                  filter
                  class="w-full"
                />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.payeur">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.payeur" defaultLabel="Financeur / Payeur" /></label>
                <Dropdown
                  v-model="form.payeur_id"
                  :options="financeurOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="ph('session.payeur', 'Sélectionner un financeur')"
                  filter
                  showClear
                  class="w-full"
                />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.formateur">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.formateur" defaultLabel="Formateur" /></label>
                <Dropdown
                  v-model="form.formateur_id"
                  :options="formateurOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="ph('session.formateur', 'Sélectionner un formateur')"
                  filter
                  showClear
                  class="w-full"
                />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.apprenants">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.apprenants" defaultLabel="Apprenants" /></label>
                <MultiSelect
                  v-model="form.apprenants"
                  :options="apprenantOptions"
                  optionLabel="label"
                  optionValue="value"
                  :placeholder="ph('session.apprenants', 'Sélectionner les apprenants')"
                  filter
                  :maxSelectedLabels="3"
                  selectedItemsLabel="{0} apprenants"
                  class="w-full"
                />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.date_debut">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.date_debut" defaultLabel="Date de début" /></label>
                <Calendar v-model="form.date_debut" dateFormat="dd/mm/yy" showIcon class="w-full" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.date_fin">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.date_fin" defaultLabel="Date de fin" /></label>
                <Calendar v-model="form.date_fin" dateFormat="dd/mm/yy" showIcon class="w-full" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.duree_heures">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.duree_heures" defaultLabel="Durée (heures)" /></label>
                <InputNumber v-model="form.duree_heures" :min="0" suffix=" h" class="w-full" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.montant_ht">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.montant_ht" defaultLabel="Montant HT" /></label>
                <InputNumber v-model="form.montant_ht" :min="0" mode="currency" currency="EUR" locale="fr-FR" class="w-full" />
              </div>
            </ManageableField>
          </div>

          <!-- Analyse du besoin -->
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6 mt-8">
            <i class="pi pi-search mr-2"></i>Analyse du besoin
          </h2>
          <div class="grid grid-cols-1 gap-6">
            <ManageableField fieldKey="session.contexte">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.contexte" defaultLabel="Contexte de la demande" /></label>
                <Textarea v-model="form.contexte" rows="3" :placeholder="ph('session.contexte', 'Décrivez le contexte de la demande de formation...')" class="w-full" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.objectifs">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.objectifs" defaultLabel="Objectifs pédagogiques" /></label>
                <Textarea v-model="form.objectifs" rows="3" :placeholder="ph('session.objectifs', 'Listez les objectifs visés par la formation...')" class="w-full" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.public_vise">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.public_vise" defaultLabel="Public visé" /></label>
                <Textarea v-model="form.public_vise" rows="2" :placeholder="ph('session.public_vise', 'Décrivez le public cible et les prérequis...')" class="w-full" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="session.modalites">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-medium"><EditableLabel labelKey="session.modalites" defaultLabel="Modalités pédagogiques" /></label>
                <Textarea v-model="form.modalites" rows="2" :placeholder="ph('session.modalites', 'Présentiel, distanciel, mixte, méthodes...')" class="w-full" />
              </div>
            </ManageableField>
            <!-- Champs personnalisés + Restaurer + Ajouter -->
            <div>
              <CustomFieldRenderer section="session.main" v-model="customFieldValues.identification" />
              <div class="flex items-center gap-4 mt-2">
                <AddFieldButton section="session.main" @open-manager="openFieldPanel('session.main')" />
                <RestoreFieldsButton section="session" :fieldLabels="sessionFieldLabels" />
              </div>
            </div>

            <!-- Document generation section -->
            <ManageableField fieldKey="session.documents">
              <div class="border-t pt-6 mt-4">
                <h3 class="text-md font-semibold text-surface-700 dark:text-surface-300 mb-4">
                  <i class="pi pi-file-pdf mr-2"></i><EditableLabel labelKey="session.documents" defaultLabel="Génération de documents" />
                </h3>
                <div class="flex gap-3">
                  <Button
                    label="Générer le projet d'étude"
                    icon="pi pi-file-word"
                    severity="info"
                    :loading="generatingEtude"
                    @click="generateEtude"
                  />
                </div>
              </div>
            </ManageableField>
          </div>

        </div>

        <!-- ====== STEP 2 : Convention ====== -->
        <div v-else-if="currentStep === 2">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-file mr-2"></i>Convention
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-file text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Génération automatique</p>
            <p class="text-sm text-center max-w-md mb-6">
              La convention de formation sera générée automatiquement à partir des informations
              saisies lors des étapes précédentes. Vous pourrez la personnaliser et la télécharger.
            </p>
            <Button
              label="Générer la convention"
              icon="pi pi-file-pdf"
              severity="success"
              size="large"
              :loading="generatingConvention"
              @click="generateConvention"
            />
            <Message severity="info" :closable="false" class="mt-4">
              La génération peut prendre quelques secondes.
            </Message>
          </div>
          <!-- Documents joints -->
          <div class="border-t pt-6 mt-6">
            <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-4">
              <i class="pi pi-paperclip mr-2"></i>Documents joints
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DocumentSlot
                :modelValue="getDocument('programme_formation')"
                @update:modelValue="(v) => setDocument('programme_formation', v)"
                label="Programme de formation"
                slotKey="programme_formation"
                :libraryDocs="libraryDocs"
              />
            </div>
          </div>
          <!-- Champs personnalisés -->
          <div class="mt-6 border-t pt-6">
            <CustomFieldRenderer section="session.step2" v-model="customFieldValues.step2" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="session.step2" @open-manager="openFieldPanel('session.step2')" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 3 : Convocation ====== -->
        <div v-else-if="currentStep === 3">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-envelope mr-2"></i>Convocation
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-envelope text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Convocation des apprenants</p>
            <p class="text-sm text-center max-w-md mb-6">
              Les convocations seront générées automatiquement pour les apprenants inscrits
              avec les informations pratiques de la session.
            </p>
            <Button
              label="Générer les convocations"
              icon="pi pi-send"
              severity="success"
              size="large"
              :loading="generatingConvocation"
              @click="generateConvocation"
            />
            <Message severity="info" :closable="false" class="mt-4">
              Les convocations seront envoyées aux apprenants après génération.
            </Message>
          </div>
          <!-- Documents joints -->
          <div class="border-t pt-6 mt-6">
            <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-4">
              <i class="pi pi-paperclip mr-2"></i>Documents joints
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DocumentSlot
                :modelValue="getDocument('livret_accueil')"
                @update:modelValue="(v) => setDocument('livret_accueil', v)"
                label="Livret d'accueil"
                slotKey="livret_accueil"
                :libraryDocs="libraryDocs"
              />
              <DocumentSlot
                :modelValue="getDocument('reglement_interieur')"
                @update:modelValue="(v) => setDocument('reglement_interieur', v)"
                label="Règlement intérieur"
                slotKey="reglement_interieur"
                :libraryDocs="libraryDocs"
              />
              <DocumentSlot
                :modelValue="getDocument('convocation_doc')"
                @update:modelValue="(v) => setDocument('convocation_doc', v)"
                label="Convocation"
                slotKey="convocation_doc"
                :libraryDocs="libraryDocs"
              />
            </div>
          </div>
          <!-- Champs personnalisés -->
          <div class="mt-6 border-t pt-6">
            <CustomFieldRenderer section="session.step3" v-model="customFieldValues.step3" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="session.step3" @open-manager="openFieldPanel('session.step3')" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 4 : Réalisation (inclut évaluation & satisfaction) ====== -->
        <div v-else-if="currentStep === 4">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-play mr-2"></i>Réalisation
          </h2>

          <!-- Suivi de la réalisation -->
          <div class="flex flex-col items-center justify-center py-8 text-surface-500">
            <i class="pi pi-play text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Suivi de la réalisation</p>
            <p class="text-sm text-center max-w-md mb-6">
              Gérez les émargements, le suivi des présences et les événements
              survenus pendant la formation.
            </p>
            <Button
              label="Générer le livret de formation"
              icon="pi pi-book"
              severity="success"
              size="large"
              :loading="generatingLivret"
              @click="generateLivret"
            />
            <Message severity="info" :closable="false" class="mt-4">
              Le livret regroupe tous les documents de la formation.
            </Message>
          </div>

          <!-- Déroulement de la prestation -->
          <div class="border-t pt-6 mt-6">
            <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-4">
              <i class="pi pi-check-circle mr-2"></i>Déroulement de la prestation
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DocumentSlot
                :modelValue="getDocument('positionnement')"
                @update:modelValue="(v) => setDocument('positionnement', v)"
                label="Positionnement"
                slotKey="positionnement"
                :libraryDocs="libraryDocs"
              />
              <DocumentSlot
                :modelValue="getDocument('support_formation')"
                @update:modelValue="(v) => setDocument('support_formation', v)"
                label="Support de formation"
                slotKey="support_formation"
                :libraryDocs="libraryDocs"
              />
              <DocumentSlot
                :modelValue="getDocument('evaluation_acquis')"
                @update:modelValue="(v) => setDocument('evaluation_acquis', v)"
                label="Évaluation des acquis"
                slotKey="evaluation_acquis"
                :libraryDocs="libraryDocs"
              />
            </div>
          </div>

          <!-- Satisfaction -->
          <div class="border-t pt-6 mt-6">
            <h3 class="text-base font-semibold text-surface-700 dark:text-surface-200 mb-4">
              <i class="pi pi-star mr-2"></i>Satisfaction
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DocumentSlot
                :modelValue="getDocument('enquete_satisfaction_formateur')"
                @update:modelValue="(v) => setDocument('enquete_satisfaction_formateur', v)"
                label="Enquête satisfaction formateur"
                slotKey="enquete_satisfaction_formateur"
                :libraryDocs="libraryDocs"
              />
              <DocumentSlot
                :modelValue="getDocument('enquete_satisfaction_entreprise')"
                @update:modelValue="(v) => setDocument('enquete_satisfaction_entreprise', v)"
                label="Enquête satisfaction entreprise"
                slotKey="enquete_satisfaction_entreprise"
                :libraryDocs="libraryDocs"
              />
              <DocumentSlot
                :modelValue="getDocument('enquete_satisfaction_opco')"
                @update:modelValue="(v) => setDocument('enquete_satisfaction_opco', v)"
                label="Enquête satisfaction OPCO"
                slotKey="enquete_satisfaction_opco"
                :libraryDocs="libraryDocs"
              />
            </div>
          </div>

          <!-- Champs personnalisés -->
          <div class="mt-6 border-t pt-6">
            <CustomFieldRenderer section="session.step4" v-model="customFieldValues.step4" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="session.step4" @open-manager="openFieldPanel('session.step4')" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 5 : Facturation ====== -->
        <div v-else-if="currentStep === 5">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-wallet mr-2"></i>Facturation
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-wallet text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Facturation de la session</p>
            <p class="text-sm text-center max-w-md">
              Générez les factures (acompte, solde) liées à cette session de formation.
              Le suivi des paiements et relances sera disponible ici.
            </p>
            <Message severity="info" :closable="false" class="mt-4">
              Fonctionnalité disponible prochainement.
            </Message>
          </div>
          <!-- Champs personnalisés -->
          <div class="mt-6 border-t pt-6">
            <CustomFieldRenderer section="session.step5" v-model="customFieldValues.step5" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="session.step5" @open-manager="openFieldPanel('session.step5')" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 6 : Clôture ====== -->
        <div v-else-if="currentStep === 6">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-lock mr-2"></i>Clôture
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-lock text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Clôture de la session</p>
            <p class="text-sm text-center max-w-md">
              Vérifiez que tous les documents sont complets et clôturez la session.
              La clôture finalise le dossier de formation.
            </p>
            <Message severity="warn" :closable="false" class="mt-4">
              Attention : la clôture est bloquée si un signal qualité est ouvert
              sur cette session (incident, réclamation non traité).
            </Message>
            <Message severity="info" :closable="false" class="mt-2">
              Fonctionnalité disponible prochainement.
            </Message>
          </div>
          <!-- Champs personnalisés -->
          <div class="mt-6 border-t pt-6">
            <CustomFieldRenderer section="session.step6" v-model="customFieldValues.step6" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="session.step6" @open-manager="openFieldPanel('session.step6')" />
            </div>
          </div>
        </div>

        <!-- ====== STEP 7 : Archivé ====== -->
        <div v-else-if="currentStep === 7">
          <h2 class="text-lg font-semibold text-primary border-b pb-2 mb-6">
            <i class="pi pi-box mr-2"></i>Archivé
          </h2>
          <div class="flex flex-col items-center justify-center py-12 text-surface-500">
            <i class="pi pi-box text-5xl mb-4 text-primary"></i>
            <p class="text-lg font-medium mb-2">Archivage de la session</p>
            <p class="text-sm text-center max-w-md">
              La session est terminée et archivée. Tous les documents sont conservés
              conformément aux exigences Qualiopi (durée de conservation des preuves).
            </p>
            <Message severity="success" :closable="false" class="mt-4">
              Session archivée avec succès.
            </Message>
          </div>
          <!-- Champs personnalisés -->
          <div class="mt-6 border-t pt-6">
            <CustomFieldRenderer section="session.step7" v-model="customFieldValues.step7" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="session.step7" @open-manager="openFieldPanel('session.step7')" />
            </div>
          </div>
        </div>
      </div>

      <!-- Panneau de gestion des champs (partagé pour toutes les étapes) -->
      <FieldManagerPanel
        v-model:visible="showFieldPanel"
        :section="activeFieldPanelSection"
        :title="'Gérer les champs — ' + (activeFieldPanelSection === 'session.main' ? 'Identification' : 'Étape ' + activeFieldPanelSection.replace('session.step', ''))"
        :fieldLabels="activeFieldPanelSection === 'session.main' ? sessionFieldLabels : {}"
      />

      <!-- Navigation Buttons -->
      <div class="flex justify-between items-center mt-6">
        <Button
          label="Précédent"
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
            @click="handleSave(false)"
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
