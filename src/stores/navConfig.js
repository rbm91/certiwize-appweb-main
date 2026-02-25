import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '../supabase';
import { useAuthStore } from './auth';

const DEFAULT_CONFIG = {
  version: 1,
  topNav: {
    order: [],   // vide = ordre par défaut (hardcodé)
    labels: {}   // vide = labels i18n par défaut
  },
  sidebar: {
    labels: {}   // labels custom pour les items sidebar
  },
  labels: {}     // labels custom pour tous les libellés de la plateforme (formulaires, titres, etc.)
};

export const useNavConfigStore = defineStore('navConfig', () => {
  const config = ref(null);
  const loading = ref(false);
  const auth = useAuthStore();

  /**
   * Charger la config nav la plus récente depuis Supabase
   */
  const fetchConfig = async () => {
    loading.value = true;
    try {
      const orgId = auth.currentOrganization?.id;
      const { data, error } = await supabase
        .from('nav_config')
        .select('config')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      config.value = data?.config || structuredClone(DEFAULT_CONFIG);
    } catch (err) {
      console.error('[NavConfig] Error fetching config:', err);
      config.value = structuredClone(DEFAULT_CONFIG);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Sauvegarder la config (INSERT nouvelle version)
   */
  const saveConfig = async (newConfig) => {
    loading.value = true;
    try {
      const { error } = await supabase
        .from('nav_config')
        .insert({
          config: newConfig,
          updated_at: new Date().toISOString(),
          updated_by: auth.user?.id || null,
          organization_id: auth.currentOrganization?.id
        });

      if (error) throw error;

      config.value = newConfig;
      return { success: true };
    } catch (err) {
      console.error('[NavConfig] Error saving config:', err);
      return { success: false, error: err.message };
    } finally {
      loading.value = false;
    }
  };

  /**
   * Mettre à jour un label custom pour un item de nav
   */
  const updateLabel = async (name, label) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.topNav) newConfig.topNav = { order: [], labels: {} };
    if (!newConfig.topNav.labels) newConfig.topNav.labels = {};
    newConfig.topNav.labels[name] = label;
    return saveConfig(newConfig);
  };

  /**
   * Mettre à jour l'ordre des items de la topnav
   */
  const updateOrder = async (newOrder) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.topNav) newConfig.topNav = { order: [], labels: {} };
    newConfig.topNav.order = newOrder;
    return saveConfig(newConfig);
  };

  /**
   * Réinitialiser la config nav
   */
  const resetConfig = async () => {
    loading.value = true;
    try {
      const orgId = auth.currentOrganization?.id;
      const { error } = await supabase
        .from('nav_config')
        .delete()
        .eq('organization_id', orgId);

      if (error) throw error;

      config.value = structuredClone(DEFAULT_CONFIG);
      return { success: true };
    } catch (err) {
      console.error('[NavConfig] Error resetting config:', err);
      return { success: false, error: err.message };
    } finally {
      loading.value = false;
    }
  };

  /**
   * Mettre à jour un label custom pour un item de sidebar
   */
  const updateSidebarLabel = async (name, label) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.sidebar) newConfig.sidebar = { labels: {} };
    if (!newConfig.sidebar.labels) newConfig.sidebar.labels = {};
    newConfig.sidebar.labels[name] = label;
    return saveConfig(newConfig);
  };

  /**
   * Récupérer un label custom (formulaires, titres, etc.)
   * Retourne le label custom ou le fallback
   */
  const getCustomLabel = (key, fallback) => {
    return config.value?.labels?.[key] || fallback || key;
  };

  /**
   * Mettre à jour un label custom (formulaires, titres, etc.)
   */
  const updateCustomLabel = async (key, label) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.labels) newConfig.labels = {};
    newConfig.labels[key] = label;
    return saveConfig(newConfig);
  };

  /**
   * Supprimer un label custom (retour au défaut)
   */
  const removeCustomLabel = async (key) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (newConfig.labels) {
      delete newConfig.labels[key];
      return saveConfig(newConfig);
    }
    return { success: true };
  };

  // ========================================
  // Gestion des champs masqués (hiddenFields)
  // ========================================

  /**
   * Vérifier si un champ est masqué
   */
  const isFieldHidden = (fieldKey) => {
    return (config.value?.hiddenFields || []).includes(fieldKey);
  };

  /**
   * Masquer un champ
   */
  const hideField = async (fieldKey) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.hiddenFields) newConfig.hiddenFields = [];
    if (!newConfig.hiddenFields.includes(fieldKey)) {
      newConfig.hiddenFields.push(fieldKey);
    }
    return saveConfig(newConfig);
  };

  /**
   * Restaurer un champ masqué
   */
  const showField = async (fieldKey) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.hiddenFields) return { success: true };
    newConfig.hiddenFields = newConfig.hiddenFields.filter(k => k !== fieldKey);
    return saveConfig(newConfig);
  };

  /**
   * Récupérer les champs masqués d'une section (par préfixe)
   */
  const getHiddenFieldsBySection = (sectionPrefix) => {
    const all = config.value?.hiddenFields || [];
    return all.filter(k => k.startsWith(sectionPrefix));
  };

  // ========================================
  // Gestion des champs custom (customFields)
  // ========================================

  /**
   * Récupérer les champs custom d'une section
   */
  const getCustomFields = (section) => {
    return config.value?.customFields?.[section] || [];
  };

  /**
   * Ajouter un champ custom à une section
   */
  const addCustomField = async (section, { label, type }) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.customFields) newConfig.customFields = {};
    if (!newConfig.customFields[section]) newConfig.customFields[section] = [];

    // Générer une clé unique
    const timestamp = Date.now();
    const key = `custom_${section.replace(/\./g, '_')}_${timestamp}`;

    newConfig.customFields[section].push({
      key,
      label,
      type, // 'text' | 'textarea' | 'number' | 'date' | 'toggle'
      createdAt: new Date().toISOString()
    });

    return saveConfig(newConfig);
  };

  /**
   * Supprimer un champ custom
   */
  const removeCustomField = async (section, fieldKey) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    if (!newConfig.customFields?.[section]) return { success: true };
    newConfig.customFields[section] = newConfig.customFields[section].filter(f => f.key !== fieldKey);
    // Nettoyer la section si vide
    if (newConfig.customFields[section].length === 0) {
      delete newConfig.customFields[section];
    }
    return saveConfig(newConfig);
  };

  /**
   * Mettre à jour le label d'un champ custom
   */
  const updateCustomFieldLabel = async (section, fieldKey, newLabel) => {
    const newConfig = structuredClone(config.value || DEFAULT_CONFIG);
    const field = newConfig.customFields?.[section]?.find(f => f.key === fieldKey);
    if (field) {
      field.label = newLabel;
      return saveConfig(newConfig);
    }
    return { success: true };
  };

  return {
    config,
    loading,
    fetchConfig,
    saveConfig,
    updateLabel,
    updateSidebarLabel,
    updateOrder,
    resetConfig,
    getCustomLabel,
    updateCustomLabel,
    removeCustomLabel,
    // Champs masqués
    isFieldHidden,
    hideField,
    showField,
    getHiddenFieldsBySection,
    // Champs custom
    getCustomFields,
    addCustomField,
    removeCustomField,
    updateCustomFieldLabel
  };
});
