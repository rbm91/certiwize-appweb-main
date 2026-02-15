<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFacturationStore } from '../../stores/facturation';
import { usePrestationsStore } from '../../stores/prestations';
import { useCompanyStore } from '../../stores/company';
import { FACTURE_TYPES, CONDITIONS_PAIEMENT } from '../../config/constants';

import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import DatePicker from 'primevue/datepicker';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';

const router = useRouter();
const route = useRoute();
const factStore = useFacturationStore();
const prestStore = usePrestationsStore();
const companyStore = useCompanyStore();
const toast = useToast();

const saving = ref(false);
const isEditMode = computed(() => !!route.params.id);
const isLocked = ref(false);

// Formulaire
const form = ref({
  prestation_id: null,
  client_id: null,
  type_facture: 'standard',
  montant_ht: 0,
  taux_tva: 20,
  date_echeance: null,
  conditions_paiement: '30_jours',
  mentions_legales: '',
});

// Donnees de lecture seule pour le client auto-rempli
const clientName = ref('');

// Options prestations pour le dropdown
const prestationOptions = computed(() => {
  return prestStore.activePrestations.map((p) => ({
    label: `${p.reference || ''} — ${p.intitule || 'Sans titre'}`,
    value: p.id,
    client_id: p.client_id,
    client_name: p.client?.nom_affiche || p.client?.raison_sociale || '',
    montant_ht: parseFloat(p.montant_ht) || 0,
    taux_tva: parseFloat(p.taux_tva) || companyStore.tauxTvaDefaut,
  }));
});

// Calculs automatiques
const montantTva = computed(() => {
  const ht = parseFloat(form.value.montant_ht) || 0;
  const taux = parseFloat(form.value.taux_tva) || 0;
  return Math.round(ht * taux) / 100;
});

const montantTtc = computed(() => {
  const ht = parseFloat(form.value.montant_ht) || 0;
  return Math.round((ht + montantTva.value) * 100) / 100;
});

// Formattage EUR
const formatEur = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

// Watch prestation_id pour auto-remplir client et montant
watch(
  () => form.value.prestation_id,
  (newId) => {
    if (!newId) {
      clientName.value = '';
      return;
    }
    const option = prestationOptions.value.find((p) => p.value === newId);
    if (option) {
      form.value.client_id = option.client_id;
      clientName.value = option.client_name;
      if (!form.value.montant_ht || form.value.montant_ht === 0) {
        form.value.montant_ht = option.montant_ht;
      }
      if (option.taux_tva) {
        form.value.taux_tva = option.taux_tva;
      }
    }
  },
);

// Sauvegarde
const handleSave = async () => {
  saving.value = true;

  if (!form.value.prestation_id) {
    toast.add({ severity: 'warn', summary: 'Champ requis', detail: 'Veuillez selectionner une prestation', life: 4000 });
    saving.value = false;
    return;
  }

  if (!form.value.montant_ht || form.value.montant_ht <= 0) {
    toast.add({ severity: 'warn', summary: 'Champ requis', detail: 'Le montant HT doit etre superieur a zero', life: 4000 });
    saving.value = false;
    return;
  }

  const payload = {
    prestation_id: form.value.prestation_id,
    client_id: form.value.client_id,
    type_facture: form.value.type_facture,
    montant_ht: form.value.montant_ht,
    taux_tva: form.value.taux_tva,
    date_echeance: form.value.date_echeance
      ? new Date(form.value.date_echeance).toISOString().split('T')[0]
      : null,
    conditions_paiement: form.value.conditions_paiement,
    mentions_legales: form.value.mentions_legales,
  };

  const res = await factStore.createFacture(payload);

  if (res.success) {
    toast.add({ severity: 'success', summary: 'Facture creee', life: 3000 });
    router.push('/dashboard/factures');
  } else {
    toast.add({ severity: 'error', summary: 'Erreur', detail: res.error, life: 5000 });
  }

  saving.value = false;
};

const handleCancel = () => {
  router.push('/dashboard/factures');
};

// Chargement initial
onMounted(async () => {
  await Promise.all([
    prestStore.fetchPrestations(),
    companyStore.fetchCompany(),
  ]);

  // Appliquer les valeurs par defaut de l'entreprise
  form.value.taux_tva = companyStore.tauxTvaDefaut;
  form.value.conditions_paiement = companyStore.company?.conditions_paiement_defaut || '30_jours';

  // Auto-injecter les mentions legales depuis les parametres entreprise
  const mentions = [];
  if (companyStore.company?.name) {
    mentions.push(companyStore.company.name);
  }
  if (companyStore.company?.address) {
    mentions.push(companyStore.company.address);
  }
  if (companyStore.company?.nda_numero && companyStore.company?.nda_afficher_factures) {
    mentions.push(`N. de declaration d'activite : ${companyStore.company.nda_numero}`);
  }
  if (mentions.length > 0) {
    form.value.mentions_legales = mentions.join('\n');
  }

  // Mode edition
  if (isEditMode.value) {
    await factStore.fetchFactures();
    const facture = factStore.factures.find((f) => f.id === route.params.id);
    if (facture) {
      // Verifier si verrouillee (emise ou au-dela)
      const lockedStatuts = ['emise', 'envoyee', 'payee', 'en_retard', 'annulee'];
      if (lockedStatuts.includes(facture.statut)) {
        isLocked.value = true;
      }

      form.value = {
        prestation_id: facture.prestation_id,
        client_id: facture.client_id,
        type_facture: facture.type_facture,
        montant_ht: parseFloat(facture.montant_ht) || 0,
        taux_tva: parseFloat(facture.taux_tva) || 20,
        date_echeance: facture.date_echeance ? new Date(facture.date_echeance) : null,
        conditions_paiement: facture.conditions_paiement || '30_jours',
        mentions_legales: facture.mentions_legales || '',
      };

      clientName.value =
        facture.client?.nom_affiche || facture.client?.raison_sociale || '';
    }
  }
});
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- En-tete -->
    <div class="flex items-center gap-3 mb-6">
      <Button
        icon="pi pi-arrow-left"
        text
        rounded
        severity="secondary"
        @click="handleCancel"
      />
      <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-0">
        {{ isEditMode ? 'Modifier la facture' : 'Nouvelle facture' }}
      </h1>
    </div>

    <!-- Message verrouillage -->
    <Message v-if="isLocked" severity="warn" class="mb-6">
      <i class="pi pi-lock mr-2" />
      Facture verrouillee — Cette facture a ete emise et ne peut plus etre modifiee.
    </Message>

    <!-- Formulaire -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-surface-200 dark:border-surface-700 p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Prestation -->
        <div class="md:col-span-2 flex flex-col gap-2">
          <label class="font-semibold">Prestation <span class="text-red-500">*</span></label>
          <Dropdown
            v-model="form.prestation_id"
            :options="prestationOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Selectionner une prestation"
            :disabled="isLocked"
            filter
            class="w-full"
          />
        </div>

        <!-- Client (auto-rempli, lecture seule) -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Client</label>
          <InputText
            :modelValue="clientName"
            disabled
            placeholder="Auto-rempli depuis la prestation"
          />
          <small class="text-surface-400">Rempli automatiquement depuis la prestation selectionnee</small>
        </div>

        <!-- Type de facture -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Type de facture</label>
          <Dropdown
            v-model="form.type_facture"
            :options="FACTURE_TYPES"
            optionLabel="label"
            optionValue="value"
            :disabled="isLocked"
          />
        </div>

        <Divider class="md:col-span-2" />

        <!-- Montant HT -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Montant HT <span class="text-red-500">*</span></label>
          <InputNumber
            v-model="form.montant_ht"
            mode="currency"
            currency="EUR"
            locale="fr-FR"
            :min="0"
            :disabled="isLocked"
          />
        </div>

        <!-- Taux TVA -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Taux TVA (%)</label>
          <InputNumber
            v-model="form.taux_tva"
            :min="0"
            :max="30"
            :minFractionDigits="2"
            suffix=" %"
            :disabled="isLocked"
          />
        </div>

        <!-- Montant TVA (calcule) -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold text-surface-500">Montant TVA (calcule)</label>
          <div class="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-600 font-semibold text-lg">
            {{ formatEur(montantTva) }}
          </div>
        </div>

        <!-- Montant TTC (calcule) -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold text-surface-500">Montant TTC (calcule)</label>
          <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 font-bold text-lg text-green-700 dark:text-green-400">
            {{ formatEur(montantTtc) }}
          </div>
        </div>

        <Divider class="md:col-span-2" />

        <!-- Date echeance -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Date d'echeance</label>
          <DatePicker
            v-model="form.date_echeance"
            dateFormat="dd/mm/yy"
            showIcon
            :disabled="isLocked"
          />
        </div>

        <!-- Conditions de paiement -->
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Conditions de paiement</label>
          <Dropdown
            v-model="form.conditions_paiement"
            :options="CONDITIONS_PAIEMENT"
            optionLabel="label"
            optionValue="value"
            :disabled="isLocked"
          />
        </div>

        <!-- Mentions legales -->
        <div class="md:col-span-2 flex flex-col gap-2">
          <label class="font-semibold">Mentions legales</label>
          <Textarea
            v-model="form.mentions_legales"
            rows="4"
            :disabled="isLocked"
            placeholder="Mentions legales ajoutees automatiquement depuis les parametres entreprise"
          />
          <small class="text-surface-400">
            Injectees automatiquement depuis Parametres > Financier. Vous pouvez les modifier ici pour cette facture.
          </small>
        </div>
      </div>

      <!-- Boutons -->
      <div class="flex justify-end gap-3 mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
        <Button
          label="Annuler"
          severity="secondary"
          text
          @click="handleCancel"
        />
        <Button
          v-if="!isLocked"
          label="Enregistrer"
          icon="pi pi-save"
          :loading="saving"
          @click="handleSave"
        />
      </div>
    </div>
  </div>
</template>
