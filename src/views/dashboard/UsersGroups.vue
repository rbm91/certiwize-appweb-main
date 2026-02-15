<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../stores/auth';
import { USER_ROLES_CDC } from '../../config/constants';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import Message from 'primevue/message';

const authStore = useAuthStore();
const users = ref([]);
const loading = ref(false);
const showInviteDialog = ref(false);
const inviteForm = ref({ email: '', role: 'assistant_administratif' });
const message = ref(null);

const roleOptions = USER_ROLES_CDC.map(r => ({
  label: r.label,
  value: r.value,
}));

const getRoleSeverity = (role) => {
  const map = {
    administrateur: 'danger',
    responsable_pedagogique: 'warn',
    assistant_administratif: 'info',
    formateur: 'success',
    consultant: 'secondary',
  };
  return map[role] || 'info';
};

const getRoleLabel = (role) => {
  const found = USER_ROLES_CDC.find(r => r.value === role);
  return found ? found.label : role || 'Utilisateur';
};

onMounted(async () => {
  await fetchUsers();
});

const fetchUsers = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    users.value = data || [];
  } catch (e) {
    console.error('[UsersGroups] Erreur:', e.message);
  } finally {
    loading.value = false;
  }
};

const openInviteDialog = () => {
  inviteForm.value = { email: '', role: 'assistant_administratif' };
  showInviteDialog.value = true;
};

const handleInvite = async () => {
  message.value = {
    severity: 'info',
    text: `L'invitation par email sera disponible prochainement. Email: ${inviteForm.value.email}`,
  };
  showInviteDialog.value = false;
};

const formatDate = (date) => {
  if (!date) return '\u2014';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};
</script>

<template>
  <div class="max-w-6xl mx-auto pb-10">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Utilisateurs & Groupes</h1>
      <Button label="Inviter un utilisateur" icon="pi pi-user-plus" @click="openInviteDialog" />
    </div>

    <Message v-if="message" :severity="message.severity" class="mb-4" :closable="true" @close="message = null">
      {{ message.text }}
    </Message>

    <div class="card bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <DataTable
        :value="users"
        :loading="loading"
        stripedRows
        paginator
        :rows="20"
        rowHover
        dataKey="id"
      >
        <template #empty>
          <div class="text-center py-8 text-gray-500">
            <i class="pi pi-users text-4xl mb-3 block"></i>
            <p>Aucun utilisateur trouv\u00e9</p>
          </div>
        </template>

        <Column field="email" header="Email" sortable>
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <i class="pi pi-user text-gray-400"></i>
              <span class="font-medium">{{ data.email }}</span>
            </div>
          </template>
        </Column>

        <Column field="role" header="R\u00f4le" sortable>
          <template #body="{ data }">
            <Tag :value="getRoleLabel(data.role)" :severity="getRoleSeverity(data.role)" />
          </template>
        </Column>

        <Column field="created_at" header="Inscrit le" sortable>
          <template #body="{ data }">
            <span class="text-gray-500">{{ formatDate(data.created_at) }}</span>
          </template>
        </Column>

        <Column header="Statut">
          <template #body>
            <Tag value="Actif" severity="success" />
          </template>
        </Column>

        <Column header="Actions" style="width: 100px">
          <template #body>
            <Button icon="pi pi-ellipsis-v" text rounded severity="secondary" size="small" disabled />
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div class="flex items-center gap-2 mb-2">
        <i class="pi pi-info-circle text-blue-500"></i>
        <span class="font-semibold text-blue-700 dark:text-blue-300">Gestion des r\u00f4les</span>
      </div>
      <p class="text-sm text-blue-600 dark:text-blue-400">
        Les r\u00f4les disponibles sont : Administrateur, Responsable p\u00e9dagogique, Assistant administratif, Formateur, Consultant.
        La modification des r\u00f4les et les invitations par email seront disponibles dans une prochaine version.
      </p>
    </div>

    <Dialog v-model:visible="showInviteDialog" header="Inviter un utilisateur" :modal="true" :style="{ width: '450px' }">
      <div class="flex flex-col gap-4 p-2">
        <div class="flex flex-col gap-2">
          <label class="font-semibold">Email</label>
          <InputText v-model="inviteForm.email" type="email" placeholder="utilisateur@organisme.fr" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="font-semibold">R\u00f4le</label>
          <Dropdown v-model="inviteForm.role" :options="roleOptions" optionLabel="label" optionValue="value" />
        </div>
      </div>
      <template #footer>
        <Button label="Annuler" text @click="showInviteDialog = false" />
        <Button label="Envoyer l'invitation" icon="pi pi-send" @click="handleInvite" :disabled="!inviteForm.email" />
      </template>
    </Dialog>
  </div>
</template>
