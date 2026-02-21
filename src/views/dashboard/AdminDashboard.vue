<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../supabase';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { useToast } from 'primevue/usetoast';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// Rediriger si pas super-admin
if (!authStore.isSuperAdmin) {
    router.push('/dashboard');
}

// ── Onglet actif ──
const activeTab = ref(0);

// ── State : Utilisateurs ──
const users = ref([]);
const loadingUsers = ref(true);
const searchQuery = ref('');

// ── State : Organisations ──
const organizations = ref([]);
const loadingOrgs = ref(true);
const searchOrgs = ref('');

// ── State : Demandes RGPD ──
const deletionRequests = ref([]);
const exportRequests = ref([]);
const loadingGdpr = ref(true);

// ── State : Dialogue changement de rôle ──
const showRoleDialog = ref(false);
const selectedUser = ref(null);
const newRole = ref('');
const isUpdating = ref(false);

// ── State : Dialogue membres d'une organisation ──
const showMembersDialog = ref(false);
const selectedOrg = ref(null);
const orgMembers = ref([]);
const loadingMembers = ref(false);

// ── Stats ──
const stats = ref({
    totalUsers: 0,
    totalOrgs: 0,
    superAdmins: 0,
    recentUsers: 0,
    pendingDeletions: 0
});

// ── Fetch utilisateurs ──
const fetchUsers = async () => {
    loadingUsers.value = true;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        users.value = data || [];

        stats.value.totalUsers = users.value.length;
        stats.value.superAdmins = users.value.filter(u => u.role === 'super_admin').length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        stats.value.recentUsers = users.value.filter(u => {
            const updatedAt = new Date(u.updated_at);
            return updatedAt >= thirtyDaysAgo;
        }).length;
    } catch (err) {
        console.error('[AdminDashboard] Erreur fetch users:', err);
    } finally {
        loadingUsers.value = false;
    }
};

// ── Fetch organisations ──
const fetchOrganizations = async () => {
    loadingOrgs.value = true;
    try {
        const { data, error } = await supabase
            .from('organizations')
            .select('*, organization_members(count)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        organizations.value = (data || []).map(org => ({
            ...org,
            member_count: org.organization_members?.[0]?.count || 0
        }));

        stats.value.totalOrgs = organizations.value.length;
    } catch (err) {
        console.error('[AdminDashboard] Erreur fetch orgs:', err);
    } finally {
        loadingOrgs.value = false;
    }
};

// ── Fetch demandes RGPD ──
const fetchGdprRequests = async () => {
    loadingGdpr.value = true;
    try {
        const [delRes, expRes] = await Promise.all([
            supabase
                .from('data_deletion_requests')
                .select('*, profiles:user_id(email, full_name)')
                .order('requested_at', { ascending: false }),
            supabase
                .from('data_export_requests')
                .select('*, profiles:user_id(email, full_name)')
                .order('requested_at', { ascending: false })
        ]);

        if (delRes.error) throw delRes.error;
        if (expRes.error) throw expRes.error;

        deletionRequests.value = delRes.data || [];
        exportRequests.value = expRes.data || [];

        stats.value.pendingDeletions = deletionRequests.value.filter(r => r.status === 'pending').length;
    } catch (err) {
        console.error('[AdminDashboard] Erreur fetch RGPD:', err);
    } finally {
        loadingGdpr.value = false;
    }
};

// ── Filtres ──
const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value;
    const q = searchQuery.value.toLowerCase();
    return users.value.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
});

const filteredOrgs = computed(() => {
    if (!searchOrgs.value) return organizations.value;
    const q = searchOrgs.value.toLowerCase();
    return organizations.value.filter(o =>
        o.name?.toLowerCase().includes(q) ||
        o.slug?.toLowerCase().includes(q)
    );
});

// ── Utilitaires ──
const getRoleSeverity = (role) => {
    if (role === 'super_admin') return 'danger';
    return 'info';
};

const getRoleLabel = (role) => {
    if (role === 'super_admin') return 'Super Admin';
    return 'Utilisateur';
};

const getStatusSeverity = (status) => {
    const map = { pending: 'warning', processing: 'info', approved: 'info', completed: 'success', expired: 'secondary', rejected: 'danger' };
    return map[status] || 'secondary';
};

const getStatusLabel = (status) => {
    const map = { pending: 'En attente', processing: 'En cours', approved: 'Approuvé', completed: 'Terminé', expired: 'Expiré', rejected: 'Refusé' };
    return map[status] || status;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const isCurrentUser = (userId) => authStore.user?.id === userId;

// ── Dialogue changement de rôle plateforme ──
const openRoleChangeDialog = (user) => {
    selectedUser.value = user;
    newRole.value = user.role === 'super_admin' ? 'user' : 'super_admin';
    showRoleDialog.value = true;
};

const confirmRoleChange = async () => {
    if (!selectedUser.value) return;
    isUpdating.value = true;
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole.value, updated_at: new Date().toISOString() })
            .eq('id', selectedUser.value.id);

        if (error) throw error;

        const idx = users.value.findIndex(u => u.id === selectedUser.value.id);
        if (idx !== -1) {
            users.value[idx].role = newRole.value;
            users.value[idx].updated_at = new Date().toISOString();
        }
        stats.value.superAdmins = users.value.filter(u => u.role === 'super_admin').length;

        toast.add({ severity: 'success', summary: 'Rôle modifié', detail: `${selectedUser.value.full_name || selectedUser.value.email} est maintenant ${getRoleLabel(newRole.value)}`, life: 3000 });
        showRoleDialog.value = false;
    } catch (err) {
        console.error('[AdminDashboard] Erreur changement rôle:', err);
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de modifier le rôle', life: 5000 });
    } finally {
        isUpdating.value = false;
    }
};

const cancelRoleChange = () => {
    showRoleDialog.value = false;
    selectedUser.value = null;
};

// ── Voir les membres d'une organisation ──
const viewOrgMembers = async (org) => {
    selectedOrg.value = org;
    showMembersDialog.value = true;
    loadingMembers.value = true;
    orgMembers.value = [];

    try {
        // Récupérer les membres de cette organisation
        const { data: membersData, error: membersErr } = await supabase
            .from('organization_members')
            .select('id, user_id, role, joined_at')
            .eq('organization_id', org.id)
            .order('joined_at', { ascending: true });

        if (membersErr) throw membersErr;

        if (!membersData || membersData.length === 0) {
            orgMembers.value = [];
            return;
        }

        // Récupérer les profils correspondants
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .in('id', userIds);

        if (profilesErr) throw profilesErr;

        // Fusionner
        orgMembers.value = membersData.map(m => ({
            ...m,
            profile: (profilesData || []).find(p => p.id === m.user_id) || null,
        }));
    } catch (err) {
        console.error('[AdminDashboard] Erreur fetch org members:', err);
        toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les membres', life: 5000 });
    } finally {
        loadingMembers.value = false;
    }
};

const getOrgRoleLabel = (role) => {
    const map = { owner: 'Propriétaire', admin: 'Administrateur', member: 'Membre' };
    return map[role] || role;
};

const getOrgRoleSeverity = (role) => {
    const map = { owner: 'danger', admin: 'warning', member: 'info' };
    return map[role] || 'secondary';
};

// ── Actions organisations ──
const toggleOrgActive = async (org) => {
    try {
        const { error } = await supabase
            .from('organizations')
            .update({ is_active: !org.is_active })
            .eq('id', org.id);

        if (error) throw error;

        const idx = organizations.value.findIndex(o => o.id === org.id);
        if (idx !== -1) organizations.value[idx].is_active = !org.is_active;

        toast.add({ severity: 'success', summary: org.is_active ? 'Organisation désactivée' : 'Organisation activée', life: 3000 });
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: err.message, life: 5000 });
    }
};

// ── Actions RGPD ──
const updateDeletionStatus = async (request, newStatus) => {
    try {
        const { error } = await supabase
            .from('data_deletion_requests')
            .update({
                status: newStatus,
                processed_at: new Date().toISOString(),
                processed_by: authStore.user.id
            })
            .eq('id', request.id);

        if (error) throw error;

        const idx = deletionRequests.value.findIndex(r => r.id === request.id);
        if (idx !== -1) {
            deletionRequests.value[idx].status = newStatus;
            deletionRequests.value[idx].processed_at = new Date().toISOString();
        }
        stats.value.pendingDeletions = deletionRequests.value.filter(r => r.status === 'pending').length;

        toast.add({ severity: 'success', summary: 'Statut mis à jour', detail: `Demande ${getStatusLabel(newStatus).toLowerCase()}`, life: 3000 });
    } catch (err) {
        toast.add({ severity: 'error', summary: 'Erreur', detail: err.message, life: 5000 });
    }
};

onMounted(() => {
    fetchUsers();
    fetchOrganizations();
    fetchGdprRequests();
});
</script>

<template>
    <div class="space-y-8" v-if="authStore.isSuperAdmin">
        <!-- En-tête -->
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ t('admin.title') }}
            </h1>
            <p class="text-gray-500 dark:text-gray-400">{{ t('admin.subtitle') }}</p>
        </div>

        <!-- Cartes statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-primary">
                <div class="text-gray-500 mb-1 text-sm font-medium">Utilisateurs</div>
                <div class="text-3xl font-bold">{{ stats.totalUsers }}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
                <div class="text-gray-500 mb-1 text-sm font-medium">Organisations</div>
                <div class="text-3xl font-bold">{{ stats.totalOrgs }}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-red-500">
                <div class="text-gray-500 mb-1 text-sm font-medium">Super Admins</div>
                <div class="text-3xl font-bold">{{ stats.superAdmins }}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-green-500">
                <div class="text-gray-500 mb-1 text-sm font-medium">Nouveaux (30j)</div>
                <div class="text-3xl font-bold">{{ stats.recentUsers }}</div>
            </div>
            <div class="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border-l-4 border-orange-500">
                <div class="text-gray-500 mb-1 text-sm font-medium">Suppressions en attente</div>
                <div class="text-3xl font-bold">{{ stats.pendingDeletions }}</div>
            </div>
        </div>

        <!-- Onglets -->
        <TabView v-model:activeIndex="activeTab">

            <!-- ═══════════ Onglet Organisations ═══════════ -->
            <TabPanel header="Organisations">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Organisations</h2>
                        <span class="p-input-icon-left">
                            <i class="pi pi-search" />
                            <InputText v-model="searchOrgs" placeholder="Rechercher une organisation..." class="w-64" />
                        </span>
                    </div>

                    <DataTable :value="filteredOrgs" :loading="loadingOrgs" paginator :rows="10" dataKey="id">
                        <template #empty>Aucune organisation trouvée</template>

                        <Column field="name" header="Nom" sortable style="width: 25%">
                            <template #body="{ data }">
                                <div>
                                    <span class="font-medium">{{ data.name }}</span>
                                    <span class="block text-xs text-gray-400">{{ data.slug }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column field="member_count" header="Membres" sortable style="width: 15%">
                            <template #body="{ data }">
                                <div class="flex items-center gap-2">
                                    <i class="pi pi-users text-gray-400"></i>
                                    <span>{{ data.member_count }}</span>
                                </div>
                            </template>
                        </Column>

                        <Column field="is_active" header="Statut" sortable style="width: 15%">
                            <template #body="{ data }">
                                <Tag :value="data.is_active ? 'Active' : 'Désactivée'"
                                     :severity="data.is_active ? 'success' : 'danger'" />
                            </template>
                        </Column>

                        <Column field="created_at" header="Créée le" sortable style="width: 20%">
                            <template #body="{ data }">
                                <span class="text-sm text-gray-500">{{ formatDate(data.created_at) }}</span>
                            </template>
                        </Column>

                        <Column header="Actions" style="width: 30%">
                            <template #body="{ data }">
                                <div class="flex gap-2">
                                    <Button
                                        label="Membres"
                                        icon="pi pi-users"
                                        severity="info"
                                        size="small"
                                        outlined
                                        @click="viewOrgMembers(data)"
                                    />
                                    <Button
                                        :label="data.is_active ? 'Désactiver' : 'Activer'"
                                        :icon="data.is_active ? 'pi pi-ban' : 'pi pi-check'"
                                        :severity="data.is_active ? 'danger' : 'success'"
                                        size="small"
                                        outlined
                                        @click="toggleOrgActive(data)"
                                    />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>

            <!-- ═══════════ Onglet Utilisateurs ═══════════ -->
            <TabPanel header="Utilisateurs">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                    <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('admin.users_list') }}</h2>
                        <span class="p-input-icon-left">
                            <i class="pi pi-search" />
                            <InputText v-model="searchQuery" :placeholder="t('admin.search_placeholder')" class="w-64" />
                        </span>
                    </div>

                    <DataTable :value="filteredUsers" :loading="loadingUsers" paginator :rows="10" dataKey="id">
                        <template #empty>{{ t('admin.empty_list') }}</template>

                        <Column field="full_name" :header="t('admin.columns.name')" sortable style="width: 20%">
                            <template #body="{ data }">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <i class="pi pi-user text-primary"></i>
                                    </div>
                                    <div>
                                        <span class="font-medium">{{ data.full_name || '-' }}</span>
                                        <span v-if="isCurrentUser(data.id)" class="ml-2 text-xs text-primary">({{ t('admin.you') }})</span>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column field="email" :header="t('admin.columns.email')" sortable style="width: 25%">
                            <template #body="{ data }">
                                <span class="text-gray-600 dark:text-gray-400">{{ data.email || '-' }}</span>
                            </template>
                        </Column>

                        <Column field="role" :header="t('admin.columns.role')" sortable style="width: 15%">
                            <template #body="{ data }">
                                <Tag :value="getRoleLabel(data.role)" :severity="getRoleSeverity(data.role)" />
                            </template>
                        </Column>

                        <Column field="updated_at" :header="t('admin.columns.last_activity')" sortable style="width: 25%">
                            <template #body="{ data }">
                                <span class="text-sm text-gray-500">{{ formatDate(data.updated_at) }}</span>
                            </template>
                        </Column>

                        <Column :header="t('admin.columns.actions')" style="width: 15%">
                            <template #body="{ data }">
                                <Button
                                    v-if="!isCurrentUser(data.id)"
                                    :label="data.role === 'super_admin' ? 'Rétrograder' : 'Promouvoir'"
                                    :icon="data.role === 'super_admin' ? 'pi pi-user' : 'pi pi-shield'"
                                    :severity="data.role === 'super_admin' ? 'secondary' : 'warning'"
                                    size="small"
                                    outlined
                                    @click="openRoleChangeDialog(data)"
                                />
                                <span v-else class="text-xs text-gray-400 italic">-</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </TabPanel>

            <!-- ═══════════ Onglet RGPD ═══════════ -->
            <TabPanel header="RGPD">
                <div class="space-y-6">
                    <!-- Demandes de suppression -->
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            <i class="pi pi-trash mr-2"></i>Demandes de suppression
                        </h2>

                        <DataTable :value="deletionRequests" :loading="loadingGdpr" paginator :rows="10" dataKey="id">
                            <template #empty>Aucune demande de suppression</template>

                            <Column header="Utilisateur" style="width: 25%">
                                <template #body="{ data }">
                                    <div>
                                        <span class="font-medium">{{ data.profiles?.full_name || '-' }}</span>
                                        <span class="block text-xs text-gray-400">{{ data.profiles?.email }}</span>
                                    </div>
                                </template>
                            </Column>

                            <Column field="reason" header="Raison" style="width: 25%">
                                <template #body="{ data }">
                                    <span class="text-sm text-gray-600">{{ data.reason || '-' }}</span>
                                </template>
                            </Column>

                            <Column field="status" header="Statut" style="width: 15%">
                                <template #body="{ data }">
                                    <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                                </template>
                            </Column>

                            <Column field="requested_at" header="Date" sortable style="width: 15%">
                                <template #body="{ data }">
                                    <span class="text-sm text-gray-500">{{ formatDate(data.requested_at) }}</span>
                                </template>
                            </Column>

                            <Column header="Actions" style="width: 20%">
                                <template #body="{ data }">
                                    <div v-if="data.status === 'pending'" class="flex gap-2">
                                        <Button label="Approuver" icon="pi pi-check" severity="success" size="small" outlined @click="updateDeletionStatus(data, 'approved')" />
                                        <Button label="Refuser" icon="pi pi-times" severity="danger" size="small" outlined @click="updateDeletionStatus(data, 'rejected')" />
                                    </div>
                                    <span v-else-if="data.status === 'approved'">
                                        <Button label="Terminé" icon="pi pi-check-circle" severity="success" size="small" outlined @click="updateDeletionStatus(data, 'completed')" />
                                    </span>
                                    <span v-else class="text-xs text-gray-400 italic">Traité</span>
                                </template>
                            </Column>
                        </DataTable>
                    </div>

                    <!-- Demandes d'export -->
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            <i class="pi pi-download mr-2"></i>Demandes d'export
                        </h2>

                        <DataTable :value="exportRequests" :loading="loadingGdpr" paginator :rows="10" dataKey="id">
                            <template #empty>Aucune demande d'export</template>

                            <Column header="Utilisateur" style="width: 30%">
                                <template #body="{ data }">
                                    <div>
                                        <span class="font-medium">{{ data.profiles?.full_name || '-' }}</span>
                                        <span class="block text-xs text-gray-400">{{ data.profiles?.email }}</span>
                                    </div>
                                </template>
                            </Column>

                            <Column field="status" header="Statut" style="width: 20%">
                                <template #body="{ data }">
                                    <Tag :value="getStatusLabel(data.status)" :severity="getStatusSeverity(data.status)" />
                                </template>
                            </Column>

                            <Column field="requested_at" header="Date" sortable style="width: 25%">
                                <template #body="{ data }">
                                    <span class="text-sm text-gray-500">{{ formatDate(data.requested_at) }}</span>
                                </template>
                            </Column>

                            <Column field="completed_at" header="Traité le" style="width: 25%">
                                <template #body="{ data }">
                                    <span class="text-sm text-gray-500">{{ data.completed_at ? formatDate(data.completed_at) : '-' }}</span>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </TabPanel>
        </TabView>

        <!-- Dialogue changement de rôle -->
        <Dialog v-model:visible="showRoleDialog" header="Modifier le rôle plateforme" :modal="true" :closable="!isUpdating" :style="{ width: '450px' }">
            <div class="flex flex-col gap-4" v-if="selectedUser">
                <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <i class="pi pi-user text-primary text-xl"></i>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-900 dark:text-white">{{ selectedUser.full_name || '-' }}</p>
                        <p class="text-sm text-gray-500">{{ selectedUser.email }}</p>
                    </div>
                </div>

                <div class="flex items-center justify-center gap-4 py-4">
                    <div class="text-center">
                        <Tag :value="getRoleLabel(selectedUser.role)" :severity="getRoleSeverity(selectedUser.role)" class="text-lg px-4 py-2" />
                        <p class="text-xs text-gray-500 mt-1">Actuel</p>
                    </div>
                    <i class="pi pi-arrow-right text-2xl text-gray-400"></i>
                    <div class="text-center">
                        <Tag :value="getRoleLabel(newRole)" :severity="getRoleSeverity(newRole)" class="text-lg px-4 py-2" />
                        <p class="text-xs text-gray-500 mt-1">Nouveau</p>
                    </div>
                </div>

                <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div class="flex items-start gap-3">
                        <i class="pi pi-exclamation-triangle text-yellow-600 dark:text-yellow-400 mt-0.5"></i>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300">
                            {{ newRole === 'super_admin'
                                ? 'Cet utilisateur aura accès à toutes les données de toutes les organisations.'
                                : 'Cet utilisateur perdra son accès super-admin et ne verra plus que les données de ses organisations.' }}
                        </p>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <Button label="Annuler" severity="secondary" @click="cancelRoleChange" :disabled="isUpdating" />
                    <Button label="Confirmer" :icon="isUpdating ? 'pi pi-spin pi-spinner' : 'pi pi-check'"
                            :severity="newRole === 'super_admin' ? 'warning' : 'secondary'"
                            @click="confirmRoleChange" :disabled="isUpdating" />
                </div>
            </template>
        </Dialog>

        <!-- Dialogue membres d'une organisation -->
        <Dialog v-model:visible="showMembersDialog"
                :header="'Membres de ' + (selectedOrg?.name || '')"
                :modal="true"
                :style="{ width: '700px' }">
            <DataTable :value="orgMembers" :loading="loadingMembers" dataKey="id" stripedRows>
                <template #empty>
                    <div class="text-center py-6 text-gray-500">
                        <i class="pi pi-users text-3xl mb-2 block"></i>
                        <p>Aucun membre dans cette organisation</p>
                    </div>
                </template>

                <Column header="Utilisateur" style="width: 40%">
                    <template #body="{ data }">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <i class="pi pi-user text-primary text-sm"></i>
                            </div>
                            <div>
                                <span class="font-medium">{{ data.profile?.full_name || '-' }}</span>
                                <span class="block text-xs text-gray-400">{{ data.profile?.email }}</span>
                            </div>
                        </div>
                    </template>
                </Column>

                <Column field="role" header="Rôle organisation" style="width: 25%">
                    <template #body="{ data }">
                        <Tag :value="getOrgRoleLabel(data.role)" :severity="getOrgRoleSeverity(data.role)" />
                    </template>
                </Column>

                <Column field="profile.role" header="Rôle plateforme" style="width: 20%">
                    <template #body="{ data }">
                        <Tag :value="getRoleLabel(data.profile?.role)" :severity="getRoleSeverity(data.profile?.role)" />
                    </template>
                </Column>

                <Column field="joined_at" header="Membre depuis" style="width: 15%">
                    <template #body="{ data }">
                        <span class="text-sm text-gray-500">{{ formatDate(data.joined_at) }}</span>
                    </template>
                </Column>
            </DataTable>

            <template #footer>
                <Button label="Fermer" severity="secondary" @click="showMembersDialog = false" />
            </template>
        </Dialog>
    </div>

    <!-- Accès refusé -->
    <div v-else class="flex items-center justify-center h-64">
        <div class="text-center">
            <i class="pi pi-lock text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">{{ t('admin.access_denied') }}</p>
        </div>
    </div>
</template>
