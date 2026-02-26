<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePrestationsStore } from '../../stores/prestations';
import { PRESTATION_COLORS, PRESTATION_TYPE_OPTIONS } from '../../config/constants';
import Button from 'primevue/button';

const router = useRouter();
const prestationsStore = usePrestationsStore();

// -- État du calendrier --
const currentYear = ref(new Date().getFullYear());
const currentMonth = ref(new Date().getMonth());
const selectedDate = ref(null);

const JOUR_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// -- Mapping des prestations en événements calendrier --
const calendarEvents = computed(() => {
  return [
    ...prestationsStore.formations,
    ...prestationsStore.coachings,
    ...prestationsStore.conseils,
  ]
    .filter(p => p.date_debut)
    .map(p => ({
      id: p.id,
      title: p.intitule || 'Sans intitulé',
      start: new Date(p.date_debut),
      end: p.date_fin ? new Date(p.date_fin) : new Date(p.date_debut),
      type: p.type,
      color: PRESTATION_COLORS[p.type] || '#6B7280',
      typeLabel: PRESTATION_TYPE_OPTIONS.find(o => o.value === p.type)?.label || p.type,
      client: p.client?.nom_affiche || p.client?.raison_sociale || '',
      reference: p.reference || '',
    }));
});

// -- Utilitaires dates --
const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

const normalizeToMidnight = (d) => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// -- Génération de la grille calendrier --
const calendarDays = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0

  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const today = new Date();
  const days = [];

  // Jours du mois précédent (padding)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      dayNumber: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Jours du mois courant
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const date = new Date(year, month, d);
    days.push({
      date,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString(),
    });
  }

  // Padding fin (compléter à 42 cellules = 6 lignes)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return days;
});

// -- Événements pour un jour donné --
const getEventsForDay = (date) => {
  const dayStart = normalizeToMidnight(date);
  return calendarEvents.value.filter(evt => {
    const evtStart = normalizeToMidnight(evt.start);
    const evtEnd = normalizeToMidnight(evt.end);
    return dayStart >= evtStart && dayStart <= evtEnd;
  });
};

// -- Navigation mois --
const prevMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
  selectedDate.value = null;
};

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
  selectedDate.value = null;
};

const goToToday = () => {
  const now = new Date();
  currentYear.value = now.getFullYear();
  currentMonth.value = now.getMonth();
  selectedDate.value = now;
};

// -- Label du mois (français) --
const monthLabel = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value, 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
});

// -- Événements du jour sélectionné --
const selectedDayEvents = computed(() => {
  if (!selectedDate.value) return [];
  return getEventsForDay(selectedDate.value).sort((a, b) => a.start - b.start);
});

// -- Prochains événements (7 jours) --
const upcomingEvents = computed(() => {
  const now = normalizeToMidnight(new Date());
  const weekLater = new Date(now);
  weekLater.setDate(weekLater.getDate() + 7);

  return calendarEvents.value
    .filter(evt => normalizeToMidnight(evt.start) >= now && normalizeToMidnight(evt.start) <= weekLater)
    .sort((a, b) => a.start - b.start)
    .slice(0, 5);
});

// -- Navigation vers le détail --
const goToDetail = (event) => {
  const routeMap = {
    formation: 'dashboard-session-view',
    coaching: 'dashboard-coaching-view',
    conseil: 'dashboard-conseil-view',
  };
  const routeName = routeMap[event.type];
  if (routeName) {
    router.push({ name: routeName, params: { id: event.id } });
  }
};

// -- Format date événement --
const formatEventDate = (date) => {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// -- Sélection d'un jour --
const selectDay = (day) => {
  if (day.isCurrentMonth) {
    selectedDate.value = day.date;
  }
};
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
          <i class="pi pi-calendar text-blue-500 text-lg"></i>
        </div>
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Agenda</h2>
      </div>
      <div class="flex items-center gap-2">
        <Button icon="pi pi-chevron-left" text rounded size="small" @click="prevMonth" />
        <button
          @click="goToToday"
          class="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize min-w-[160px] text-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {{ monthLabel }}
        </button>
        <Button icon="pi pi-chevron-right" text rounded size="small" @click="nextMonth" />
      </div>
    </div>

    <!-- Layout : Calendrier + Liste événements -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- GAUCHE : Grille calendrier -->
      <div class="lg:col-span-3">
        <!-- En-têtes jours -->
        <div class="grid grid-cols-7 mb-1">
          <div
            v-for="jour in JOUR_LABELS"
            :key="jour"
            class="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2"
          >
            {{ jour }}
          </div>
        </div>

        <!-- Cellules jours -->
        <div class="grid grid-cols-7">
          <div
            v-for="(day, index) in calendarDays"
            :key="index"
            @click="selectDay(day)"
            class="relative h-12 flex flex-col items-center justify-start pt-1 border border-gray-50 dark:border-gray-700/50 transition-colors rounded"
            :class="{
              'bg-gray-50/50 dark:bg-gray-900/30 text-gray-300 dark:text-gray-600 cursor-default': !day.isCurrentMonth,
              'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer': day.isCurrentMonth,
              'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400': selectedDate && isSameDay(selectedDate, day.date),
            }"
          >
            <span
              class="text-xs font-medium"
              :class="{
                'text-white bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center': day.isToday,
                'text-gray-700 dark:text-gray-300': day.isCurrentMonth && !day.isToday,
              }"
            >
              {{ day.dayNumber }}
            </span>
            <!-- Points colorés des événements -->
            <div class="flex gap-0.5 mt-0.5">
              <span
                v-for="(evt, i) in getEventsForDay(day.date).slice(0, 3)"
                :key="i"
                class="w-1.5 h-1.5 rounded-full"
                :style="{ backgroundColor: evt.color }"
              ></span>
              <span
                v-if="getEventsForDay(day.date).length > 3"
                class="text-[8px] text-gray-400 leading-none"
              >+{{ getEventsForDay(day.date).length - 3 }}</span>
            </div>
          </div>
        </div>

        <!-- Légende -->
        <div class="flex gap-4 mt-3">
          <div v-for="opt in PRESTATION_TYPE_OPTIONS" :key="opt.value" class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: opt.color }"></span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ opt.label }}</span>
          </div>
        </div>
      </div>

      <!-- DROITE : Détails événements -->
      <div class="lg:col-span-2">
        <!-- Jour sélectionné -->
        <template v-if="selectedDate">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 capitalize">
            {{ selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) }}
          </h3>
          <div v-if="selectedDayEvents.length === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
            Aucun événement ce jour.
          </div>
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="evt in selectedDayEvents"
              :key="evt.id"
              @click="goToDetail(evt)"
              class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
            >
              <div class="w-1 min-h-[40px] rounded-full flex-shrink-0" :style="{ backgroundColor: evt.color }"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {{ evt.title }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ evt.typeLabel }} · {{ evt.client || evt.reference }}
                </p>
              </div>
              <i class="pi pi-chevron-right text-xs text-gray-300 group-hover:text-blue-400 mt-1"></i>
            </div>
          </div>
        </template>

        <!-- Prochains événements (aucun jour sélectionné) -->
        <template v-else>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
            Prochains événements
          </h3>
          <div v-if="upcomingEvents.length === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
            Aucun événement à venir.
          </div>
          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="evt in upcomingEvents"
              :key="evt.id"
              @click="goToDetail(evt)"
              class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors group"
            >
              <div class="w-1 min-h-[40px] rounded-full flex-shrink-0" :style="{ backgroundColor: evt.color }"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {{ evt.title }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ formatEventDate(evt.start) }} · {{ evt.typeLabel }} · {{ evt.client || evt.reference }}
                </p>
              </div>
              <i class="pi pi-chevron-right text-xs text-gray-300 group-hover:text-blue-400 mt-1"></i>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
