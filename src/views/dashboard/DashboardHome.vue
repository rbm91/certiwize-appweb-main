<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useDataStore } from '../../stores/data';
import { useTrainingStore } from '../../stores/training';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../supabase';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Checkbox from 'primevue/checkbox';
import SlowLoadingDialog from '../../components/dashboard/SlowLoadingDialog.vue';

const authStore = useAuthStore();
const dataStore = useDataStore();
const trainingStore = useTrainingStore();
const { stats, loading } = storeToRefs(dataStore);
const { formations } = storeToRefs(trainingStore);

// Projets réels
const projects = ref([]);
const projectsLoading = ref(true);

// Stats calculées
const totalFormations = computed(() => formations.value.length);
const totalProjects = computed(() => projects.value.length);
const activeProjects = computed(() => projects.value.filter(p => p.status !== 'Terminé').length);

// Widget configuration
const showWidgetConfig = ref(false);
const WIDGET_STORAGE_KEY = 'certiwize-dashboard-widgets';

const defaultWidgets = {
    stats_clients: true,
    stats_formations: true,
    stats_projects: true,
    recent_clients: true,
    recent_formations: true,
    recent_projects: true,
    quick_actions: true,
};

const widgetConfig = ref({ ...defaultWidgets });

// Charger la configuration depuis localStorage
const loadWidgetConfig = () => {
    try {
        const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
        if (saved) {
            widgetConfig.value = { ...defaultWidgets, ...JSON.parse(saved) };
        }
    } catch (e) {
        // Use defaults
    }
};

// Sauvegarder la configuration
const saveWidgetConfig = () => {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(widgetConfig.value));
    showWidgetConfig.value = false;
};

const resetWidgetConfig = () => {
    widgetConfig.value = { ...defaultWidgets };
    saveWidgetConfig();
};

// Labels des widgets pour la configuration
const widgetLabels = {
    stats_clients: 'Compteur Tiers/Clients',
    stats_formations: 'Compteur Formations',
    stats_projects: 'Compteur Prestations',
    recent_clients: 'Derniers clients',
    recent_formations: 'Dernières formations',
    recent_projects: 'Dernières prestations',
    quick_actions: 'Actions rapides',
};

// Charger les projets avec filtre par rôle
const fetchProjects = async () => {
    if (!authStore.user?.id) {
        projectsLoading.value = false;
        return;
    }

    projectsLoading.value = true;
    try {
        const checkAdmin = authStore.userRole === 'admin';

        let query = supabase
            .from('projects')
            .select('*')
            .order('updated_at', { ascending: false });

        if (!checkAdmin) {
            query = query.eq('user_id', authStore.user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        projects.value = data || [];
    } catch (e) {
        // Erreur silencieuse
    } finally {
        projectsLoading.value = false;
    }
};

const showSlowLoading = ref(false);

onMounted(async () => {
    loadWidgetConfig();
    showSlowLoading.value = false;

    const slowTimer = setTimeout(() => {
        if (loading.value || projectsLoading.value) {
            showSlowLoading.value = true;
        }
    }, 10000);

    try {
        await Promise.all([
            dataStore.fetchTiers(),
            trainingStore.fetchFormations(),
            fetchProjects()
        ]);
    } catch (e) {
        console.error('[DashboardHome] Error loading data:', e);
    } finally {
        clearTimeout(slowTimer);
        showSlowLoading.value = false;
        loading.value = false;
    }
});
</script>

<template>
    <div class="space-y-8">
        <SlowLoadingDialog :visible="showSlowLoading" />

        <!-- En-tête avec bouton personnaliser -->
        <div class="flex justify-between items-start">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ $t('dashboard.hello') }}, {{ authStore.user?.user_metadata?.full_name || 'Utilisateur' }}
                </h1>
                <p class="text-gray-500 dark:text-gray-400">{{ $t('dashboard.status_today') }}</p>
            </div>
            <Button
                icon="pi pi-cog"
                label="Personnaliser"
                severity="secondary"
                text
                size="small"
                @click="showWidgetConfig = true"
            />
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div v-if="widgetConfig.stats_clients" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-primary">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-gray-500 mb-1 text-sm font-medium">{{ $t('dashboard.total_clients') }}</div>
                        <div class="text-3xl font-bold" v-if="!loading">{{ stats.totalTiers }}</div>
                        <div class="text-3xl font-bold animate-pulse" v-else>...</div>
                    </div>
                    <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <i class="pi pi-users text-primary text-xl"></i>
                    </div>
                </div>
            </div>

            <div v-if="widgetConfig.stats_formations" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-gray-500 mb-1 text-sm font-medium">{{ $t('dashboard.active_formations') }}</div>
                        <div class="text-3xl font-bold" v-if="!trainingStore.loading">{{ totalFormations }}</div>
                        <div class="text-3xl font-bold animate-pulse" v-else>...</div>
                    </div>
                    <div class="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <i class="pi pi-book text-blue-500 text-xl"></i>
                    </div>
                </div>
            </div>

            <div v-if="widgetConfig.stats_projects" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-gray-500 mb-1 text-sm font-medium">{{ $t('dashboard.active_projects') }}</div>
                        <div class="text-3xl font-bold" v-if="!projectsLoading">{{ activeProjects }} <span class="text-sm font-normal text-gray-400">/ {{ totalProjects }}</span></div>
                        <div class="text-3xl font-bold animate-pulse" v-else>...</div>
                    </div>
                    <div class="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <i class="pi pi-briefcase text-orange-500 text-xl"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Widgets liste -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Derniers Tiers -->
            <div v-if="widgetConfig.recent_clients" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <h3 class="font-bold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 flex items-center gap-2">
                    <i class="pi pi-users text-primary text-sm"></i>
                    {{ $t('dashboard.recent_clients') }}
                </h3>
                <ul class="space-y-3" v-if="!loading">
                    <li v-for="tier in dataStore.tiers.slice(0, 5)" :key="tier.id" class="flex justify-between items-center text-sm">
                        <span class="font-medium text-gray-700 dark:text-gray-300">{{ tier.name }}</span>
                        <span class="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{{ tier.state }}</span>
                    </li>
                    <li v-if="dataStore.tiers.length === 0" class="text-gray-400 text-sm italic">{{ $t('dashboard.no_clients') }}</li>
                </ul>
                <div v-else class="text-sm text-gray-400">{{ $t('dashboard.loading') }}</div>
            </div>

            <!-- Dernières Formations -->
            <div v-if="widgetConfig.recent_formations" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <h3 class="font-bold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 flex items-center gap-2">
                    <i class="pi pi-book text-blue-500 text-sm"></i>
                    {{ $t('dashboard.recent_formations') }}
                </h3>
                <ul class="space-y-3" v-if="!trainingStore.loading">
                    <li v-for="formation in formations.slice(0, 5)" :key="formation.id" class="flex justify-between items-center text-sm">
                        <span class="font-medium text-gray-700 dark:text-gray-300">{{ formation.title }}</span>
                        <span class="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            {{ new Date(formation.updated_at).toLocaleDateString('fr-FR') }}
                        </span>
                    </li>
                    <li v-if="formations.length === 0" class="text-gray-400 text-sm italic">{{ $t('dashboard.no_formations') }}</li>
                </ul>
                <div v-else class="text-sm text-gray-400">{{ $t('dashboard.loading') }}</div>
            </div>

            <!-- Dernières Prestations -->
            <div v-if="widgetConfig.recent_projects" class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                <h3 class="font-bold text-gray-800 dark:text-gray-100 mb-4 border-b pb-2 flex items-center gap-2">
                    <i class="pi pi-briefcase text-orange-500 text-sm"></i>
                    {{ $t('dashboard.recent_projects') }}
                </h3>
                <ul class="space-y-3" v-if="!projectsLoading">
                    <li v-for="project in projects.slice(0, 5)" :key="project.id" class="flex justify-between items-center text-sm">
                        <span class="font-medium text-gray-700 dark:text-gray-300">{{ project.name }}</span>
                        <span class="text-xs text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">{{ project.status || $t('dashboard.status_draft') }}</span>
                    </li>
                    <li v-if="projects.length === 0" class="text-gray-400 text-sm italic">{{ $t('dashboard.no_projects') }}</li>
                </ul>
                <div v-else class="text-sm text-gray-400">{{ $t('dashboard.loading') }}</div>
            </div>
        </div>

        <!-- Actions rapides -->
        <div v-if="widgetConfig.quick_actions" class="bg-blue-50 dark:bg-gray-800/50 p-6 rounded-xl border border-blue-100 dark:border-gray-700">
            <h3 class="font-bold mb-4">{{ $t('dashboard.quick_actions') }}</h3>
            <div class="flex flex-wrap gap-3">
                <router-link to="/dashboard/tiers/create">
                    <Button :label="$t('dashboard.btn_new_client')" icon="pi pi-user-plus" />
                </router-link>
                <router-link to="/dashboard/catalogue/create">
                    <Button :label="$t('dashboard.btn_new_formation')" icon="pi pi-book" />
                </router-link>
                <router-link to="/dashboard/projets/create">
                    <Button :label="$t('dashboard.btn_new_project')" icon="pi pi-plus" />
                </router-link>
                <router-link to="/dashboard/learners/create">
                    <Button :label="$t('dashboard.btn_new_learner')" icon="pi pi-graduation-cap" />
                </router-link>
            </div>
        </div>

        <!-- Dialog de configuration des widgets -->
        <Dialog v-model:visible="showWidgetConfig" header="Personnaliser le tableau de bord" :style="{ width: '450px' }" modal>
            <p class="text-sm text-gray-500 mb-4">Choisissez les widgets à afficher sur votre tableau de bord :</p>

            <div class="space-y-3">
                <div v-for="(label, key) in widgetLabels" :key="key" class="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Checkbox v-model="widgetConfig[key]" :binary="true" :inputId="key" />
                    <label :for="key" class="cursor-pointer text-sm font-medium">{{ label }}</label>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-between w-full">
                    <Button label="Réinitialiser" icon="pi pi-refresh" severity="secondary" text @click="resetWidgetConfig" />
                    <div class="flex gap-2">
                        <Button label="Annuler" severity="secondary" @click="showWidgetConfig = false" />
                        <Button label="Enregistrer" icon="pi pi-check" @click="saveWidgetConfig" />
                    </div>
                </div>
            </template>
        </Dialog>
    </div>
</template>
