<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTiersStore } from '../../stores/tiers';
import { useSirenLookup } from '../../composables/useSirenLookup';
import { useConformityScore } from '../../composables/useConformityScore';
import { useFileUpload } from '../../composables/useFileUpload';
import { useNotification } from '../../composables/useNotification';
import { useFormValidation } from '../../composables/useFormValidation';
import { useAuthStore } from '../../stores/auth';
import { useNavConfigStore } from '../../stores/navConfig';
import ScoreBadge from '../../components/dashboard/ScoreBadge.vue';
import AddressAutocomplete from '../../components/common/AddressAutocomplete.vue';
import ManageableField from '../../components/common/ManageableField.vue';
import EditableLabel from '../../components/common/EditableLabel.vue';
import AddFieldButton from '../../components/common/AddFieldButton.vue';
import CustomFieldRenderer from '../../components/common/CustomFieldRenderer.vue';
import RestoreFieldsButton from '../../components/common/RestoreFieldsButton.vue';
import FieldManagerPanel from '../../components/common/FieldManagerPanel.vue';
import {
  TIER_ROLE_OPTIONS, TIER_NATURES, TIER_STATUTS,
  STATUT_COMMERCIAL, FOURNISSEUR_TYPES, HANDICAP_OPTIONS,
  TIER_DOC_TYPES, RELATION_TYPES,
} from '../../config/constants';

// PrimeVue components
import InputText from 'primevue/inputtext';
import PhoneInput from '../../components/common/PhoneInput.vue';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import SelectButton from 'primevue/selectbutton';
import DatePicker from 'primevue/datepicker';
import Divider from 'primevue/divider';

const route = useRoute();
const router = useRouter();
const store = useTiersStore();
const authStore = useAuthStore();
const navConfig = useNavConfigStore();
const { lookup, loading: sirenLoading } = useSirenLookup();
const { computeScore } = useConformityScore();
const { uploading: fileUploading, uploadFile } = useFileUpload('tier-files');
const { showSuccess, showError } = useNotification();

const isSuperAdmin = computed(() => authStore.isSuperAdmin);

const ouiNonOptions = [
  { label: 'Oui', value: true },
  { label: 'Non', value: false },
];

// --- Personnalisation ---
const ph = (key, fallback) => navConfig.getFieldPlaceholder(key, fallback);

const customFieldValues = ref({
  general: {},
  apprenant: {},
  formateur: {},
  fournisseur: {},
});

const showFieldPanel = ref(false);
const activeFieldPanelSection = ref('tiers.general');
const openFieldPanel = (section) => {
  activeFieldPanelSection.value = section;
  showFieldPanel.value = true;
};

const tiersFieldLabels = {
  'tiers.prenom': 'Prénom',
  'tiers.nom_famille': 'Nom de famille',
  'tiers.raison_sociale': 'Raison sociale',
  'tiers.siren': 'SIREN',
  'tiers.siret': 'SIRET',
  'tiers.naf_ape': 'NAF / APE',
  'tiers.tva_intracom': 'TVA intracommunautaire',
  'tiers.email': 'Email',
  'tiers.telephone': 'Téléphone',
  'tiers.address': 'Adresse',
  'tiers.zip_code': 'Code postal',
  'tiers.city': 'Ville',
  'tiers.country': 'Pays',
  'tiers.site_web': 'Site web',
  'tiers.statut': 'Statut',
  'tiers.statut_commercial': 'Statut commercial',
  'tiers.notes': 'Notes',
  'tiers.date_naissance': 'Date de naissance',
  'tiers.niveau_entree': "Niveau d'entrée",
  'tiers.objectif_professionnel': 'Objectif professionnel',
  'tiers.situation_handicap': 'Situation de handicap',
  'tiers.besoin_amenagement': "Besoins d'aménagement",
  'tiers.nda_signe': 'NDA signé',
  'tiers.nda_date_signature': 'Date de signature NDA',
  'tiers.nda_document_url': 'Document NDA',
  'tiers.declaration_activite': "Déclaration d'activité (NDA)",
  'tiers.declaration_region': 'Région de déclaration',
  'tiers.qualiopi_certifie': 'Certifié Qualiopi',
  'tiers.qualiopi_certificateur': 'Certificateur',
  'tiers.qualiopi_date_validite': 'Date de fin de validité',
  'tiers.qualiopi_certificat_url': 'Certificat Qualiopi',
  'tiers.fournisseur_type': 'Type de fournisseur',
  'tiers.accord_cadre_signe': 'Accord-cadre signé',
};

// --- Pré-sélection via query param (avant le premier rendu) ---
const ROLES_PERSONNE = ['apprenant'];
const preselectedRole = !route.params.id && route.query.role ? route.query.role : null;
const initialNature = preselectedRole && ROLES_PERSONNE.includes(preselectedRole)
  ? 'personne_physique'
  : 'organisation';

// --- Form state ---
const form = ref({
  nature: initialNature,
  nom_affiche: '',
  email: '',
  telephone: '',
  address: '',
  city: '',
  zip_code: '',
  country: 'France',
  notes: '',
  statut: 'actif',
  statut_commercial: '',
  site_web: '',

  // Organisation
  raison_sociale: '',
  siren: '',
  siret: '',
  naf_ape: '',
  tva_intracom: '',

  // Personne physique
  prenom: '',
  nom_famille: '',

  // Apprenant
  date_naissance: null,
  niveau_entree: '',
  objectif_professionnel: '',
  situation_handicap: 'non_renseigne',
  besoin_amenagement: '',

  // Formateur
  nda_signe: false,
  nda_date_signature: null,
  nda_document_url: '',
  declaration_activite: '',
  declaration_region: '',
  qualiopi_certifie: false,
  qualiopi_certificateur: '',
  qualiopi_date_validite: null,
  qualiopi_certificat_url: '',

  // Fournisseur
  fournisseur_type: '',
  accord_cadre_signe: false,
  accord_cadre_url: '',
});

// --- Rôle exclusif (un seul rôle à la fois) ---
const selectedRole = ref(preselectedRole || null);
const submitting = ref(false);
const errorMsg = ref('');
const { errors, validate, clearError } = useFormValidation();

// --- Computed ---
const isEditMode = computed(() => !!route.params.id);

const ROLE_LABELS = {
  apprenant: 'Nouveau bénéficiaire',
  formateur: 'Nouvel intervenant',
  client: 'Nouveau client',
  fournisseur: 'Nouveau financeur',
};

const pageTitle = computed(() => {
  if (isEditMode.value) return 'Modifier le tiers';
  if (preselectedRole && ROLE_LABELS[preselectedRole]) return ROLE_LABELS[preselectedRole];
  return 'Nouveau tiers';
});

const isOrganisation = computed(() => form.value.nature === 'organisation');
const isPersonne = computed(() => form.value.nature === 'personne_physique');
const forcePersonne = computed(() => selectedRole.value === 'apprenant');

const hasRole = (role) => selectedRole.value === role;

const computedScore = computed(() =>
  computeScore(form.value, selectedRole.value ? [selectedRole.value] : [], [])
);

// --- Sélection de rôle exclusif ---
const selectRole = (roleValue) => {
  if (selectedRole.value === roleValue) {
    selectedRole.value = null;
  } else {
    selectedRole.value = roleValue;
  }
};

// --- Auto-compute nom_affiche ---
watch(
  () => [form.value.nature, form.value.prenom, form.value.nom_famille, form.value.raison_sociale],
  () => {
    if (isPersonne.value) {
      form.value.nom_affiche = `${form.value.prenom} ${form.value.nom_famille}`.trim();
    } else {
      form.value.nom_affiche = form.value.raison_sociale;
    }
  }
);

// --- Force nature selon le rôle : apprenant = personne_physique, autres = organisation ---
watch(
  () => selectedRole.value,
  (role) => {
    if (role === 'apprenant') {
      form.value.nature = 'personne_physique';
    } else if (role) {
      form.value.nature = 'organisation';
    }
  }
);

// --- Reset irrelevant fields on nature change ---
watch(
  () => form.value.nature,
  (newNature) => {
    if (newNature === 'personne_physique') {
      form.value.raison_sociale = '';
      form.value.siren = '';
      form.value.siret = '';
      form.value.naf_ape = '';
      form.value.tva_intracom = '';
    } else {
      form.value.prenom = '';
      form.value.nom_famille = '';
    }
  }
);

// --- SIREN auto-fill ---
watch(
  () => form.value.siren,
  async (siren) => {
    if (!siren) return;
    const clean = siren.replace(/\D/g, '');
    if (clean.length === 9) {
      const result = await lookup(clean);
      if (result) {
        form.value.raison_sociale = result.raison_sociale || form.value.raison_sociale;
        form.value.siret = result.siret || form.value.siret;
        form.value.naf_ape = result.naf_ape || form.value.naf_ape;
        form.value.address = result.adresse || form.value.address;
        form.value.zip_code = result.cp || form.value.zip_code;
        form.value.city = result.ville || form.value.city;
      }
    }
  }
);

// --- Address autocomplete handler ---
const handleAddressSelected = (addressData) => {
  if (addressData.street) form.value.address = addressData.street;
  if (addressData.postcode) form.value.zip_code = addressData.postcode;
  if (addressData.city) form.value.city = addressData.city;
};

// --- File upload handler ---
const onFileUpload = async (event, field) => {
  const result = await uploadFile(event, field);
  if (result.url) {
    form.value[field] = result.url;
  }
};

// --- Submit ---
const handleSubmit = async () => {
  const rules = {};
  if (isPersonne.value) {
    rules.prenom = form.value.prenom;
    rules.nom_famille = form.value.nom_famille;
  } else if (isOrganisation.value) {
    rules.raison_sociale = form.value.raison_sociale;
  }
  const isValid = validate(rules);
  if (!isValid) return;

  submitting.value = true;
  errorMsg.value = '';

  const rolesArray = selectedRole.value ? [selectedRole.value] : [];

  try {
    if (isEditMode.value) {
      const result = await store.updateTier(route.params.id, form.value, rolesArray);

      if (result.success) {
        // Manage role changes
        const existingTier = await store.getTierById(route.params.id);
        const existingRoles = (existingTier?.tiers_roles || []).map(r => r.role);
        const rolesToAdd = rolesArray.filter(r => !existingRoles.includes(r));
        const rolesToRemove = existingRoles.filter(r => !rolesArray.includes(r));

        for (const role of rolesToAdd) {
          await store.addRole(route.params.id, role);
        }
        for (const role of rolesToRemove) {
          await store.removeRole(route.params.id, role);
        }

        showSuccess('Tiers mis à jour', 'Les modifications ont été enregistrées.');
        router.push(`/dashboard/tiers/${route.params.id}`);
      } else {
        errorMsg.value = result.error || 'Erreur lors de la mise à jour.';
        showError('Erreur', errorMsg.value);
      }
    } else {
      const result = await store.createTier(form.value, rolesArray);

      if (result.success) {
        showSuccess('Tiers créé', 'Le tiers a été créé avec succès.');
        router.push('/dashboard/tiers');
      } else {
        errorMsg.value = result.error || 'Erreur lors de la création.';
        showError('Erreur', errorMsg.value);
      }
    }
  } catch (err) {
    errorMsg.value = err.message;
    showError('Erreur', err.message);
  } finally {
    submitting.value = false;
  }
};

const goBack = () => {
  router.push('/dashboard/tiers');
};

// --- Mount: load tier in edit mode + navConfig ---
onMounted(async () => {
  navConfig.fetchConfig();

  if (route.params.id) {
    const tier = await store.getTierById(route.params.id);
    if (tier) {
      Object.keys(form.value).forEach(key => {
        if (tier[key] !== undefined && tier[key] !== null) {
          form.value[key] = tier[key];
        }
      });
      // Parse dates
      if (tier.date_naissance) form.value.date_naissance = new Date(tier.date_naissance);
      if (tier.nda_date_signature) form.value.nda_date_signature = new Date(tier.nda_date_signature);
      if (tier.qualiopi_date_validite) form.value.qualiopi_date_validite = new Date(tier.qualiopi_date_validite);
      // Populate role (exclusive : prendre le premier)
      selectedRole.value = tier.tiers_roles?.[0]?.role || null;
    } else {
      errorMsg.value = 'Impossible de charger les données du tiers.';
    }
  }
});
</script>

<template>
  <div class="max-w-5xl mx-auto pb-20">

    <!-- ====== HEADER ====== -->
    <div class="bg-white dark:bg-gray-800 p-5 shadow-sm sticky top-0 z-10 mb-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 rounded-b-xl">
      <div class="flex items-center gap-4">
        <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        <ScoreBadge :score="computedScore.score" />
      </div>
      <div class="flex gap-2">
        <Button label="Annuler" severity="secondary" outlined @click="goBack" />
        <Button
          :label="isEditMode ? 'Enregistrer' : 'Créer le tiers'"
          icon="pi pi-check"
          :loading="submitting"
          @click="handleSubmit"
        />
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="px-4 sm:px-6 space-y-6">

      <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4">{{ errorMsg }}</Message>

      <!-- Score details -->
      <div v-if="computedScore.missing.length > 0" class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
        <p class="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
          <i class="pi pi-info-circle mr-1"></i> Informations manquantes pour la complétude :
        </p>
        <ul class="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li v-for="item in computedScore.missing" :key="item">{{ item }}</li>
        </ul>
      </div>

      <!-- ====== ROLE SELECTOR (exclusif) ====== -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rôle</h2>
        <p class="text-sm text-gray-500 mb-4">Sélectionnez un rôle unique pour ce tiers.</p>
        <div class="flex flex-wrap gap-3">
          <button
            v-for="role in TIER_ROLE_OPTIONS"
            :key="role.value"
            type="button"
            @click="selectRole(role.value)"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200"
            :class="hasRole(role.value)
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300'"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center"
                 :class="hasRole(role.value) ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'">
              <i :class="'pi ' + role.icon" class="text-sm"></i>
            </div>
            <span class="text-sm font-medium" :class="hasRole(role.value) ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'">{{ role.label }}</span>
          </button>
        </div>
      </div>

      <!-- ====== INFORMATIONS GENERALES ====== -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-blue-500">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <i class="pi pi-id-card text-blue-500"></i>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informations générales</h2>
            </div>
            <div class="flex items-center gap-2">
              <RestoreFieldsButton section-prefix="tiers." />
              <Button
                v-if="isSuperAdmin"
                icon="pi pi-cog"
                text
                rounded
                size="small"
                @click="openFieldPanel('tiers.general')"
                title="Gérer les champs"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

            <!-- Personne physique fields -->
            <template v-if="isPersonne">
              <ManageableField labelKey="tiers.prenom">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.prenom" :defaultLabel="tiersFieldLabels['tiers.prenom']" />
                  <InputText v-model="form.prenom" :placeholder="ph('tiers.prenom', 'Prénom')" :invalid="!!errors.prenom" @input="clearError('prenom')" />
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.nom_famille">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.nom_famille" :defaultLabel="tiersFieldLabels['tiers.nom_famille']" />
                  <InputText v-model="form.nom_famille" :placeholder="ph('tiers.nom_famille', 'Nom de famille')" :invalid="!!errors.nom_famille" @input="clearError('nom_famille')" />
                </div>
              </ManageableField>
            </template>

            <!-- Organisation fields -->
            <template v-if="isOrganisation">
              <ManageableField labelKey="tiers.raison_sociale">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.raison_sociale" :defaultLabel="tiersFieldLabels['tiers.raison_sociale']" />
                  <InputText v-model="form.raison_sociale" :placeholder="ph('tiers.raison_sociale', 'Raison sociale')" :invalid="!!errors.raison_sociale" @input="clearError('raison_sociale')" />
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.siren">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.siren" :defaultLabel="tiersFieldLabels['tiers.siren']" />
                  <div class="relative">
                    <InputText v-model="form.siren" maxlength="9" :placeholder="ph('tiers.siren', '123 456 789')" class="w-full" />
                    <span v-if="sirenLoading" class="absolute right-3 top-1/2 -translate-y-1/2">
                      <i class="pi pi-spin pi-spinner text-blue-500"></i>
                    </span>
                    <span v-else-if="form.siren?.replace(/\D/g, '').length === 9 && form.raison_sociale" class="absolute right-3 top-1/2 -translate-y-1/2">
                      <i class="pi pi-check-circle text-green-500"></i>
                    </span>
                  </div>
                  <span class="text-xs text-gray-400">9 chiffres - auto-remplissage via API entreprise</span>
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.siret">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.siret" :defaultLabel="tiersFieldLabels['tiers.siret']" />
                  <InputText v-model="form.siret" maxlength="14" :placeholder="ph('tiers.siret', '123 456 789 00012')" />
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.naf_ape">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.naf_ape" :defaultLabel="tiersFieldLabels['tiers.naf_ape']" />
                  <InputText v-model="form.naf_ape" maxlength="5" :placeholder="ph('tiers.naf_ape', '8559A')" />
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.tva_intracom">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.tva_intracom" :defaultLabel="tiersFieldLabels['tiers.tva_intracom']" />
                  <InputText v-model="form.tva_intracom" :placeholder="ph('tiers.tva_intracom', 'FR12345678901')" />
                </div>
              </ManageableField>
            </template>

            <!-- Common fields -->
            <Divider class="col-span-1 md:col-span-2" />

            <ManageableField labelKey="tiers.email">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.email" :defaultLabel="tiersFieldLabels['tiers.email']" />
                <InputText v-model="form.email" type="email" :placeholder="ph('tiers.email', 'contact@exemple.com')" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.telephone">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.telephone" :defaultLabel="tiersFieldLabels['tiers.telephone']" />
                <PhoneInput v-model="form.telephone" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.address" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.address" :defaultLabel="tiersFieldLabels['tiers.address']" />
                <AddressAutocomplete
                  v-model="form.address"
                  @address-selected="handleAddressSelected"
                  :placeholder="ph('tiers.address', 'Saisissez une adresse...')"
                />
                <span class="text-xs text-gray-400"><i class="pi pi-info-circle mr-1"></i>Auto-complétion via adresse.data.gouv.fr</span>
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.zip_code">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.zip_code" :defaultLabel="tiersFieldLabels['tiers.zip_code']" />
                <InputText v-model="form.zip_code" maxlength="5" :placeholder="ph('tiers.zip_code', '75001')" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.city">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.city" :defaultLabel="tiersFieldLabels['tiers.city']" />
                <InputText v-model="form.city" :placeholder="ph('tiers.city', 'Paris')" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.country">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.country" :defaultLabel="tiersFieldLabels['tiers.country']" />
                <InputText v-model="form.country" :placeholder="ph('tiers.country', 'France')" />
              </div>
            </ManageableField>
            <ManageableField v-if="!hasRole('apprenant')" labelKey="tiers.site_web">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.site_web" :defaultLabel="tiersFieldLabels['tiers.site_web']" />
                <InputText v-model="form.site_web" :placeholder="ph('tiers.site_web', 'https://www.exemple.com')" />
              </div>
            </ManageableField>

            <Divider class="col-span-1 md:col-span-2" />

            <ManageableField labelKey="tiers.statut">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.statut" :defaultLabel="tiersFieldLabels['tiers.statut']" />
                <Dropdown
                  v-model="form.statut"
                  :options="TIER_STATUTS"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Sélectionner un statut"
                />
              </div>
            </ManageableField>
            <ManageableField v-if="hasRole('client')" labelKey="tiers.statut_commercial">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.statut_commercial" :defaultLabel="tiersFieldLabels['tiers.statut_commercial']" />
                <Dropdown
                  v-model="form.statut_commercial"
                  :options="STATUT_COMMERCIAL"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Sélectionner"
                />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.notes" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.notes" :defaultLabel="tiersFieldLabels['tiers.notes']" />
                <Textarea v-model="form.notes" rows="3" autoResize :placeholder="ph('tiers.notes', 'Notes internes...')" />
              </div>
            </ManageableField>
          </div>

          <!-- Custom fields + Add button for general section -->
          <CustomFieldRenderer section="tiers.general" v-model="customFieldValues.general" class="mt-4" />
          <AddFieldButton section="tiers.general" class="mt-3" />
        </div>
      </div>

      <!-- ====== BLOC APPRENANT ====== -->
      <div v-if="hasRole('apprenant')" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-green-500">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <i class="pi pi-user text-green-500"></i>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informations bénéficiaire</h2>
            </div>
            <div class="flex items-center gap-2">
              <RestoreFieldsButton section-prefix="tiers.apprenant." />
              <Button
                v-if="isSuperAdmin"
                icon="pi pi-cog"
                text
                rounded
                size="small"
                @click="openFieldPanel('tiers.apprenant')"
                title="Gérer les champs"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ManageableField labelKey="tiers.date_naissance">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.date_naissance" :defaultLabel="tiersFieldLabels['tiers.date_naissance']" />
                <DatePicker v-model="form.date_naissance" dateFormat="dd/mm/yy" showIcon placeholder="jj/mm/aaaa" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.niveau_entree">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.niveau_entree" :defaultLabel="tiersFieldLabels['tiers.niveau_entree']" />
                <InputText v-model="form.niveau_entree" :placeholder="ph('tiers.niveau_entree', 'Ex : Bac+2, CAP...')" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.situation_handicap">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.situation_handicap" :defaultLabel="tiersFieldLabels['tiers.situation_handicap']" />
                <Dropdown
                  v-model="form.situation_handicap"
                  :options="HANDICAP_OPTIONS"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Sélectionner"
                />
              </div>
            </ManageableField>
            <ManageableField v-if="form.situation_handicap === 'oui'" labelKey="tiers.besoin_amenagement" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.besoin_amenagement" :defaultLabel="tiersFieldLabels['tiers.besoin_amenagement']" />
                <Textarea v-model="form.besoin_amenagement" rows="3" autoResize :placeholder="ph('tiers.besoin_amenagement', 'Décrivez les besoins d\'aménagement...')" />
              </div>
            </ManageableField>
          </div>

          <!-- Custom fields + Add button for apprenant section -->
          <CustomFieldRenderer section="tiers.apprenant" v-model="customFieldValues.apprenant" class="mt-4" />
          <AddFieldButton section="tiers.apprenant" class="mt-3" />
        </div>
      </div>

      <!-- ====== BLOC FORMATEUR ====== -->
      <div v-if="hasRole('formateur')" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-amber-500">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <i class="pi pi-id-card text-amber-500"></i>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informations intervenant</h2>
            </div>
            <div class="flex items-center gap-2">
              <RestoreFieldsButton section-prefix="tiers.formateur." />
              <Button
                v-if="isSuperAdmin"
                icon="pi pi-cog"
                text
                rounded
                size="small"
                @click="openFieldPanel('tiers.formateur')"
                title="Gérer les champs"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- NDA -->
            <ManageableField labelKey="tiers.nda_signe" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.nda_signe" :defaultLabel="tiersFieldLabels['tiers.nda_signe']" />
                <SelectButton v-model="form.nda_signe" :options="ouiNonOptions" optionLabel="label" optionValue="value" />
              </div>
            </ManageableField>
            <ManageableField v-if="form.nda_signe" labelKey="tiers.nda_date_signature">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.nda_date_signature" :defaultLabel="tiersFieldLabels['tiers.nda_date_signature']" />
                <DatePicker v-model="form.nda_date_signature" dateFormat="dd/mm/yy" showIcon placeholder="jj/mm/aaaa" />
              </div>
            </ManageableField>
            <ManageableField v-if="form.nda_signe" labelKey="tiers.nda_document_url">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.nda_document_url" :defaultLabel="tiersFieldLabels['tiers.nda_document_url']" />
                <FileUpload
                  mode="basic"
                  accept=".pdf"
                  :maxFileSize="10485760"
                  @select="(e) => onFileUpload(e, 'nda_document_url')"
                  chooseLabel="Joindre le NDA"
                  :disabled="fileUploading"
                />
                <a v-if="form.nda_document_url" :href="form.nda_document_url" target="_blank" class="text-sm text-blue-500 underline">
                  <i class="pi pi-file-pdf mr-1"></i>Voir le document
                </a>
              </div>
            </ManageableField>

            <Divider class="col-span-1 md:col-span-2" />

            <!-- Declaration -->
            <ManageableField labelKey="tiers.declaration_activite">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.declaration_activite" :defaultLabel="tiersFieldLabels['tiers.declaration_activite']" />
                <InputText v-model="form.declaration_activite" :placeholder="ph('tiers.declaration_activite', 'Numéro de déclaration')" />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.declaration_region">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.declaration_region" :defaultLabel="tiersFieldLabels['tiers.declaration_region']" />
                <InputText v-model="form.declaration_region" :placeholder="ph('tiers.declaration_region', 'Ex : Île-de-France')" />
              </div>
            </ManageableField>

            <Divider class="col-span-1 md:col-span-2" />

            <!-- Qualiopi -->
            <ManageableField labelKey="tiers.qualiopi_certifie" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.qualiopi_certifie" :defaultLabel="tiersFieldLabels['tiers.qualiopi_certifie']" />
                <SelectButton v-model="form.qualiopi_certifie" :options="ouiNonOptions" optionLabel="label" optionValue="value" />
              </div>
            </ManageableField>
            <template v-if="form.qualiopi_certifie">
              <ManageableField labelKey="tiers.qualiopi_certificateur">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.qualiopi_certificateur" :defaultLabel="tiersFieldLabels['tiers.qualiopi_certificateur']" />
                  <InputText v-model="form.qualiopi_certificateur" :placeholder="ph('tiers.qualiopi_certificateur', 'Nom du certificateur')" />
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.qualiopi_date_validite">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.qualiopi_date_validite" :defaultLabel="tiersFieldLabels['tiers.qualiopi_date_validite']" />
                  <DatePicker v-model="form.qualiopi_date_validite" dateFormat="dd/mm/yy" showIcon placeholder="jj/mm/aaaa" />
                </div>
              </ManageableField>
              <ManageableField labelKey="tiers.qualiopi_certificat_url" class="md:col-span-2">
                <div class="flex flex-col gap-2">
                  <EditableLabel labelKey="tiers.qualiopi_certificat_url" :defaultLabel="tiersFieldLabels['tiers.qualiopi_certificat_url']" />
                  <FileUpload
                    mode="basic"
                    accept=".pdf,image/*"
                    :maxFileSize="10485760"
                    @select="(e) => onFileUpload(e, 'qualiopi_certificat_url')"
                    chooseLabel="Joindre le certificat"
                    :disabled="fileUploading"
                  />
                  <a v-if="form.qualiopi_certificat_url" :href="form.qualiopi_certificat_url" target="_blank" class="text-sm text-blue-500 underline">
                    <i class="pi pi-file-pdf mr-1"></i>Voir le certificat
                  </a>
                </div>
              </ManageableField>
            </template>
          </div>

          <!-- Custom fields + Add button for formateur section -->
          <CustomFieldRenderer section="tiers.formateur" v-model="customFieldValues.formateur" class="mt-4" />
          <AddFieldButton section="tiers.formateur" class="mt-3" />
        </div>
      </div>

      <!-- ====== BLOC FOURNISSEUR ====== -->
      <div v-if="hasRole('fournisseur')" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-gray-500">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <i class="pi pi-briefcase text-gray-500"></i>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Informations financeur</h2>
            </div>
            <div class="flex items-center gap-2">
              <RestoreFieldsButton section-prefix="tiers.fournisseur." />
              <Button
                v-if="isSuperAdmin"
                icon="pi pi-cog"
                text
                rounded
                size="small"
                @click="openFieldPanel('tiers.fournisseur')"
                title="Gérer les champs"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <ManageableField labelKey="tiers.fournisseur_type">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.fournisseur_type" :defaultLabel="tiersFieldLabels['tiers.fournisseur_type']" />
                <Dropdown
                  v-model="form.fournisseur_type"
                  :options="FOURNISSEUR_TYPES"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="Sélectionner un type"
                />
              </div>
            </ManageableField>
            <ManageableField labelKey="tiers.accord_cadre_signe">
              <div class="flex flex-col gap-2">
                <EditableLabel labelKey="tiers.accord_cadre_signe" :defaultLabel="tiersFieldLabels['tiers.accord_cadre_signe']" />
                <SelectButton v-model="form.accord_cadre_signe" :options="ouiNonOptions" optionLabel="label" optionValue="value" />
              </div>
            </ManageableField>
          </div>

          <!-- Custom fields + Add button for fournisseur section -->
          <CustomFieldRenderer section="tiers.fournisseur" v-model="customFieldValues.fournisseur" class="mt-4" />
          <AddFieldButton section="tiers.fournisseur" class="mt-3" />
        </div>
      </div>

    </form>

    <!-- ====== FIELD MANAGER PANEL (shared, dynamic section) ====== -->
    <FieldManagerPanel
      v-if="showFieldPanel"
      :section="activeFieldPanelSection"
      :field-labels="tiersFieldLabels"
      @close="showFieldPanel = false"
    />
  </div>
</template>
