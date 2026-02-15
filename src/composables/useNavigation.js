import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useNavConfigStore } from '../stores/navConfig';

// Items affichés dans la barre horizontale du haut (mode topnav)
const topNavItems = [
  { name: 'accueil', href: '/dashboard', icon: 'pi-home' },
  { name: 'tiers', href: '/dashboard/tiers', icon: 'pi-users' },
  { name: 'catalogue', href: '/dashboard/catalogue', icon: 'pi-book' },
  { name: 'prestations', href: '/dashboard/projets', icon: 'pi-briefcase' },
  { name: 'analysis', href: '/dashboard/analyse-doc', icon: 'pi-search' },
  { name: 'quiz_builder', href: '/dashboard/quiz', icon: 'pi-question-circle' },
  { name: 'manual', href: '/dashboard/manuel-qualiopi', icon: 'pi-book' },
  { name: 'genedoc', href: 'https://qualiopi-modelisation.genedoc.fr/', icon: 'pi-link', external: true },
];

// Sous-éléments de la sidebar contextuelle par section
const sidebarItemsBySection = {
  accueil: [],
  tiers: [
    { name: 'sidebar_tiers_all', href: '/dashboard/tiers', icon: 'pi-list' },
    { type: 'separator', label: 'Formateurs' },
    { name: 'sidebar_tiers_formateurs', href: '/dashboard/tiers?type=Formateur', icon: 'pi-list' },
    { name: 'sidebar_tiers_create_formateur', href: '/dashboard/tiers/create?type=Formateur', icon: 'pi-plus' },
    { type: 'separator', label: 'Financeurs' },
    { name: 'sidebar_tiers_financeurs', href: '/dashboard/tiers?type=Financeur', icon: 'pi-list' },
    { name: 'sidebar_tiers_create_financeur', href: '/dashboard/tiers/create?type=Financeur', icon: 'pi-plus' },
    { type: 'separator', label: 'Entreprises' },
    { name: 'sidebar_tiers_entreprises', href: '/dashboard/tiers?type=Entreprise', icon: 'pi-list' },
    { name: 'sidebar_tiers_create_entreprise', href: '/dashboard/tiers/create?type=Entreprise', icon: 'pi-plus' },
    { type: 'separator', label: 'Apprenants' },
    { name: 'sidebar_learners', href: '/dashboard/learners', icon: 'pi-list' },
    { name: 'sidebar_learners_create', href: '/dashboard/learners/create', icon: 'pi-plus' },
  ],
  catalogue: [
    { name: 'sidebar_catalogue_list', href: '/dashboard/catalogue', icon: 'pi-list' },
    { name: 'sidebar_catalogue_create', href: '/dashboard/catalogue/create', icon: 'pi-plus' },
  ],
  prestations: [
    { name: 'sidebar_prestations_list', href: '/dashboard/projets', icon: 'pi-list' },
    { name: 'sidebar_prestations_create', href: '/dashboard/projets/create', icon: 'pi-plus' },
  ],
  analysis: [],
  quiz_builder: [],
  manual: [],
  genedoc: [],
};

// Items fixes en bas du sidebar (toujours visibles)
const fixedSideNavItems = [
  {
    name: 'settings',
    href: '/dashboard/company',
    icon: 'pi-cog',
    submenu: [
      { name: 'company_settings', href: '/dashboard/company', icon: 'pi-building' },
      { name: 'doc_types_settings', href: '/dashboard/doc-types-settings', icon: 'pi-file-edit' },
      { name: 'workflow_settings', href: '/dashboard/workflow-settings', icon: 'pi-sliders-h', adminOnly: true }
    ]
  },
];

const adminNavItem = { name: 'admin', href: '/dashboard/admin', icon: 'pi-shield', adminOnly: true };
const usersNavItem = { name: 'users_groups', href: '/dashboard/admin', icon: 'pi-users' };

// Tous les items pour le mode sidebar classique
const allNavItems = [
  { name: 'dashboard', href: '/dashboard', icon: 'pi-home' },
  { name: 'tiers', href: '/dashboard/tiers', icon: 'pi-users' },
  { name: 'catalogue', href: '/dashboard/catalogue', icon: 'pi-book' },
  { name: 'prestations', href: '/dashboard/projets', icon: 'pi-briefcase' },
  { name: 'analysis', href: '/dashboard/analyse-doc', icon: 'pi-search' },
  { name: 'quiz_builder', href: '/dashboard/quiz', icon: 'pi-question-circle' },
  { name: 'manual', href: '/dashboard/manuel-qualiopi', icon: 'pi-book' },
  { name: 'genedoc', href: 'https://qualiopi-modelisation.genedoc.fr/', icon: 'pi-link', external: true },
  {
    name: 'settings',
    href: '/dashboard/company',
    icon: 'pi-cog',
    submenu: [
      { name: 'company_settings', href: '/dashboard/company', icon: 'pi-building' },
      { name: 'doc_types_settings', href: '/dashboard/doc-types-settings', icon: 'pi-file-edit' },
      { name: 'workflow_settings', href: '/dashboard/workflow-settings', icon: 'pi-sliders-h', adminOnly: true }
    ]
  },
];

export const useNavigation = () => {
  const route = useRoute();
  const { t } = useI18n();
  const authStore = useAuthStore();
  const navConfigStore = useNavConfigStore();

  // Navigation complète (mode sidebar classique)
  const navigation = computed(() => {
    if (authStore.isAdmin) {
      return [...allNavItems, adminNavItem];
    }
    return allNavItems;
  });

  // Items pour la barre horizontale du haut (mode topnav)
  // Applique l'ordre custom depuis navConfigStore si disponible
  const topNavigation = computed(() => {
    const overrides = navConfigStore.config;
    let items = [...topNavItems];

    // Appliquer l'ordre custom
    if (overrides?.topNav?.order?.length) {
      const orderMap = new Map(overrides.topNav.order.map((name, i) => [name, i]));
      items.sort((a, b) => {
        const ai = orderMap.has(a.name) ? orderMap.get(a.name) : (a.name === 'accueil' ? -1 : 999);
        const bi = orderMap.has(b.name) ? orderMap.get(b.name) : (b.name === 'accueil' ? -1 : 999);
        return ai - bi;
      });
    }

    return items;
  });

  // Section active dérivée de la route courante
  const activeSection = computed(() => {
    const path = route.path;
    if (path === '/dashboard') return 'accueil';
    if (path.startsWith('/dashboard/tiers') || path.startsWith('/dashboard/learners')) return 'tiers';
    if (path.startsWith('/dashboard/catalogue')) return 'catalogue';
    if (path.startsWith('/dashboard/projets')) return 'prestations';
    if (path.startsWith('/dashboard/analyse-doc')) return 'analysis';
    if (path.startsWith('/dashboard/quiz')) return 'quiz_builder';
    if (path.startsWith('/dashboard/manuel-qualiopi')) return 'manual';
    if (path.startsWith('/dashboard/company') || path.startsWith('/dashboard/doc-types-settings') || path.startsWith('/dashboard/workflow-settings')) return 'settings';
    if (path.startsWith('/dashboard/admin')) return 'admin';
    return 'accueil';
  });

  // Items pour le sidebar gauche (mode topnav) — contextuel selon la section active
  const sideNavigation = computed(() => {
    const section = activeSection.value;
    const sectionConfig = sidebarItemsBySection[section];

    let contextual = [];
    if (sectionConfig?.comingSoon) {
      contextual = [{ type: 'comingSoon' }];
    } else if (Array.isArray(sectionConfig)) {
      contextual = [...sectionConfig];
    }

    // Items fixes toujours présents en bas
    const fixed = [...fixedSideNavItems];
    if (authStore.isAdmin) {
      fixed.push(adminNavItem);
      fixed.push(usersNavItem);
    }

    return { contextual, fixed };
  });

  // Vérifier si un lien correspond à la page courante (supporte les query params)
  const isCurrent = (href) => {
    if (!href || href === '#') return false;

    try {
      const url = new URL(href, window.location.origin);

      // Match exact pour /dashboard (accueil)
      if (url.pathname === '/dashboard') {
        return route.path === '/dashboard' && !route.query.type;
      }

      // Le path doit matcher en préfixe
      if (!route.path.startsWith(url.pathname)) return false;

      // Si le href a des query params, ils doivent tous matcher
      for (const [key, value] of url.searchParams.entries()) {
        if (route.query[key] !== value) return false;
      }

      // Si pas de query params dans le href mais la route en a, ne pas matcher
      // (ex: /dashboard/tiers ne doit pas matcher /dashboard/tiers?type=Formateur)
      if (!url.search && route.query.type && url.pathname === route.path) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  // Labels : utilise le label custom sidebar, puis topnav, puis i18n
  const getLabel = (name) => {
    const sidebarLabel = navConfigStore.config?.sidebar?.labels?.[name];
    if (sidebarLabel) return sidebarLabel;
    const customLabel = navConfigStore.config?.topNav?.labels?.[name];
    return customLabel || t(`nav.${name}`);
  };

  return {
    navigation,
    topNavigation,
    sideNavigation,
    activeSection,
    isCurrent,
    getLabel,
  };
};
