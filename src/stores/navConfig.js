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

      config.value = data?.config || JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    } catch (err) {
      console.error('[NavConfig] Error fetching config:', err);
      config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    } finally {
      loading.value = false;
    }
  };

  /**
   * Sauvegarder la config (UPDATE si existant, INSERT sinon)
   */
  const saveConfig = async (newConfig) => {
    loading.value = true;
    try {
      const orgId = auth.currentOrganization?.id;
      if (!orgId) throw new Error('Organization ID manquant');

      // Chercher une config existante pour cette organisation
      const { data: existing } = await supabase
        .from('nav_config')
        .select('id')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let error;
      if (existing?.id) {
        // Mettre à jour la ligne existante
        ({ error } = await supabase
          .from('nav_config')
          .update({
            config: newConfig,
            updated_at: new Date().toISOString(),
            updated_by: auth.user?.id || null
          })
          .eq('id', existing.id));
      } else {
        // Première sauvegarde : insérer une nouvelle ligne
        ({ error } = await supabase
          .from('nav_config')
          .insert({
            config: newConfig,
            updated_at: new Date().toISOString(),
            updated_by: auth.user?.id || null,
            organization_id: orgId
          }));
      }

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
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
    if (!newConfig.topNav) newConfig.topNav = { order: [], labels: {} };
    if (!newConfig.topNav.labels) newConfig.topNav.labels = {};
    newConfig.topNav.labels[name] = label;
    return saveConfig(newConfig);
  };

  /**
   * Mettre à jour l'ordre des items de la topnav
   */
  const updateOrder = async (newOrder) => {
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
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

      config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
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
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
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
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
    if (!newConfig.labels) newConfig.labels = {};
    newConfig.labels[key] = label;
    return saveConfig(newConfig);
  };

  /**
   * Supprimer un label custom (retour au défaut)
   */
  const removeCustomLabel = async (key) => {
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
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
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
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
    const newConfig = JSON.parse(JSON.stringify(config.value || DEFAULT_CONFIG));
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
  const addCustomField = async (section, { label, type, placeholder, options }) => {
    // Initialiser config si null
    if (!config.value) {
      config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    // Muter en place pour la réactivité Vue
    if (!config.value.customFields) {
      config.value.customFields = {};
    }
    if (!config.value.customFields[section]) {
      config.value.customFields[section] = [];
    }

    // Générer une clé unique
    const key = `custom_${section.replace(/\./g, '_')}_${Date.now()}`;
    const field = {
      key,
      label,
      type, // 'text' | 'textarea' | 'number' | 'date' | 'toggle' | 'select'
      createdAt: new Date().toISOString()
    };
    if (placeholder) field.placeholder = placeholder;
    if (options && options.length > 0) field.options = options;

    config.value.customFields[section].push(field);

    // Sauvegarder (clone pour Supabase)
    await saveConfig(JSON.parse(JSON.stringify(config.value)));

    return field;
  };

  /**
   * Supprimer un champ custom
   */
  const removeCustomField = async (section, fieldKey) => {
    if (!config.value?.customFields?.[section]) return { success: true };

    // Muter en place pour la réactivité Vue
    const idx = config.value.customFields[section].findIndex(f => f.key === fieldKey);
    if (idx !== -1) {
      config.value.customFields[section].splice(idx, 1);
    }
    // Nettoyer la section si vide
    if (config.value.customFields[section].length === 0) {
      delete config.value.customFields[section];
    }

    // Sauvegarder en arrière-plan
    return saveConfig(JSON.parse(JSON.stringify(config.value)));
  };

  /**
   * Mettre à jour le label d'un champ custom
   */
  const updateCustomFieldLabel = async (section, fieldKey, newLabel) => {
    const field = config.value?.customFields?.[section]?.find(f => f.key === fieldKey);
    if (field) {
      field.label = newLabel;
      return saveConfig(JSON.parse(JSON.stringify(config.value)));
    }
    return { success: true };
  };

  /**
   * Réordonner les champs custom d'une section
   */
  const reorderCustomFields = async (section, orderedKeys) => {
    if (!config.value?.customFields?.[section]) return { success: true };
    const fields = config.value.customFields[section];
    const reordered = orderedKeys
      .map(key => fields.find(f => f.key === key))
      .filter(Boolean);
    config.value.customFields[section] = reordered;
    return saveConfig(JSON.parse(JSON.stringify(config.value)));
  };

  // ========================================
  // Gestion des placeholders (textes suggérés)
  // ========================================

  /**
   * Récupérer le placeholder custom d'un champ
   */
  const getFieldPlaceholder = (fieldKey, fallback) => {
    return config.value?.placeholders?.[fieldKey] || fallback || '';
  };

  /**
   * Mettre à jour le placeholder d'un champ
   */
  const updateFieldPlaceholder = async (fieldKey, placeholder) => {
    if (!config.value) config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (!config.value.placeholders) config.value.placeholders = {};
    if (placeholder && placeholder.trim()) {
      config.value.placeholders[fieldKey] = placeholder.trim();
    } else {
      delete config.value.placeholders[fieldKey];
    }
    return saveConfig(JSON.parse(JSON.stringify(config.value)));
  };

  // ========================================
  // Gestion des champs obligatoires (requiredFields)
  // ========================================

  /**
   * Vérifier si un champ est obligatoire
   */
  const isFieldRequired = (fieldKey) => {
    return (config.value?.requiredFields || []).includes(fieldKey);
  };

  /**
   * Basculer l'état obligatoire d'un champ
   */
  const toggleFieldRequired = async (fieldKey) => {
    if (!config.value) config.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    if (!config.value.requiredFields) config.value.requiredFields = [];
    const idx = config.value.requiredFields.indexOf(fieldKey);
    if (idx !== -1) {
      config.value.requiredFields.splice(idx, 1);
    } else {
      config.value.requiredFields.push(fieldKey);
    }
    return saveConfig(JSON.parse(JSON.stringify(config.value)));
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
    updateCustomFieldLabel,
    reorderCustomFields,
    // Placeholders
    getFieldPlaceholder,
    updateFieldPlaceholder,
    // Champs obligatoires
    isFieldRequired,
    toggleFieldRequired
  };
});
