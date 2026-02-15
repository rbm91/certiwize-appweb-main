<script setup>
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Message from 'primevue/message';
import Tooltip from 'primevue/tooltip';

const vTooltip = Tooltip;

// Modeles de documents types pour organismes de formation
const templates = ref([
  {
    titre: 'Modele de convention de formation',
    categorie: 'Contractuel',
    description: 'Convention type pour sessions inter/intra',
  },
  {
    titre: 'Programme de formation type',
    categorie: 'Pedagogique',
    description: 'Trame de programme conforme Qualiopi',
  },
  {
    titre: 'Reglement interieur',
    categorie: 'Reglementaire',
    description: 'Reglement interieur obligatoire',
  },
  {
    titre: "Feuille d'emargement",
    categorie: 'Administratif',
    description: 'Modele de feuille de presence',
  },
  {
    titre: 'Attestation de fin de formation',
    categorie: 'Pedagogique',
    description: 'Attestation conforme article L6353-1',
  },
  {
    titre: 'Questionnaire de satisfaction',
    categorie: 'Qualite',
    description: 'Enquete satisfaction stagiaire type',
  },
  {
    titre: 'Bilan pedagogique et financier',
    categorie: 'Reglementaire',
    description: 'Trame BPF annuel',
  },
  {
    titre: "Livret d'accueil stagiaire",
    categorie: 'Pedagogique',
    description: "Livret d'accueil type",
  },
]);

// Categories disponibles pour le filtre
const categories = computed(() => {
  const cats = [...new Set(templates.value.map((t) => t.categorie))];
  return [{ label: 'Toutes les categories', value: null }, ...cats.map((c) => ({ label: c, value: c }))];
});

const selectedCategorie = ref(null);

// Templates filtrés
const filteredTemplates = computed(() => {
  if (!selectedCategorie.value) return templates.value;
  return templates.value.filter((t) => t.categorie === selectedCategorie.value);
});

// Couleur du tag par categorie
const getCategorieSeverity = (categorie) => {
  const map = {
    Contractuel: 'info',
    Pedagogique: 'success',
    Reglementaire: 'warn',
    Administratif: 'secondary',
    Qualite: 'contrast',
  };
  return map[categorie] || 'info';
};
</script>

<template>
  <div class="space-y-6">
    <!-- En-tete -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Boite a outils</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Modeles de documents types pour votre organisme de formation.
        </p>
      </div>

      <!-- Filtre par categorie -->
      <Select
        v-model="selectedCategorie"
        :options="categories"
        optionLabel="label"
        optionValue="value"
        placeholder="Filtrer par categorie"
        class="w-full md:w-72"
      />
    </div>

    <!-- Message d'information -->
    <Message severity="info" :closable="false">
      Ces modeles sont fournis a titre indicatif. Adaptez-les a votre organisme.
    </Message>

    <!-- Tableau des modeles -->
    <DataTable
      :value="filteredTemplates"
      stripedRows
      :paginator="filteredTemplates.length > 10"
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      tableStyle="min-width: 50rem"
      class="shadow-sm"
    >
      <template #empty>
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-inbox text-4xl mb-3 block"></i>
          <p>Aucun modele dans cette categorie.</p>
        </div>
      </template>

      <Column field="titre" header="Titre" sortable style="min-width: 14rem">
        <template #body="{ data }">
          <div class="flex items-center gap-3">
            <i class="pi pi-file text-gray-400"></i>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ data.titre }}</span>
          </div>
        </template>
      </Column>

      <Column field="categorie" header="Categorie" sortable style="min-width: 10rem">
        <template #body="{ data }">
          <Tag :value="data.categorie" :severity="getCategorieSeverity(data.categorie)" />
        </template>
      </Column>

      <Column field="description" header="Description" style="min-width: 16rem">
        <template #body="{ data }">
          <span class="text-sm text-gray-600 dark:text-gray-400">{{ data.description }}</span>
        </template>
      </Column>

      <Column header="Action" style="min-width: 10rem" :exportable="false">
        <template #body>
          <Button
            icon="pi pi-download"
            label="Telecharger"
            severity="secondary"
            size="small"
            disabled
            v-tooltip.top="'Disponible prochainement'"
          />
        </template>
      </Column>
    </DataTable>

    <!-- Info complementaire -->
    <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div class="flex items-start gap-3">
        <i class="pi pi-info-circle text-blue-500 mt-0.5"></i>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          <p class="font-medium text-gray-800 dark:text-gray-200 mb-1">Prochaines fonctionnalites</p>
          <ul class="list-disc list-inside space-y-1">
            <li>Telechargement des modeles au format Word et PDF</li>
            <li>Personnalisation automatique avec les informations de votre organisme</li>
            <li>Ajout de vos propres modeles</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
