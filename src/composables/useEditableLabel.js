import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useNavConfigStore } from '../stores/navConfig';

/**
 * Composable pour gérer les labels éditables sur la plateforme.
 * Utilise le store navConfig pour stocker les labels custom par organisation.
 */
export const useEditableLabel = () => {
  const navConfig = useNavConfigStore();
  const auth = useAuthStore();

  /**
   * Récupérer un label : custom → fallback → key
   */
  const getLabel = (key, fallback) => {
    return navConfig.getCustomLabel(key, fallback);
  };

  /**
   * Mettre à jour un label custom
   */
  const updateLabel = async (key, label) => {
    return navConfig.updateCustomLabel(key, label);
  };

  /**
   * Supprimer un label custom (retour au défaut)
   */
  const removeLabel = async (key) => {
    return navConfig.removeCustomLabel(key);
  };

  const isSuperAdmin = computed(() => auth.isSuperAdmin);

  return { getLabel, updateLabel, removeLabel, isSuperAdmin };
};
