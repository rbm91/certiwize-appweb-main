import { ref } from 'vue';
import { supabase } from '../supabase';
import { useAuthStore } from '../stores/auth';

/**
 * Composable pour le journal d'audit.
 * Toutes les actions critiques sont journalisées (création, modification, ajout/suppression rôle, ajout document).
 * Le journal n'est pas modifiable.
 * Chaque entrée est liée à une organization_id pour le cloisonnement multi-tenant.
 */
export const useAuditTrail = () => {
  const loading = ref(false);
  const error = ref(null);

  /**
   * Enregistre un événement dans le journal d'audit
   * @param {string} objet - Type d'objet (tiers, prestation, facture, etc.)
   * @param {string} objet_id - ID de l'objet
   * @param {string} type_evenement - Type d'événement (creation, modification, ajout_role, etc.)
   * @param {string|null} champ - Champ modifié (optionnel)
   * @param {*} ancienne_valeur - Ancienne valeur (optionnel)
   * @param {*} nouvelle_valeur - Nouvelle valeur (optionnel)
   */
  const logEvent = async (objet, objet_id, type_evenement, champ = null, ancienne_valeur = null, nouvelle_valeur = null) => {
    try {
      const auth = useAuthStore();
      const { error: err } = await supabase
        .from('audit_log')
        .insert({
          objet,
          objet_id,
          type_evenement,
          champ,
          ancienne_valeur: ancienne_valeur !== null ? JSON.stringify(ancienne_valeur) : null,
          nouvelle_valeur: nouvelle_valeur !== null ? JSON.stringify(nouvelle_valeur) : null,
          user_id: auth.user?.id,
          organization_id: auth.currentOrganization?.id,
        });

      if (err) {
        console.warn('[AuditTrail] Erreur log:', err.message);
      }
    } catch (e) {
      // L'audit ne doit jamais bloquer l'opération principale
      console.warn('[AuditTrail] Exception:', e.message);
    }
  };

  /**
   * Récupère le journal d'audit pour un objet
   * Les RLS policies filtrent automatiquement par organization_id
   */
  const fetchAuditLog = async (objet, objet_id) => {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('audit_log')
        .select('*, profiles:user_id(email)')
        .eq('objet', objet)
        .eq('objet_id', objet_id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      return data || [];
    } catch (e) {
      error.value = e.message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les événements d'audit récents (filtrés par RLS = org courante)
   */
  const fetchRecentAudit = async (limit = 50) => {
    loading.value = true;
    try {
      const { data, error: err } = await supabase
        .from('audit_log')
        .select('*, profiles:user_id(email)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (err) throw err;
      return data || [];
    } catch (e) {
      error.value = e.message;
      return [];
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    logEvent,
    fetchAuditLog,
    fetchRecentAudit,
  };
};
