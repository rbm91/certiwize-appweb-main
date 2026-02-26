<script setup>
import { ref, onMounted } from 'vue';
import { useCompanyStore } from '../../stores/company';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../supabase';
import { FORMES_JURIDIQUES, CONDITIONS_PAIEMENT } from '../../config/constants';

// PrimeVue Imports
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import InputMask from 'primevue/inputmask';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';
import Checkbox from 'primevue/checkbox';
import ToggleSwitch from 'primevue/toggleswitch';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import DatePicker from 'primevue/datepicker';

import { useI18n } from 'vue-i18n';
import { useFormValidation } from '../../composables/useFormValidation';
import AddressAutocomplete from '../../components/common/AddressAutocomplete.vue';
import EditableLabel from '../../components/common/EditableLabel.vue';
import ManageableField from '../../components/common/ManageableField.vue';
import AddFieldButton from '../../components/common/AddFieldButton.vue';
import CustomFieldRenderer from '../../components/common/CustomFieldRenderer.vue';
import RestoreFieldsButton from '../../components/common/RestoreFieldsButton.vue';
import FieldManagerPanel from '../../components/common/FieldManagerPanel.vue';
import PhoneInput from '../../components/common/PhoneInput.vue';

import { useNavConfigStore } from '../../stores/navConfig';

const store = useCompanyStore();
const authStore = useAuthStore();
const navConfig = useNavConfigStore();
const { t } = useI18n();
const ph = (key, fallback) => navConfig.getFieldPlaceholder(key, fallback);
const saving = ref(false);
const message = ref(null);
const activeTab = ref(0);
const { errors, validate, clearError } = useFormValidation();

// Valeurs des champs custom par section
const customFieldValues = ref({
  identite: {},
  juridique: {},
  documents: {},
  email: {},
  rgpd: {},
  financier: {}
});

// Panneau de gestion des champs
const fieldPanelSection = ref('');
const fieldPanelLabels = ref({});
const showFieldPanel = ref(false);

// Mapping section custom → préfixes des champs existants
const sectionPrefixes = {
  'settings.identite': ['settings.identity.'],
  'settings.juridique': ['settings.legal.', 'settings.nda.', 'settings.qualiopi.', 'settings.handicap.'],
  'settings.documents': ['settings.docs.'],
  'settings.email': ['settings.email.'],
  'settings.rgpd': ['settings.rgpd.'],
  'settings.financier': ['settings.financier.']
};

const openFieldPanel = (section) => {
  fieldPanelSection.value = section;
  // Filtrer les labels pertinents pour cette section
  const prefixes = sectionPrefixes[section] || [];
  const filtered = {};
  for (const [key, label] of Object.entries(fieldLabelsMap)) {
    if (prefixes.some(p => key.startsWith(p))) {
      filtered[key] = label;
    }
  }
  fieldPanelLabels.value = filtered;
  showFieldPanel.value = true;
};

// Labels lisibles pour les champs masqués (pour le dialog de restauration)
const fieldLabelsMap = {
  'settings.identity.raison_sociale': 'Raison sociale',
  'settings.identity.forme_juridique': 'Forme juridique',
  'settings.identity.representant_legal': 'Représentant légal',
  'settings.identity.devise': 'Devise',
  'settings.identity.adresse': 'Adresse',
  'settings.identity.code_postal': 'Code postal',
  'settings.identity.ville': 'Ville',
  'settings.identity.pays': 'Pays',
  'settings.identity.telephone': 'Téléphone',
  'settings.identity.email': 'Email général',
  'settings.identity.site_web': 'Site web',
  'settings.identity.logo': 'Logo',
  'settings.legal.siren': 'SIREN',
  'settings.legal.siret': 'SIRET',
  'settings.legal.naf_ape': 'Code NAF/APE',
  'settings.legal.tva_intracom': 'N° TVA intracommunautaire',
  'settings.legal.capital': 'Capital social',
  'settings.legal.rcs_rm': 'RCS / RM',
  'settings.nda.numero': 'Numéro NDA',
  'settings.nda.date_enregistrement': 'Date enregistrement NDA',
  'settings.nda.region': 'Région enregistrement NDA',
  'settings.nda.afficher_conventions': 'NDA sur conventions',
  'settings.nda.afficher_factures': 'NDA sur factures',
  'settings.nda.afficher_commerciaux': 'NDA sur documents commerciaux',
  'settings.qualiopi.certifie': 'Certifié Qualiopi',
  'settings.qualiopi.certificateur': 'Certificateur',
  'settings.qualiopi.date_certif': 'Date certification',
  'settings.qualiopi.date_fin': 'Date fin Qualiopi',
  'settings.qualiopi.certificat': 'Certificat Qualiopi',
  'settings.handicap.nom': 'Nom référent handicap',
  'settings.handicap.email': 'Email référent handicap',
  'settings.handicap.telephone': 'Tél référent handicap',
  'settings.handicap.afficher_programmes': 'Afficher sur programmes',
  'settings.docs.afficher_logo': 'Afficher le logo',
  'settings.docs.signature_representant': 'Signature représentant',
  'settings.docs.mention_rgpd': 'Mention RGPD',
  'settings.docs.mention_nda': 'Mention NDA',
  'settings.email.nom_expediteur': 'Nom expéditeur',
  'settings.email.email_envoi': 'Email envoi',
  'settings.email.signature': 'Signature email',
  'settings.email.envoi_auto': 'Envoi automatique',
  'settings.email.signature_electronique': 'Signature électronique',
  'settings.rgpd.dpo_nom': 'Nom DPO',
  'settings.rgpd.dpo_email': 'Email DPO',
  'settings.rgpd.politique': 'Politique confidentialité',
  'settings.rgpd.duree_conservation': 'Durée conservation',
  'settings.financier.assujetti_tva': 'Assujetti TVA',
  'settings.financier.taux_tva': 'Taux TVA',
  'settings.financier.iban': 'IBAN',
  'settings.financier.bic': 'BIC',
  'settings.financier.acompte': 'Acompte',
  'settings.financier.conditions_paiement': 'Conditions paiement',
  'settings.financier.acomptes_multiples': 'Acomptes multiples',
  'settings.financier.penalite_annulation': 'Pénalité annulation',
  'settings.financier.penalite_pourcentage': '% pénalité',
  'settings.financier.seuil_satisfaction_chaud': 'Seuil satisfaction chaud',
  'settings.financier.seuil_satisfaction_formateur': 'Seuil satisfaction formateur',
  'settings.financier.seuil_satisfaction_financeur': 'Seuil satisfaction financeur',
  'settings.financier.seuil_quiz': 'Seuil quiz',
  'settings.financier.seuil_taux_reponse': 'Seuil taux réponse',
  'settings.financier.declenchement_critique': 'Déclenchement critique'
};

// Données locales du formulaire — structure CDC 6 onglets
const form = ref({
  // ── Onglet 1 : Identité & coordonnées ──
  name: '',
  forme_juridique: '',
  address: '',
  zip_code: '',
  city: '',
  country: 'France',
  phone: '',
  email: '',
  currency: 'EUR',
  logo_url: '',
  representant_legal: '',
  website: '',

  // ── Onglet 2 : Juridique & conformité ──
  nda_numero: '',
  nda_date_enregistrement: null,
  nda_region: '',
  nda_afficher_conventions: false,
  nda_afficher_factures: false,
  nda_afficher_commerciaux: false,
  qualiopi_certifie: false,
  qualiopi_certificateur: '',
  qualiopi_date_certification: null,
  qualiopi_date_fin: null,
  qualiopi_certificat_url: '',
  handicap_nom: '',
  handicap_email: '',
  handicap_telephone: '',
  handicap_afficher_programmes: false,

  // Champs juridiques existants conservés
  capital: 0,
  vat_number: '',
  siren: '',
  siret: '',
  naf_ape: '',
  rcs_rm: '',

  // ── Onglet 3 : Paramètres documents ──
  doc_afficher_logo: true,
  doc_signature_representant: false,
  doc_mention_rgpd: false,
  doc_mention_nda: false,

  // ── Onglet 4 : Email & envoi ──
  email_nom_expediteur: '',
  email_signature: '',
  email_envoi_auto: false,
  email_signature_electronique: false,

  // ── Onglet 5 : RGPD & DPO ──
  dpo_nom: '',
  dpo_email: '',
  politique_confidentialite: '',
  duree_conservation_donnees: 5,

  // ── Onglet 6 : Financier ──
  tva_assujetti: true,
  tva_taux_defaut: 20.00,
  iban: '',
  bic: '',

  // Seuils qualité
  seuil_satisfaction_chaud: 80,
  seuil_satisfaction_formateur: 80,
  seuil_satisfaction_financeur: 80,
  seuil_quiz_validation: 70,
  seuil_taux_reponse: 60,
  declenchement_question_critique: true,

  // Paramètres facturation
  acompte_pourcentage: 30,
  acomptes_multiples: false,
  penalite_annulation: false,
  penalite_pourcentage: 0,
  conditions_paiement_defaut: '30_jours',

  // Champs existants conservés pour rétro-compat
  taxes_config: { vat_subject: true, tax_2: false, tax_3: false, fiscal_stamp: false },
  socials: {},
  opening_hours: {},
  accountant_info: {},
});

// Options
const currencies = ['EUR', 'USD', 'GBP', 'CHF'];
const countries = ['France', 'Belgique', 'Suisse', 'Canada', 'Luxembourg'];
const regions = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne',
  'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France',
  'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
  'Pays de la Loire', "Provence-Alpes-Côte d'Azur",
  'Guadeloupe', 'Martinique', 'Guyane', 'La Réunion', 'Mayotte'
];
const conditionsPaiementOptions = CONDITIONS_PAIEMENT.map(c => ({
  label: c.label, value: c.value
}));

onMounted(async () => {
  await store.fetchCompany();
  if (store.company) {
    form.value = { ...form.value, ...store.company };
    // Garantir les objets imbriqués
    form.value.taxes_config = store.company.taxes_config || form.value.taxes_config;
    form.value.socials = store.company.socials || {};
    form.value.opening_hours = store.company.opening_hours || {};
    form.value.accountant_info = store.company.accountant_info || {};
  }
});

const handleSave = async () => {
  const isValid = validate({ name: form.value.name });
  if (!isValid) {
    message.value = { severity: 'error', text: 'La raison sociale est obligatoire.' };
    return;
  }

  saving.value = true;
  message.value = null;
  const res = await store.saveCompany(form.value);
  if (res.success) {
    message.value = { severity: 'success', text: 'Paramètres sauvegardés avec succès' };
  } else {
    message.value = { severity: 'error', text: `Erreur : ${res.error}` };
  }
  saving.value = false;
};

// Handler autocomplétion adresse
const handleAddressSelected = (addressData) => {
  if (addressData.street) form.value.address = addressData.street;
  if (addressData.postcode) form.value.zip_code = addressData.postcode;
  if (addressData.city) form.value.city = addressData.city;
};

// Upload Logo
const uploadLogo = async (event) => {
  await authStore.refreshSession();
  const file = event.files[0];
  if (!file) return;
  const fileName = `${Date.now()}-logo-${file.name}`;
  const { error } = await supabase.storage.from('company-logos').upload(fileName, file);
  if (!error) {
    const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
    form.value.logo_url = urlData.publicUrl;
  }
};

// Upload certificat Qualiopi
const uploadQualiopi = async (event) => {
  await authStore.refreshSession();
  const file = event.files[0];
  if (!file) return;
  const fileName = `${Date.now()}-qualiopi-${file.name}`;
  const { error } = await supabase.storage.from('company-logos').upload(fileName, file);
  if (!error) {
    const { data: urlData } = supabase.storage.from('company-logos').getPublicUrl(fileName);
    form.value.qualiopi_certificat_url = urlData.publicUrl;
  }
};
</script>

<template>
  <div class="max-w-6xl mx-auto pb-20">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white"><EditableLabel labelKey="settings.page_title" defaultLabel="Paramètres de l'entreprise" tag="span" /></h1>
      <Button label="Enregistrer" icon="pi pi-save" :loading="saving" @click="handleSave" />
    </div>

    <Message v-if="message" :severity="message.severity" class="mb-4">{{ message.text }}</Message>

    <div class="card bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <TabView v-model:activeIndex="activeTab">

        <!-- ═══════════════════════════════════ -->
        <!-- ONGLET 1 : Identité & Coordonnées -->
        <!-- ═══════════════════════════════════ -->
        <TabPanel header="Identité & coordonnées">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            <ManageableField fieldKey="settings.identity.raison_sociale">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.raison_sociale" defaultLabel="Raison sociale" /> <span class="text-red-500">*</span></label>
                <InputText v-model="form.name" :placeholder="ph('settings.identity.raison_sociale', 'Nom de l\'entreprise')" :invalid="!!errors.name" @input="clearError('name')" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="settings.identity.forme_juridique">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.forme_juridique" defaultLabel="Forme juridique" /></label>
                <Dropdown v-model="form.forme_juridique" :options="FORMES_JURIDIQUES" optionLabel="label" optionValue="value" :placeholder="ph('settings.identity.forme_juridique', 'Sélectionner')" />
              </div>
            </ManageableField>

            <ManageableField fieldKey="settings.identity.representant_legal">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.representant_legal" defaultLabel="Représentant légal" /></label>
                <InputText v-model="form.representant_legal" :placeholder="ph('settings.identity.representant_legal', 'Prénom Nom')" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="settings.identity.devise">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.devise" defaultLabel="Devise" /></label>
                <Dropdown v-model="form.currency" :options="currencies" />
              </div>
            </ManageableField>

            <ManageableField fieldKey="settings.identity.adresse" class="md:col-span-2">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.adresse" defaultLabel="Adresse" /></label>
                <AddressAutocomplete
                  v-model="form.address"
                  @address-selected="handleAddressSelected"
                  :placeholder="ph('settings.identity.adresse', 'Saisissez une adresse...')"
                />
                <span class="text-xs text-gray-400"><i class="pi pi-info-circle mr-1"></i>Auto-complétion via adresse.data.gouv.fr</span>
              </div>
            </ManageableField>

            <ManageableField fieldKey="settings.identity.code_postal">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.code_postal" defaultLabel="Code postal" /></label>
                <InputMask v-model="form.zip_code" mask="99999" :placeholder="ph('settings.identity.code_postal', '75001')" slotChar="" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="settings.identity.ville">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.ville" defaultLabel="Ville" /></label>
                <InputText v-model="form.city" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="settings.identity.pays">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.pays" defaultLabel="Pays" /></label>
                <Dropdown v-model="form.country" :options="countries" />
              </div>
            </ManageableField>

            <ManageableField fieldKey="settings.identity.telephone">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.telephone" defaultLabel="Téléphone" /></label>
                <PhoneInput v-model="form.phone" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="settings.identity.email">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.email" defaultLabel="Email général" /></label>
                <InputText v-model="form.email" type="email" :placeholder="ph('settings.identity.email', 'contact@entreprise.fr')" />
              </div>
            </ManageableField>
            <ManageableField fieldKey="settings.identity.site_web">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.site_web" defaultLabel="Site web" /></label>
                <InputText v-model="form.website" type="url" :placeholder="ph('settings.identity.site_web', 'https://www.entreprise.fr')" />
              </div>
            </ManageableField>

            <ManageableField fieldKey="settings.identity.logo">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.identity.logo" defaultLabel="Logo" /></label>
                <img v-if="form.logo_url" :src="form.logo_url" class="h-16 mb-2 object-contain" />
                <FileUpload mode="basic" name="logo" accept="image/*" :auto="true" @select="uploadLogo" chooseLabel="Choisir un logo" />
              </div>
            </ManageableField>

            <!-- Champs custom + Restaurer + Ajouter -->
            <div class="md:col-span-2">
              <CustomFieldRenderer section="settings.identite" v-model="customFieldValues.identite" />
              <div class="flex items-center gap-4 mt-4">
                <AddFieldButton section="settings.identite" @open-manager="openFieldPanel('settings.identite')" />
                <RestoreFieldsButton section="settings.identity" :fieldLabels="fieldLabelsMap" />
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- ═══════════════════════════════════ -->
        <!-- ONGLET 2 : Juridique & Conformité -->
        <!-- ═══════════════════════════════════ -->
        <TabPanel header="Juridique & conformité">
          <div class="p-4 space-y-8">

            <!-- Identifiants légaux -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-id-card text-blue-500"></i> <EditableLabel labelKey="settings.legal.section_identifiants" defaultLabel="Identifiants légaux" />
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ManageableField fieldKey="settings.legal.siren">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.legal.siren" defaultLabel="SIREN" /></label>
                    <InputMask v-model="form.siren" mask="999 999 999" :placeholder="ph('settings.legal.siren', '123 456 789')" slotChar="" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.legal.siret">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.legal.siret" defaultLabel="SIRET" /></label>
                    <InputMask v-model="form.siret" mask="999 999 999 99999" :placeholder="ph('settings.legal.siret', '123 456 789 00012')" slotChar="" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.legal.naf_ape">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.legal.naf_ape" defaultLabel="Code NAF/APE" /></label>
                    <InputMask v-model="form.naf_ape" mask="9999a" :placeholder="ph('settings.legal.naf_ape', '8559A')" slotChar="" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.legal.tva_intracom">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.legal.tva_intracom" defaultLabel="N° TVA intracommunautaire" /></label>
                    <InputText v-model="form.vat_number" :placeholder="ph('settings.legal.tva_intracom', 'FR12345678901')" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.legal.capital">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.legal.capital" defaultLabel="Capital social" /></label>
                    <InputNumber v-model="form.capital" mode="currency" currency="EUR" :min="0" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.legal.rcs_rm">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.legal.rcs_rm" defaultLabel="RCS / RM" /></label>
                    <InputText v-model="form.rcs_rm" :placeholder="ph('settings.legal.rcs_rm', 'Paris B 123 456 789')" />
                  </div>
                </ManageableField>
              </div>
            </div>

            <Divider />

            <!-- NDA -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-file text-green-500"></i> <EditableLabel labelKey="settings.nda.section_title" defaultLabel="Numéro de Déclaration d'Activité (NDA)" />
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ManageableField fieldKey="settings.nda.numero">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.nda.numero" defaultLabel="Numéro NDA" /></label>
                    <InputText v-model="form.nda_numero" :placeholder="ph('settings.nda.numero', '11 75 12345 67')" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.nda.date_enregistrement">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.nda.date_enregistrement" defaultLabel="Date d'enregistrement" /></label>
                    <DatePicker v-model="form.nda_date_enregistrement" dateFormat="dd/mm/yy" showIcon />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.nda.region">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.nda.region" defaultLabel="Région d'enregistrement" /></label>
                    <Dropdown v-model="form.nda_region" :options="regions" :placeholder="ph('settings.nda.region', 'Sélectionner')" editable />
                  </div>
                </ManageableField>
              </div>
              <div class="flex flex-col gap-3 mt-4">
                <ManageableField fieldKey="settings.nda.afficher_conventions">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.nda_afficher_conventions" />
                    <label>Afficher le NDA sur les conventions</label>
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.nda.afficher_factures">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.nda_afficher_factures" />
                    <label>Afficher le NDA sur les factures</label>
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.nda.afficher_commerciaux">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.nda_afficher_commerciaux" />
                    <label>Afficher le NDA sur les documents commerciaux</label>
                  </div>
                </ManageableField>
              </div>
            </div>

            <Divider />

            <!-- Qualiopi -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-verified text-purple-500"></i> <EditableLabel labelKey="settings.qualiopi.section_title" defaultLabel="Certification Qualiopi" />
              </h3>
              <ManageableField fieldKey="settings.qualiopi.certifie">
                <div class="flex items-center gap-3 mb-4">
                  <ToggleSwitch v-model="form.qualiopi_certifie" />
                  <label class="font-semibold"><EditableLabel labelKey="settings.qualiopi.certifie" defaultLabel="Organisme certifié Qualiopi" /></label>
                </div>
              </ManageableField>
              <div v-if="form.qualiopi_certifie" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ManageableField fieldKey="settings.qualiopi.certificateur">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.qualiopi.certificateur" defaultLabel="Certificateur" /></label>
                    <InputText v-model="form.qualiopi_certificateur" :placeholder="ph('settings.qualiopi.certificateur', 'AFNOR, Bureau Veritas...')" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.qualiopi.date_certif">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.qualiopi.date_certif" defaultLabel="Date de certification" /></label>
                    <DatePicker v-model="form.qualiopi_date_certification" dateFormat="dd/mm/yy" showIcon />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.qualiopi.date_fin">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.qualiopi.date_fin" defaultLabel="Date de fin de validité" /></label>
                    <DatePicker v-model="form.qualiopi_date_fin" dateFormat="dd/mm/yy" showIcon />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.qualiopi.certificat">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.qualiopi.certificat" defaultLabel="Certificat (PDF)" /></label>
                    <div v-if="form.qualiopi_certificat_url" class="flex items-center gap-2 mb-2">
                      <a :href="form.qualiopi_certificat_url" target="_blank" class="text-blue-500 underline text-sm">Voir le certificat</a>
                    </div>
                    <FileUpload mode="basic" name="qualiopi" accept=".pdf,image/*" :auto="true" @select="uploadQualiopi" chooseLabel="Charger certificat" />
                  </div>
                </ManageableField>
              </div>
            </div>

            <Divider />

            <!-- Référent Handicap -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-heart text-orange-500"></i> <EditableLabel labelKey="settings.handicap.section_title" defaultLabel="Référent Handicap" />
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ManageableField fieldKey="settings.handicap.nom">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.handicap.nom" defaultLabel="Nom" /></label>
                    <InputText v-model="form.handicap_nom" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.handicap.email">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.handicap.email" defaultLabel="Email" /></label>
                    <InputText v-model="form.handicap_email" type="email" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.handicap.telephone">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.handicap.telephone" defaultLabel="Téléphone" /></label>
                    <PhoneInput v-model="form.handicap_telephone" />
                  </div>
                </ManageableField>
              </div>
              <ManageableField fieldKey="settings.handicap.afficher_programmes">
                <div class="flex items-center gap-3 mt-4">
                  <ToggleSwitch v-model="form.handicap_afficher_programmes" />
                  <label>Afficher les coordonnées du référent sur les programmes</label>
                </div>
              </ManageableField>
            </div>

            <!-- Champs custom + Restaurer + Ajouter -->
            <div>
              <CustomFieldRenderer section="settings.juridique" v-model="customFieldValues.juridique" />
              <div class="flex items-center gap-4 mt-4">
                <AddFieldButton section="settings.juridique" @open-manager="openFieldPanel('settings.juridique')" />
                <RestoreFieldsButton section="settings.legal" :fieldLabels="fieldLabelsMap" />
                <RestoreFieldsButton section="settings.nda" :fieldLabels="fieldLabelsMap" />
                <RestoreFieldsButton section="settings.qualiopi" :fieldLabels="fieldLabelsMap" />
                <RestoreFieldsButton section="settings.handicap" :fieldLabels="fieldLabelsMap" />
              </div>
            </div>
          </div>
        </TabPanel>

        <!-- ═══════════════════════════════════ -->
        <!-- ONGLET 3 : Paramètres Documents   -->
        <!-- ═══════════════════════════════════ -->
        <TabPanel header="Documents">
          <div class="p-4 space-y-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <i class="pi pi-file-edit text-blue-500"></i> <EditableLabel labelKey="settings.docs.section_title" defaultLabel="Options globales des documents générés" />
            </h3>

            <div class="flex flex-col gap-4">
              <ManageableField fieldKey="settings.docs.afficher_logo">
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <ToggleSwitch v-model="form.doc_afficher_logo" />
                  <div>
                    <label class="font-semibold"><EditableLabel labelKey="settings.docs.afficher_logo" defaultLabel="Afficher le logo" /></label>
                    <p class="text-sm text-gray-500">Le logo de l'entreprise sera affiché sur tous les documents générés</p>
                  </div>
                </div>
              </ManageableField>

              <ManageableField fieldKey="settings.docs.signature_representant">
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <ToggleSwitch v-model="form.doc_signature_representant" />
                  <div>
                    <label class="font-semibold"><EditableLabel labelKey="settings.docs.signature_representant" defaultLabel="Signature du représentant" /></label>
                    <p class="text-sm text-gray-500">Ajouter automatiquement le bloc signature du représentant légal</p>
                  </div>
                </div>
              </ManageableField>

              <ManageableField fieldKey="settings.docs.mention_rgpd">
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <ToggleSwitch v-model="form.doc_mention_rgpd" />
                  <div>
                    <label class="font-semibold"><EditableLabel labelKey="settings.docs.mention_rgpd" defaultLabel="Mention RGPD" /></label>
                    <p class="text-sm text-gray-500">Ajouter la mention RGPD en pied de page des documents</p>
                  </div>
                </div>
              </ManageableField>

              <ManageableField fieldKey="settings.docs.mention_nda">
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <ToggleSwitch v-model="form.doc_mention_nda" />
                  <div>
                    <label class="font-semibold"><EditableLabel labelKey="settings.docs.mention_nda" defaultLabel="Mention NDA" /></label>
                    <p class="text-sm text-gray-500">Ajouter le numéro de déclaration d'activité sur les documents</p>
                  </div>
                </div>
              </ManageableField>
            </div>

            <!-- Champs custom + Restaurer + Ajouter -->
            <CustomFieldRenderer section="settings.documents" v-model="customFieldValues.documents" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="settings.documents" @open-manager="openFieldPanel('settings.documents')" />
              <RestoreFieldsButton section="settings.docs" :fieldLabels="fieldLabelsMap" />
            </div>

            <Divider />

            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div class="flex items-center gap-2 mb-2">
                <i class="pi pi-info-circle text-blue-500"></i>
                <span class="font-semibold text-blue-700 dark:text-blue-300">Modèles de documents</span>
              </div>
              <p class="text-sm text-blue-600 dark:text-blue-400">
                Les modèles de documents (convention, programme, devis, facture) sont gérés dans la section
                <strong>Paramètres &gt; Types de documents</strong>.
              </p>
            </div>
          </div>
        </TabPanel>

        <!-- ═══════════════════════════════════ -->
        <!-- ONGLET 4 : Email & Envoi           -->
        <!-- ═══════════════════════════════════ -->
        <TabPanel header="Email & envoi">
          <div class="p-4 space-y-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <i class="pi pi-envelope text-blue-500"></i> <EditableLabel labelKey="settings.email.section_title" defaultLabel="Configuration des emails" />
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ManageableField fieldKey="settings.email.nom_expediteur">
                <div class="flex flex-col gap-2">
                  <label class="font-semibold"><EditableLabel labelKey="settings.email.nom_expediteur" defaultLabel="Nom de l'expéditeur" /></label>
                  <InputText v-model="form.email_nom_expediteur" :placeholder="ph('settings.email.nom_expediteur', 'Mon Organisme de Formation')" />
                  <small class="text-gray-500">Nom affiché dans les emails envoyés</small>
                </div>
              </ManageableField>
              <ManageableField fieldKey="settings.email.email_envoi">
                <div class="flex flex-col gap-2">
                  <label class="font-semibold"><EditableLabel labelKey="settings.email.email_envoi" defaultLabel="Email d'envoi" /></label>
                  <InputText v-model="form.email" type="email" :placeholder="ph('settings.email.email_envoi', 'envoi@organisme.fr')" />
                  <small class="text-gray-500">Adresse utilisée pour l'envoi des documents</small>
                </div>
              </ManageableField>
            </div>

            <ManageableField fieldKey="settings.email.signature">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.email.signature" defaultLabel="Signature email" /></label>
                <Textarea v-model="form.email_signature" rows="4" :placeholder="ph('settings.email.signature', 'Cordialement,\nL\'équipe Mon Organisme...')" />
                <small class="text-gray-500">Signature ajoutée automatiquement à chaque email envoyé</small>
              </div>
            </ManageableField>

            <Divider />

            <div class="flex flex-col gap-4">
              <ManageableField fieldKey="settings.email.envoi_auto">
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <ToggleSwitch v-model="form.email_envoi_auto" />
                  <div>
                    <label class="font-semibold"><EditableLabel labelKey="settings.email.envoi_auto" defaultLabel="Envoi automatique" /></label>
                    <p class="text-sm text-gray-500">Envoyer automatiquement les documents à leur génération (convention, convocation, attestation)</p>
                  </div>
                </div>
              </ManageableField>

              <ManageableField fieldKey="settings.email.signature_electronique">
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <ToggleSwitch v-model="form.email_signature_electronique" />
                  <div>
                    <label class="font-semibold"><EditableLabel labelKey="settings.email.signature_electronique" defaultLabel="Signature électronique" /></label>
                    <p class="text-sm text-gray-500">Activer la signature électronique pour les conventions et contrats</p>
                  </div>
                </div>
              </ManageableField>
            </div>

            <!-- Champs custom + Restaurer + Ajouter -->
            <CustomFieldRenderer section="settings.email" v-model="customFieldValues.email" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="settings.email" @open-manager="openFieldPanel('settings.email')" />
              <RestoreFieldsButton section="settings.email" :fieldLabels="fieldLabelsMap" />
            </div>
          </div>
        </TabPanel>

        <!-- ═══════════════════════════════════ -->
        <!-- ONGLET 5 : RGPD & DPO              -->
        <!-- ═══════════════════════════════════ -->
        <TabPanel header="RGPD & DPO">
          <div class="p-4 space-y-6">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <i class="pi pi-shield text-green-500"></i> <EditableLabel labelKey="settings.rgpd.section_dpo" defaultLabel="Délégué à la Protection des Données (DPO)" />
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ManageableField fieldKey="settings.rgpd.dpo_nom">
                <div class="flex flex-col gap-2">
                  <label class="font-semibold"><EditableLabel labelKey="settings.rgpd.dpo_nom" defaultLabel="Nom du DPO" /></label>
                  <InputText v-model="form.dpo_nom" :placeholder="ph('settings.rgpd.dpo_nom', 'Prénom Nom')" />
                </div>
              </ManageableField>
              <ManageableField fieldKey="settings.rgpd.dpo_email">
                <div class="flex flex-col gap-2">
                  <label class="font-semibold"><EditableLabel labelKey="settings.rgpd.dpo_email" defaultLabel="Email du DPO" /></label>
                  <InputText v-model="form.dpo_email" type="email" :placeholder="ph('settings.rgpd.dpo_email', 'dpo@organisme.fr')" />
                </div>
              </ManageableField>
            </div>

            <Divider />

            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
              <i class="pi pi-lock text-green-500"></i> <EditableLabel labelKey="settings.rgpd.section_politique" defaultLabel="Politique de confidentialité" />
            </h3>

            <ManageableField fieldKey="settings.rgpd.politique">
              <div class="flex flex-col gap-2">
                <label class="font-semibold"><EditableLabel labelKey="settings.rgpd.politique" defaultLabel="Politique de confidentialité" /></label>
                <Textarea v-model="form.politique_confidentialite" rows="6"
                  :placeholder="ph('settings.rgpd.politique', 'Décrivez votre politique de traitement des données personnelles...')" />
                <small class="text-gray-500">Ce texte pourra être intégré dans les documents à destination des apprenants</small>
              </div>
            </ManageableField>

            <ManageableField fieldKey="settings.rgpd.duree_conservation">
              <div class="flex flex-col gap-2 max-w-xs">
                <label class="font-semibold"><EditableLabel labelKey="settings.rgpd.duree_conservation" defaultLabel="Durée de conservation des données (années)" /></label>
                <InputNumber v-model="form.duree_conservation_donnees" :min="1" :max="20" showButtons />
                <small class="text-gray-500">Durée légale minimale : 5 ans pour les OF</small>
              </div>
            </ManageableField>

            <!-- Champs custom + Restaurer + Ajouter -->
            <CustomFieldRenderer section="settings.rgpd" v-model="customFieldValues.rgpd" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="settings.rgpd" @open-manager="openFieldPanel('settings.rgpd')" />
              <RestoreFieldsButton section="settings.rgpd" :fieldLabels="fieldLabelsMap" />
            </div>
          </div>
        </TabPanel>

        <!-- ═══════════════════════════════════ -->
        <!-- ONGLET 6 : Financier                -->
        <!-- ═══════════════════════════════════ -->
        <TabPanel header="Financier">
          <div class="p-4 space-y-8">

            <!-- TVA & Coordonnées bancaires -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-wallet text-blue-500"></i> <EditableLabel labelKey="settings.financier.section_tva" defaultLabel="TVA & Coordonnées bancaires" />
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ManageableField fieldKey="settings.financier.assujetti_tva">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.tva_assujetti" />
                    <label class="font-semibold"><EditableLabel labelKey="settings.financier.assujetti_tva" defaultLabel="Assujetti à la TVA" /></label>
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.taux_tva">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.taux_tva" defaultLabel="Taux TVA par défaut (%)" /></label>
                    <InputNumber v-model="form.tva_taux_defaut" :min="0" :max="30" :minFractionDigits="2" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.iban">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.iban" defaultLabel="IBAN" /></label>
                    <InputText v-model="form.iban" :placeholder="ph('settings.financier.iban', 'FR76 XXXX XXXX XXXX XXXX XXXX XXX')" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.bic">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.bic" defaultLabel="BIC" /></label>
                    <InputText v-model="form.bic" :placeholder="ph('settings.financier.bic', 'BNPAFRPP')" />
                  </div>
                </ManageableField>
              </div>
            </div>

            <Divider />

            <!-- Paramètres facturation -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-receipt text-orange-500"></i> <EditableLabel labelKey="settings.financier.section_facturation" defaultLabel="Paramètres de facturation" />
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ManageableField fieldKey="settings.financier.acompte">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.acompte" defaultLabel="% acompte par défaut" /></label>
                    <InputNumber v-model="form.acompte_pourcentage" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.conditions_paiement">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.conditions_paiement" defaultLabel="Conditions de paiement par défaut" /></label>
                    <Dropdown v-model="form.conditions_paiement_defaut" :options="conditionsPaiementOptions"
                      optionLabel="label" optionValue="value" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.acomptes_multiples">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.acomptes_multiples" />
                    <label><EditableLabel labelKey="settings.financier.acomptes_multiples" defaultLabel="Autoriser les acomptes multiples" /></label>
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.penalite_annulation">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.penalite_annulation" />
                    <label><EditableLabel labelKey="settings.financier.penalite_annulation" defaultLabel="Pénalité d'annulation" /></label>
                  </div>
                </ManageableField>
                <ManageableField v-if="form.penalite_annulation" fieldKey="settings.financier.penalite_pourcentage">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.penalite_pourcentage" defaultLabel="% pénalité d'annulation" /></label>
                    <InputNumber v-model="form.penalite_pourcentage" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
              </div>
            </div>

            <Divider />

            <!-- Seuils qualité -->
            <div>
              <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="pi pi-chart-bar text-purple-500"></i> <EditableLabel labelKey="settings.financier.section_seuils" defaultLabel="Seuils qualité" />
              </h3>
              <p class="text-sm text-gray-500 mb-4">
                Ces seuils déclenchent automatiquement des signaux qualité lorsqu'ils ne sont pas atteints.
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ManageableField fieldKey="settings.financier.seuil_satisfaction_chaud">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.seuil_satisfaction_chaud" defaultLabel="Satisfaction stagiaires (à chaud)" /></label>
                    <InputNumber v-model="form.seuil_satisfaction_chaud" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.seuil_satisfaction_formateur">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.seuil_satisfaction_formateur" defaultLabel="Satisfaction formateurs" /></label>
                    <InputNumber v-model="form.seuil_satisfaction_formateur" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.seuil_satisfaction_financeur">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.seuil_satisfaction_financeur" defaultLabel="Satisfaction financeurs" /></label>
                    <InputNumber v-model="form.seuil_satisfaction_financeur" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.seuil_quiz">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.seuil_quiz" defaultLabel="Quiz de validation (seuil réussite)" /></label>
                    <InputNumber v-model="form.seuil_quiz_validation" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.seuil_taux_reponse">
                  <div class="flex flex-col gap-2">
                    <label><EditableLabel labelKey="settings.financier.seuil_taux_reponse" defaultLabel="Taux de réponse minimum" /></label>
                    <InputNumber v-model="form.seuil_taux_reponse" :min="0" :max="100" suffix=" %" />
                  </div>
                </ManageableField>
                <ManageableField fieldKey="settings.financier.declenchement_critique">
                  <div class="flex items-center gap-3">
                    <ToggleSwitch v-model="form.declenchement_question_critique" />
                    <label><EditableLabel labelKey="settings.financier.declenchement_critique" defaultLabel="Déclencher un signal sur question critique" /></label>
                  </div>
                </ManageableField>
              </div>
            </div>

            <!-- Champs custom + Restaurer + Ajouter -->
            <CustomFieldRenderer section="settings.financier" v-model="customFieldValues.financier" />
            <div class="flex items-center gap-4 mt-2">
              <AddFieldButton section="settings.financier" @open-manager="openFieldPanel('settings.financier')" />
              <RestoreFieldsButton section="settings.financier" :fieldLabels="fieldLabelsMap" />
            </div>
          </div>
        </TabPanel>

      </TabView>
    </div>
  </div>
  <FieldManagerPanel
    v-model:visible="showFieldPanel"
    :section="fieldPanelSection"
    :fieldLabels="fieldPanelLabels"
    title="Gérer les champs"
  />
</template>
