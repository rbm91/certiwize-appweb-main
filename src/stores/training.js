import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export const useTrainingStore = defineStore('training', () => {
    const loading = ref(false);
    const formations = ref([]);
    const archivedFormations = ref([]);
    const auth = useAuthStore();

    // ── Computed getters ──

    const catalogueFormations = computed(() =>
        formations.value.filter(f => !f.type || f.type === 'catalogue')
    );

    const surMesureFormations = computed(() =>
        formations.value.filter(f => f.type === 'sur_mesure')
    );

    // ── Fetch ──

    const fetchFormations = async () => {
        if (!auth.currentOrganization?.id && !auth.isSuperAdmin) {
            loading.value = false;
            return;
        }

        loading.value = true;
        try {
            const orgId = auth.currentOrganization?.id;

            let query = supabase
                .from('formations')
                .select('*, profiles(email)')
                .is('deleted_at', null)
                .order('updated_at', { ascending: false });

            if (!auth.isSuperAdmin) {
                query = query.eq('organization_id', orgId);
            }

            const { data, error: err } = await query;

            if (err) throw err;
            formations.value = data || [];
        } catch (err) {
            console.error('[TrainingStore] Error fetching formations:', err);
            formations.value = [];
            throw err;
        } finally {
            loading.value = false;
        }
    };

    const fetchArchivedFormations = async () => {
        if (!auth.currentOrganization?.id && !auth.isSuperAdmin) return;

        try {
            const orgId = auth.currentOrganization?.id;

            let query = supabase
                .from('formations')
                .select('*, profiles(email)')
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false });

            if (!auth.isSuperAdmin) {
                query = query.eq('organization_id', orgId);
            }

            const { data, error: err } = await query;
            if (err) throw err;
            archivedFormations.value = data || [];
        } catch (err) {
            console.error('[TrainingStore] Error fetching archived formations:', err);
            archivedFormations.value = [];
        }
    };

    // ── CRUD ──

    const saveTraining = async (trainingData, id = null, pdfUrl = null) => {
        loading.value = true;
        try {
            const payload = {
                organization_id: auth.currentOrganization?.id,
                user_id: auth.user.id,
                title: trainingData.titre || 'Nouvelle Formation',
                content: trainingData,
                updated_at: new Date()
            };

            if (pdfUrl) {
                payload.pdf_url = pdfUrl;
            }

            let query = supabase.from('formations');
            let result;

            if (id) {
                const orgId = auth.currentOrganization?.id;
                result = await query.update(payload).eq('id', id).eq('organization_id', orgId).select().single();
            } else {
                result = await query.insert([payload]).select().single();
            }

            if (result.error) throw result.error;

            await fetchFormations();

            return { success: true, data: result.data };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            loading.value = false;
        }
    };

    // ── Archive (soft-delete) ──

    const softDeleteFormation = async (id) => {
        try {
            const orgId = auth.currentOrganization?.id;
            if (!orgId && !auth.isSuperAdmin) throw new Error('Aucune organisation sélectionnée');

            let query = supabase
                .from('formations')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (!auth.isSuperAdmin) {
                query = query.eq('organization_id', orgId);
            }

            const { error: err } = await query;
            if (err) throw err;

            formations.value = formations.value.filter(f => f.id !== id);
            return { success: true };
        } catch (err) {
            console.error('[TrainingStore] softDeleteFormation:', err.message);
            return { success: false, error: err.message };
        }
    };

    const restoreFormation = async (id) => {
        try {
            const orgId = auth.currentOrganization?.id;
            if (!orgId && !auth.isSuperAdmin) throw new Error('Aucune organisation sélectionnée');

            let query = supabase
                .from('formations')
                .update({ deleted_at: null })
                .eq('id', id);

            if (!auth.isSuperAdmin) {
                query = query.eq('organization_id', orgId);
            }

            const { error: err } = await query;
            if (err) throw err;

            archivedFormations.value = archivedFormations.value.filter(f => f.id !== id);
            await fetchFormations();
            return { success: true };
        } catch (err) {
            console.error('[TrainingStore] restoreFormation:', err.message);
            return { success: false, error: err.message };
        }
    };

    // ── Hard delete (conservé pour rétrocompatibilité) ──

    const deleteFormation = async (id) => {
        try {
            const orgId = auth.currentOrganization?.id;
            if (!orgId) throw new Error('Aucune organisation sélectionnée');

            const { error: err } = await supabase
                .from('formations')
                .delete()
                .eq('id', id)
                .eq('organization_id', orgId);

            if (err) throw err;

            formations.value = formations.value.filter(f => f.id !== id);
        } catch (err) {
            throw new Error("Impossible de supprimer cette formation.");
        }
    };

    // ── PDF ──

    const generatePdf = async (trainingId, formData) => {
        loading.value = true;
        try {
            const webhookUrl = import.meta.env.VITE_N8N_HOOK_GENERATE_TRAINING;
            if (!webhookUrl) {
                throw new Error('Webhook URL non configurée (VITE_N8N_HOOK_GENERATE_TRAINING manquant dans .env)');
            }

            const response = await fetchWithTimeout(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: trainingId, ...formData })
            }, 60000);

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Erreur génération");

            return { success: true, pdfUrl: result.pdfUrl };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            loading.value = false;
        }
    };

    return {
        // State
        loading,
        formations,
        archivedFormations,
        // Computed
        catalogueFormations,
        surMesureFormations,
        // Fetch
        fetchFormations,
        fetchArchivedFormations,
        // CRUD
        saveTraining,
        deleteFormation,
        softDeleteFormation,
        restoreFormation,
        // PDF
        generatePdf,
    };
});
