import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';

export const useOrganizationStore = defineStore('organization', () => {
  const members = ref([]);
  const pendingInvitations = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const auth = useAuthStore();

  // ── Membres ──

  const fetchMembers = async () => {
    const orgId = auth.currentOrganization?.id;
    if (!orgId) return;

    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('organization_members')
        .select('*, profiles:user_id(id, email, role, created_at)')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: true });

      if (err) throw err;
      members.value = data || [];
    } catch (err) {
      error.value = err.message;
      console.error('[OrganizationStore] fetchMembers:', err.message);
    } finally {
      loading.value = false;
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    try {
      const { error: err } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (err) throw err;

      // Mise à jour locale
      const index = members.value.findIndex(m => m.id === memberId);
      if (index !== -1) {
        members.value[index].role = newRole;
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeMember = async (memberId) => {
    try {
      const { error: err } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (err) throw err;

      members.value = members.value.filter(m => m.id !== memberId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Invitations ──

  const fetchPendingInvitations = async () => {
    const orgId = auth.currentOrganization?.id;
    if (!orgId) return;

    try {
      const { data, error: err } = await supabase
        .from('invitations')
        .select('*, profiles:invited_by(email)')
        .eq('organization_id', orgId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (err) throw err;
      pendingInvitations.value = data || [];
    } catch (err) {
      console.error('[OrganizationStore] fetchPendingInvitations:', err.message);
      pendingInvitations.value = [];
    }
  };

  const inviteMember = async (email, role = 'member') => {
    const orgId = auth.currentOrganization?.id;
    if (!orgId) return { success: false, error: 'Aucune organisation sélectionnée' };

    try {
      const { data, error: err } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          email,
          role,
          invited_by: auth.user.id,
        })
        .select()
        .single();

      if (err) {
        // Erreur de contrainte unique = invitation déjà existante
        if (err.code === '23505') {
          throw new Error('Une invitation est déjà en attente pour cet email');
        }
        throw err;
      }

      pendingInvitations.value.unshift(data);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const cancelInvitation = async (invitationId) => {
    try {
      const { error: err } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (err) throw err;

      pendingInvitations.value = pendingInvitations.value.filter(i => i.id !== invitationId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Organisation ──

  const updateOrganization = async (updates) => {
    const orgId = auth.currentOrganization?.id;
    if (!orgId) return { success: false, error: 'Aucune organisation sélectionnée' };

    try {
      const { data, error: err } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId)
        .select()
        .single();

      if (err) throw err;

      // Mettre à jour le store auth
      if (auth.currentOrganization) {
        auth.currentOrganization.name = data.name;
        auth.currentOrganization.slug = data.slug;
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    // State
    members,
    pendingInvitations,
    loading,
    error,
    // Actions
    fetchMembers,
    updateMemberRole,
    removeMember,
    fetchPendingInvitations,
    inviteMember,
    cancelInvitation,
    updateOrganization,
  };
});
