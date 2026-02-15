<script setup>
import { ref, onMounted, computed } from 'vue';
import { useDataStore } from '../../stores/data';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

// Imports PrimeVue
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import Checkbox from 'primevue/checkbox';
import InputNumber from 'primevue/inputnumber';
import FileUpload from 'primevue/fileupload';
import Message from 'primevue/message';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Chips from 'primevue/chips';
import Calendar from 'primevue/calendar';
import AddressAutocomplete from '../../components/common/AddressAutocomplete.vue';
import { useFileUpload } from '../../composables/useFileUpload';
import { PROFILE_OPTIONS } from '../../config/constants';

const route = useRoute();
const dataStore = useDataStore();
const { t } = useI18n();

// --- File upload ---
const { uploading: photoUploading, uploadFile: doUploadPhoto } = useFileUpload('tier-files');
const { uploading: cvUploading, uploadFile: doUploadCV } = useFileUpload('tier-files');

// --- Données du formulaire ---
const form = ref({
    // Identité (commun)
    name: '',
    alt_name: '',
    tier_type: [],
    code_client: '',
    code_fournisseur: '',
    state: 'Ouvert',
    barcode: '',
    is_trainer: false,
    is_opco: false,

    // Coordonnées (commun)
    address: '',
    zip_code: '',
    city: '',
    country: 'FR',
    department: null,
    phone: '',
    mobile: '',
    fax: '',
    website: '',
    email: '',
    refuse_mass_mail: false,
    show_socials: false,

    // Infos légales (commun)
    siren: '',
    siret: '',
    naf_ape: '',
    rcs_rm: '',
    eori_number: '',
    rna_number: '',
    tva_subject: false,
    tva_number: '',
    legal_entity_type: null,
    workforce: 0,
    capital: 0,

    // Paramètres (commun)
    default_lang: 'Français',
    payment_conditions: null,
    payment_mode: null,
    tags_client: [],
    tags_supplier: [],
    currency: 'EUR',

    // Ressources
    assigned_to: '',

    // --- Formateur ---
    origin: null,
    speciality: '',
    date_of_birth: null,
    gender: null,
    link_url: '',
    description: '',
    diplomas: '',
    experience: '',
    social_security_number: '',
    nda: '',
    company_name: '',
    default_rate: null,
    rate_unit: 'heure',
    photo_url: '',
    cv_url: '',
    insurance_number: '',

    // --- Financeur ---
    financeur_type: null,

    // --- Entreprise ---
    represented_by: '',
    representative_title: '',
    representative_function: '',
    contacts: [],
    opco: '',
    opco_adherent_number: '',
    idcc: '',
    nace: '',
});

// --- Mode édition ---
const isEditing = ref(false);
const tierId = ref(null);

// --- Détection du type de profil ---
const activeProfileType = computed(() => {
    if (isEditing.value) {
        const types = form.value.tier_type || [];
        for (const t of ['Formateur', 'Financeur', 'Entreprise']) {
            if (types.includes(t)) return t;
        }
        return null;
    }
    return route.query.type || null;
});

const showTypeSelector = computed(() => !isEditing.value && !activeProfileType.value);
const isFormateur = computed(() => activeProfileType.value === 'Formateur');
const isFinanceur = computed(() => activeProfileType.value === 'Financeur');
const isEntreprise = computed(() => activeProfileType.value === 'Entreprise');
const isGeneric = computed(() => !showTypeSelector.value && !isFormateur.value && !isFinanceur.value && !isEntreprise.value);

// --- Titre dynamique ---
const pageTitle = computed(() => {
    if (isEditing.value) {
        if (isFormateur.value) return t('tiers_profile.formateur.edit_title');
        if (isFinanceur.value) return t('tiers_profile.financeur.edit_title');
        if (isEntreprise.value) return t('tiers_profile.entreprise.edit_title');
        return t('tiers.edit_title');
    }
    if (isFormateur.value) return t('tiers_profile.formateur.page_title');
    if (isFinanceur.value) return t('tiers_profile.financeur.page_title');
    if (isEntreprise.value) return t('tiers_profile.entreprise.page_title');
    return t('tiers.new_title');
});

// --- Options des listes ---
const typeOptions = ['Prospect', 'Client', 'Fournisseur', 'Intervenant', 'Formateur', 'Financeur', 'Entreprise'];
const stateOptions = ['Ouvert', 'Fermé', 'En sommeil'];
const countryOptions = [{label: 'France (FR)', value: 'FR'}, {label: 'Belgique (BE)', value: 'BE'}];
const deptOptions = ['75 - Paris', '91 - Essonne', '92 - Hauts-de-Seine', '33 - Gironde', '69 - Rhône'];
const yesNoOptions = [{ label: 'Oui', value: true }, { label: 'Non', value: false }];
const legalEntities = ['SAS', 'SARL', 'EURL', 'Auto-entrepreneur', 'SA', 'SCI'];
const langOptions = ['Français', 'Anglais', 'Espagnol'];
const payConditions = ['30 jours fin de mois', 'Comptant', '45 jours', '60 jours'];
const payModes = ['Virement', 'Chèque', 'Prélèvement', 'Carte Bancaire'];
const currencyOptions = [{label: 'Euros (€)', value: 'EUR'}, {label: 'Dollars ($)', value: 'USD'}];

// --- Handlers ---
const handleAddressSelected = (address) => {
    if (address.street) form.value.address = address.street;
    if (address.postcode) form.value.zip_code = address.postcode;
    if (address.city) form.value.city = address.city;
    if (address.department) form.value.department = address.department;
};

// --- Contacts dynamiques (Entreprise) ---
const addContact = () => {
    form.value.contacts.push({ name: '', email: '' });
};
const removeContact = (index) => {
    form.value.contacts.splice(index, 1);
};

// --- File uploads ---
const onPhotoUpload = async (event) => {
    const result = await doUploadPhoto(event, 'photo');
    if (result.url) form.value.photo_url = result.url;
};
const onCvUpload = async (event) => {
    const result = await doUploadCV(event, 'cv');
    if (result.url) form.value.cv_url = result.url;
};

// --- Validation ---
const submitting = ref(false);
const errorMsg = ref('');

const isFormValid = computed(() => {
    const f = form.value;
    if (isFormateur.value) {
        return f.name?.trim() !== '' && f.email?.trim() !== '' && !!f.origin;
    }
    if (isFinanceur.value) {
        return f.name?.trim() !== '' && f.email?.trim() !== '' && !!f.financeur_type && f.address?.trim() !== '';
    }
    if (isEntreprise.value) {
        return f.name?.trim() !== '' && f.email?.trim() !== '' && f.represented_by?.trim() !== '' && f.address?.trim() !== '';
    }
    // Générique : seulement name
    return f.name?.trim() !== '';
});

// --- Actions ---
const handleSubmit = async () => {
    submitting.value = true;
    errorMsg.value = '';

    let result;
    if (isEditing.value) {
        result = await dataStore.updateTier(tierId.value, form.value);
    } else {
        result = await dataStore.createTier(form.value);
    }

    if (result.success) {
        window.location.href = '/dashboard/tiers';
    } else {
        errorMsg.value = "Erreur lors de l'enregistrement : " + result.error;
    }
    submitting.value = false;
};

const selectType = (type) => {
    window.location.href = `/dashboard/tiers/create?type=${type}`;
};

const goGeneric = () => {
    // Aller au formulaire générique (sans type)
    form.value.tier_type = [];
};

const verifyTva = () => {
    // TODO: Implémenter la vérification VIES API
};

const goBack = () => {
    window.location.href = '/dashboard/tiers';
};

// --- Montage ---
onMounted(async () => {
    if (route.params.id) {
        isEditing.value = true;
        tierId.value = route.params.id;

        const tier = await dataStore.getTierById(tierId.value);
        if (tier) {
            form.value = {
                ...form.value,
                ...tier,
                tier_type: tier.tier_type || [],
                tags_client: tier.tags_client || [],
                tags_supplier: tier.tags_supplier || [],
                contacts: tier.contacts || [],
                date_of_birth: tier.date_of_birth ? new Date(tier.date_of_birth) : null,
            };
        } else {
            errorMsg.value = "Impossible de charger les données du tiers (ID non trouvé).";
        }
    } else if (route.query.type) {
        const presetType = route.query.type;
        if (typeOptions.includes(presetType)) {
            form.value.tier_type = [presetType];
        }
    }
});
</script>

<template>
    <div class="max-w-5xl mx-auto bg-gray-50 dark:bg-gray-900 pb-20">

        <!-- ========== SÉLECTEUR DE TYPE ========== -->
        <div v-if="showTypeSelector" class="p-6">
            <div class="text-center mb-10">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">{{ $t('tiers_profile.type_selector.title') }}</h1>
                <p class="text-gray-500">{{ $t('tiers_profile.type_selector.subtitle') }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <!-- Formateur -->
                <button @click="selectType('Formateur')"
                    class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-gray-100 dark:border-gray-700 hover:border-primary hover:shadow-lg transition-all duration-200 text-left group cursor-pointer">
                    <div class="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition">
                        <i class="pi pi-user text-2xl text-blue-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">{{ $t('tiers_profile.type_selector.formateur_title') }}</h3>
                    <p class="text-sm text-gray-500">{{ $t('tiers_profile.type_selector.formateur_desc') }}</p>
                </button>

                <!-- Financeur -->
                <button @click="selectType('Financeur')"
                    class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-gray-100 dark:border-gray-700 hover:border-primary hover:shadow-lg transition-all duration-200 text-left group cursor-pointer">
                    <div class="w-14 h-14 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition">
                        <i class="pi pi-wallet text-2xl text-green-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">{{ $t('tiers_profile.type_selector.financeur_title') }}</h3>
                    <p class="text-sm text-gray-500">{{ $t('tiers_profile.type_selector.financeur_desc') }}</p>
                </button>

                <!-- Entreprise -->
                <button @click="selectType('Entreprise')"
                    class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border-2 border-gray-100 dark:border-gray-700 hover:border-primary hover:shadow-lg transition-all duration-200 text-left group cursor-pointer">
                    <div class="w-14 h-14 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition">
                        <i class="pi pi-building text-2xl text-orange-500"></i>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">{{ $t('tiers_profile.type_selector.entreprise_title') }}</h3>
                    <p class="text-sm text-gray-500">{{ $t('tiers_profile.type_selector.entreprise_desc') }}</p>
                </button>
            </div>

            <!-- Lien vers formulaire générique -->
            <div class="text-center mt-8">
                <button @click="goGeneric" class="text-sm text-gray-400 hover:text-primary transition underline cursor-pointer">
                    {{ $t('tiers_profile.type_selector.or_generic') }}
                </button>
            </div>
        </div>

        <!-- ========== FORMULAIRE (typé ou générique) ========== -->
        <template v-else>
            <!-- Sticky header -->
            <div class="bg-white dark:bg-gray-800 p-6 shadow-sm sticky top-0 z-10 mb-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-4">
                    <Button icon="pi pi-arrow-left" text rounded @click="goBack" />
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
                </div>
                <div class="flex gap-2">
                    <Button :label="$t('tiers.cancel')" severity="secondary" @click="goBack" />
                    <Button :label="isEditing ? $t('tiers.save_modifications') : $t('tiers.create')" icon="pi pi-check" :loading="submitting" :disabled="!isFormValid" @click="handleSubmit" />
                </div>
            </div>

            <form @submit.prevent="handleSubmit" class="px-4 sm:px-6 space-y-6">
                <Message v-if="errorMsg" severity="error" :closable="false" class="mb-4">{{ errorMsg }}</Message>

                <!-- ============================= -->
                <!-- FORMULAIRE FORMATEUR          -->
                <!-- ============================= -->
                <template v-if="isFormateur">
                    <!-- Identité & Contact -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.formateur.section_identity') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.name') }} *</label>
                                <InputText v-model="form.name" required placeholder="NOM Prénom" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.email') }} *</label>
                                <InputText v-model="form.email" type="email" placeholder="email@exemple.com" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.phone') }}</label>
                                <InputText v-model="form.phone" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.origin') }} *</label>
                                <Dropdown v-model="form.origin" :options="PROFILE_OPTIONS.FORMATEUR_ORIGINS" :placeholder="$t('tiers_profile.formateur.origin_placeholder')" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.speciality') }}</label>
                                <InputText v-model="form.speciality" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.date_of_birth') }}</label>
                                <Calendar v-model="form.date_of_birth" dateFormat="dd/mm/yy" showIcon />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.gender') }}</label>
                                <Dropdown v-model="form.gender" :options="PROFILE_OPTIONS.GENDER" optionLabel="label" optionValue="value" placeholder="--" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.link_url') }}</label>
                                <InputText v-model="form.link_url" placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    <!-- Adresse -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.formateur.section_address') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.address') }}</label>
                                <AddressAutocomplete v-model="form.address" @address-selected="handleAddressSelected" placeholder="Saisissez une adresse..." />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.zip') }}</label>
                                <InputText v-model="form.zip_code" maxlength="5" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.city') }}</label>
                                <InputText v-model="form.city" />
                            </div>
                        </div>
                    </div>

                    <!-- Infos professionnelles -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.formateur.section_professional') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.description') }}</label>
                                <Textarea v-model="form.description" rows="4" autoResize />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.diplomas') }}</label>
                                <InputText v-model="form.diplomas" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.experience') }}</label>
                                <InputText v-model="form.experience" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.company_name') }}</label>
                                <InputText v-model="form.company_name" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.siret') }}</label>
                                <InputText v-model="form.siret" maxlength="14" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.tva') }}</label>
                                <InputText v-model="form.tva_number" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.nda') }}</label>
                                <InputText v-model="form.nda" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.social_security_number') }}</label>
                                <InputText v-model="form.social_security_number" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.insurance_number') }}</label>
                                <InputText v-model="form.insurance_number" />
                            </div>
                        </div>
                    </div>

                    <!-- Tarification -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.formateur.section_rate') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.default_rate') }}</label>
                                <InputNumber v-model="form.default_rate" mode="currency" currency="EUR" locale="fr-FR" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.rate_unit') }}</label>
                                <Dropdown v-model="form.rate_unit" :options="PROFILE_OPTIONS.RATE_UNITS" optionLabel="label" optionValue="value" />
                            </div>
                        </div>
                    </div>

                    <!-- Documents -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.formateur.section_documents') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-3">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.photo') }}</label>
                                <img v-if="form.photo_url" :src="form.photo_url" class="h-24 w-24 rounded-full object-cover border-2 border-gray-200" />
                                <FileUpload mode="basic" accept="image/*" :maxFileSize="1048576" @select="onPhotoUpload" :chooseLabel="$t('tiers_profile.formateur.photo_choose')" :disabled="photoUploading" />
                                <span class="text-xs text-gray-400">Max 1 MB — JPG, PNG</span>
                            </div>
                            <div class="flex flex-col gap-3">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.formateur.cv') }}</label>
                                <a v-if="form.cv_url" :href="form.cv_url" target="_blank" class="text-primary text-sm underline"><i class="pi pi-file-pdf mr-1"></i>Voir le CV</a>
                                <FileUpload mode="basic" accept=".pdf,image/*" :maxFileSize="1048576" @select="onCvUpload" :chooseLabel="$t('tiers_profile.formateur.cv_choose')" :disabled="cvUploading" />
                                <span class="text-xs text-gray-400">Max 1 MB — PDF, JPG, PNG</span>
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ============================= -->
                <!-- FORMULAIRE FINANCEUR          -->
                <!-- ============================= -->
                <template v-else-if="isFinanceur">
                    <!-- Infos générales -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.financeur.section_general') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.name') }} *</label>
                                <InputText v-model="form.name" required />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.financeur_type') }} *</label>
                                <Dropdown v-model="form.financeur_type" :options="PROFILE_OPTIONS.FINANCEUR_TYPES" :placeholder="$t('tiers_profile.financeur.financeur_type_placeholder')" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.phone') }}</label>
                                <InputText v-model="form.phone" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.fax') }}</label>
                                <InputText v-model="form.fax" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.email') }} *</label>
                                <InputText v-model="form.email" type="email" />
                            </div>
                        </div>
                    </div>

                    <!-- Adresse -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.financeur.section_address') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.address') }} *</label>
                                <AddressAutocomplete v-model="form.address" @address-selected="handleAddressSelected" placeholder="Saisissez une adresse..." />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.zip') }}</label>
                                <InputText v-model="form.zip_code" maxlength="5" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.city') }}</label>
                                <InputText v-model="form.city" />
                            </div>
                        </div>
                    </div>

                    <!-- Infos complémentaires -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.financeur.section_legal') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.siret') }}</label>
                                <InputText v-model="form.siret" maxlength="14" />
                            </div>
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.financeur.description') }}</label>
                                <Textarea v-model="form.description" rows="4" autoResize />
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ============================= -->
                <!-- FORMULAIRE ENTREPRISE         -->
                <!-- ============================= -->
                <template v-else-if="isEntreprise">
                    <!-- Infos générales -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.entreprise.section_general') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.name') }} *</label>
                                <InputText v-model="form.name" required />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.represented_by') }} *</label>
                                <InputText v-model="form.represented_by" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.representative_title') }}</label>
                                <InputText v-model="form.representative_title" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.representative_function') }}</label>
                                <InputText v-model="form.representative_function" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.phone') }}</label>
                                <InputText v-model="form.phone" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.email') }} *</label>
                                <InputText v-model="form.email" type="email" />
                            </div>
                        </div>
                    </div>

                    <!-- Adresse -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.entreprise.section_address') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.address') }} *</label>
                                <AddressAutocomplete v-model="form.address" @address-selected="handleAddressSelected" placeholder="Saisissez une adresse..." />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.cp') }}</label>
                                <InputText v-model="form.zip_code" maxlength="5" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.city') }}</label>
                                <InputText v-model="form.city" />
                            </div>
                        </div>
                    </div>

                    <!-- Infos légales -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.entreprise.section_legal') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.siret') }}</label>
                                <InputText v-model="form.siret" maxlength="14" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.tva_number') }}</label>
                                <InputText v-model="form.tva_number" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.code_ape') }}</label>
                                <InputText v-model="form.naf_ape" maxlength="5" />
                            </div>
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.description') }}</label>
                                <Textarea v-model="form.description" rows="3" autoResize />
                            </div>
                        </div>
                    </div>

                    <!-- Contacts supplémentaires -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.entreprise.section_contacts') }}</h2>
                        <div class="space-y-4">
                            <div v-for="(contact, i) in form.contacts" :key="i" class="flex items-center gap-3">
                                <InputText v-model="contact.name" :placeholder="$t('tiers_profile.entreprise.contact_name')" class="flex-1" />
                                <InputText v-model="contact.email" :placeholder="$t('tiers_profile.entreprise.contact_email')" type="email" class="flex-1" />
                                <Button icon="pi pi-trash" severity="danger" text rounded @click="removeContact(i)" />
                            </div>
                            <Button :label="$t('tiers_profile.entreprise.add_contact')" icon="pi pi-plus" severity="secondary" outlined @click="addContact" />
                        </div>
                    </div>

                    <!-- Section financeurs -->
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers_profile.entreprise.section_financeurs') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.opco') }}</label>
                                <InputText v-model="form.opco" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.opco_adherent_number') }}</label>
                                <InputText v-model="form.opco_adherent_number" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.workforce') }}</label>
                                <InputNumber v-model="form.workforce" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.idcc') }}</label>
                                <InputText v-model="form.idcc" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers_profile.entreprise.nace') }}</label>
                                <InputText v-model="form.nace" />
                            </div>
                        </div>
                    </div>
                </template>

                <!-- ============================= -->
                <!-- FORMULAIRE GÉNÉRIQUE (legacy) -->
                <!-- ============================= -->
                <template v-else>
                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers.general.title') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.general.name') }} *</label>
                                <InputText v-model="form.name" required :placeholder="$t('tiers.general.name_placeholder')" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.general.alt_name') }}</label>
                                <InputText v-model="form.alt_name" :placeholder="$t('tiers.general.alt_name_placeholder')" />
                            </div>
                            <div class="col-span-1 md:col-span-2">
                                <label class="block mb-2 text-sm font-medium">{{ $t('tiers.general.type') }}</label>
                                <div class="flex flex-wrap gap-4">
                                    <div v-for="type in typeOptions" :key="type" class="flex items-center">
                                        <Checkbox v-model="form.tier_type" :inputId="type" :value="type" />
                                        <label :for="type" class="ml-2 cursor-pointer select-none">{{ type }}</label>
                                    </div>
                                    <div class="flex items-center">
                                        <Checkbox v-model="form.is_trainer" :binary="true" inputId="is_trainer" />
                                        <label for="is_trainer" class="ml-2 cursor-pointer select-none text-gray-700 dark:text-gray-300">{{ $t('tiers.general.trainer') }}</label>
                                    </div>
                                    <div class="flex items-center">
                                        <Checkbox v-model="form.is_opco" :binary="true" inputId="is_opco" />
                                        <label for="is_opco" class="ml-2 cursor-pointer select-none text-gray-700 dark:text-gray-300">{{ $t('tiers.general.opco') }}</label>
                                    </div>
                                </div>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.general.client_code') }} (Auto)</label>
                                <InputText v-model="form.code_client" placeholder="Généré automatiquement si vide" disabled class="bg-gray-100 opacity-70" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.general.supplier_code') }} (Auto)</label>
                                <InputText v-model="form.code_fournisseur" placeholder="Généré automatiquement si vide" disabled class="bg-gray-100 opacity-70" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.general.status') }}</label>
                                <Dropdown v-model="form.state" :options="stateOptions" :placeholder="$t('tiers.financial.select')" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.general.barcode') }}</label>
                                <InputText v-model="form.barcode" />
                            </div>
                        </div>
                    </div>

                    <div class="card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h2 class="text-xl font-semibold mb-4 text-primary border-b pb-2">{{ $t('tiers.contact.title') }}</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="col-span-1 md:col-span-2 flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.address') }}</label>
                                <AddressAutocomplete v-model="form.address" @address-selected="handleAddressSelected" placeholder="Saisissez une adresse..." />
                                <span class="text-xs text-gray-400"><i class="pi pi-info-circle mr-1"></i>Auto-complétion via adresse.data.gouv.fr</span>
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.zip') }}</label>
                                <InputText v-model="form.zip_code" maxlength="5" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.city') }}</label>
                                <InputText v-model="form.city" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.country') }}</label>
                                <Dropdown v-model="form.country" :options="countryOptions" optionLabel="label" optionValue="value" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.department') }}</label>
                                <Dropdown v-model="form.department" :options="deptOptions" :placeholder="$t('tiers.financial.select')" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.phone') }}</label>
                                <InputText v-model="form.phone" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.mobile') }}</label>
                                <InputText v-model="form.mobile" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.website') }}</label>
                                <InputText v-model="form.website" placeholder="https://" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label class="text-sm font-medium">{{ $t('tiers.contact.email') }}</label>
                                <InputText v-model="form.email" type="email" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label>{{ $t('tiers.contact.refuse_mass_email') }}</label>
                                <Dropdown v-model="form.refuse_mass_mail" :options="yesNoOptions" optionLabel="label" optionValue="value" />
                            </div>
                            <div class="flex items-center mt-6">
                                <Checkbox v-model="form.show_socials" :binary="true" inputId="socials" />
                                <label for="socials" class="ml-2 font-medium cursor-pointer">{{ $t('tiers.contact.show_socials') }}</label>
                            </div>
                        </div>
                    </div>

                    <Accordion :multiple="true" :activeIndex="[0]">
                        <AccordionPanel value="0">
                            <AccordionHeader>{{ $t('tiers.legal.title') }}</AccordionHeader>
                            <AccordionContent>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.legal.siren') }}</label><InputText v-model="form.siren" maxlength="9" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.legal.siret') }}</label><InputText v-model="form.siret" maxlength="14" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.legal.naf') }}</label><InputText v-model="form.naf_ape" maxlength="5" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.legal.rcs') }}</label><InputText v-model="form.rcs_rm" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.legal.eori') }}</label><InputText v-model="form.eori_number" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.legal.rna') }}</label><InputText v-model="form.rna_number" /></div>
                                </div>
                                <div class="mt-6 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-center mb-2">
                                            <Checkbox v-model="form.tva_subject" :binary="true" inputId="tva" />
                                            <label for="tva" class="ml-2 cursor-pointer font-medium">{{ $t('tiers.legal.vat_subject') }}</label>
                                        </div>
                                        <div class="flex gap-2" v-if="form.tva_subject">
                                            <InputText v-model="form.tva_number" :placeholder="$t('tiers.legal.vat_number')" class="flex-1" />
                                            <Button :label="$t('tiers.legal.check_vat')" icon="pi pi-search" severity="info" outlined @click="verifyTva" />
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label class="text-sm font-medium">Type d'entité légale</label>
                                        <Dropdown v-model="form.legal_entity_type" :options="legalEntities" :placeholder="$t('tiers.financial.select')" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label class="text-sm font-medium">Effectifs</label>
                                        <InputNumber v-model="form.workforce" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label class="text-sm font-medium">{{ $t('tiers.legal.capital') }} (€)</label>
                                        <InputNumber v-model="form.capital" mode="currency" currency="EUR" locale="fr-FR" />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionPanel>

                        <AccordionPanel value="1">
                            <AccordionHeader>{{ $t('tiers.financial.title') }}</AccordionHeader>
                            <AccordionContent>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.financial.default_lang') }}</label><Dropdown v-model="form.default_lang" :options="langOptions" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.financial.currency') }}</label><Dropdown v-model="form.currency" :options="currencyOptions" optionLabel="label" optionValue="value" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.financial.payment_terms') }}</label><Dropdown v-model="form.payment_conditions" :options="payConditions" :placeholder="$t('tiers.financial.select')" /></div>
                                    <div class="flex flex-col gap-2"><label class="text-sm font-medium">{{ $t('tiers.financial.payment_mode') }}</label><Dropdown v-model="form.payment_mode" :options="payModes" :placeholder="$t('tiers.financial.select')" /></div>
                                    <div class="flex flex-col gap-2"><label>{{ $t('tiers.financial.tags_client') }}</label><Chips v-model="form.tags_client" separator="," placeholder="Entrez un tag et validez" /></div>
                                    <div class="flex flex-col gap-2"><label>{{ $t('tiers.financial.tags_supplier') }}</label><Chips v-model="form.tags_supplier" separator="," placeholder="Entrez un tag et validez" /></div>
                                </div>
                            </AccordionContent>
                        </AccordionPanel>

                        <AccordionPanel value="2">
                            <AccordionHeader>{{ $t('tiers.attachments.title') }}</AccordionHeader>
                            <AccordionContent>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    <div class="flex flex-col gap-2">
                                        <label class="text-sm font-medium">{{ $t('tiers.attachments.assign_reps') }}</label>
                                        <InputText v-model="form.assigned_to" :placeholder="$t('tiers.attachments.add_rep_placeholder')" class="w-full" />
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <label class="block mb-2 text-sm font-medium">{{ $t('tiers.attachments.logo') }}</label>
                                        <FileUpload mode="basic" name="logo" accept="image/*" :maxFileSize="1000000" :chooseLabel="$t('tiers.attachments.logo_choose')" />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionPanel>
                    </Accordion>
                </template>
            </form>
        </template>
    </div>
</template>
