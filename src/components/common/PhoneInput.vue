<script setup>
import { ref, watch } from 'vue';
import { parsePhoneNumber, AsYouType } from 'libphonenumber-js';
import InputText from 'primevue/inputtext';

const props = defineProps({
  modelValue: { type: String, default: '' },
  defaultCountry: { type: String, default: 'FR' },
  placeholder: { type: String, default: '+33 6 12 34 56 78' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const displayValue = ref('');
const isValid = ref(null);

// Max 15 chiffres (norme E.164)
const MAX_DIGITS = 15;

// Compter les chiffres dans une chaîne
const countDigits = (str) => (str.match(/\d/g) || []).length;

// Format E.164 → affichage international
const formatForDisplay = (e164) => {
  if (!e164) return '';
  try {
    const parsed = parsePhoneNumber(e164);
    if (parsed) return parsed.formatInternational();
  } catch {}
  return e164;
};

// Parse input → E.164
const toE164 = (input) => {
  if (!input) return '';
  try {
    const parsed = parsePhoneNumber(input, props.defaultCountry);
    if (parsed && parsed.isValid()) return parsed.format('E.164');
  } catch {}
  return input;
};

// Initialiser depuis modelValue
const initFromModel = (val) => {
  if (!val) {
    displayValue.value = '';
    isValid.value = null;
    return;
  }
  displayValue.value = formatForDisplay(val);
  try {
    const parsed = parsePhoneNumber(val, props.defaultCountry);
    isValid.value = parsed ? parsed.isValid() : false;
  } catch {
    isValid.value = false;
  }
};

watch(() => props.modelValue, (val) => {
  const currentE164 = toE164(displayValue.value);
  if (val !== currentE164) {
    initFromModel(val);
  }
}, { immediate: true });

const handleInput = (event) => {
  let raw = event.target.value;

  // Nettoyer : ne garder que chiffres, +, espaces, tirets, points
  raw = raw.replace(/[^\d+\s\-.()]/g, '');

  // Auto-remplacement : si commence par 0, transformer en +33
  if (raw.match(/^0[1-9]/)) {
    raw = '+33' + raw.slice(1);
  }

  // Si pas de +, ajouter +33 par défaut
  if (raw && !raw.startsWith('+') && !raw.startsWith('0')) {
    raw = '+' + raw;
  }

  // Limiter le nombre de chiffres à 15 (norme E.164)
  const digits = raw.match(/\d/g) || [];
  if (digits.length > MAX_DIGITS) {
    // Tronquer en gardant seulement les N premiers chiffres
    let kept = 0;
    let truncated = '';
    for (const char of raw) {
      if (/\d/.test(char)) {
        if (kept >= MAX_DIGITS) break;
        kept++;
      }
      truncated += char;
    }
    raw = truncated;
  }

  // Formatage en cours de saisie
  const formatter = new AsYouType(props.defaultCountry);
  const formatted = formatter.input(raw);
  displayValue.value = formatted;

  // Forcer la valeur dans l'input (pour que le curseur reste cohérent)
  event.target.value = formatted;

  // Émettre E.164 si parseable
  const e164 = toE164(raw);
  emit('update:modelValue', e164);

  // Validation
  try {
    const parsed = parsePhoneNumber(raw, props.defaultCountry);
    isValid.value = parsed ? parsed.isValid() : null;
  } catch {
    isValid.value = countDigits(raw) > 3 ? false : null;
  }
};

const handleKeydown = (event) => {
  // Autoriser : backspace, delete, tab, escape, enter, flèches, ctrl+a/c/v/x
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (allowed.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey) return;

  // Autoriser + seulement en première position et si pas déjà présent
  if (event.key === '+') {
    if (displayValue.value.includes('+') || event.target.selectionStart > 0) {
      event.preventDefault();
    }
    return;
  }

  // Autoriser uniquement les chiffres et espaces
  if (!/[\d\s]/.test(event.key)) {
    event.preventDefault();
    return;
  }

  // Bloquer si on a déjà atteint le max de chiffres
  if (/\d/.test(event.key) && countDigits(displayValue.value) >= MAX_DIGITS) {
    event.preventDefault();
  }
};

const handlePaste = (event) => {
  event.preventDefault();
  const pasted = (event.clipboardData || window.clipboardData).getData('text');
  // Nettoyer le texte collé
  const cleaned = pasted.replace(/[^\d+]/g, '');
  // Simuler un input avec la valeur nettoyée
  const input = event.target;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const current = displayValue.value;
  const newVal = current.slice(0, start) + cleaned + current.slice(end);
  input.value = newVal;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const handleBlur = () => {
  if (!displayValue.value) return;
  const e164 = toE164(displayValue.value);
  if (e164 && e164.startsWith('+')) {
    displayValue.value = formatForDisplay(e164);
    emit('update:modelValue', e164);
    try {
      const parsed = parsePhoneNumber(e164);
      isValid.value = parsed ? parsed.isValid() : false;
    } catch {
      isValid.value = false;
    }
  }
};
</script>

<template>
  <div class="relative">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm select-none">🇫🇷</span>
    <InputText
      :value="displayValue"
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
      @blur="handleBlur"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full pl-10"
      type="tel"
      maxlength="20"
    />
    <div v-if="isValid !== null && displayValue" class="absolute right-3 top-1/2 -translate-y-1/2">
      <i v-if="isValid" class="pi pi-check-circle text-green-500"></i>
      <i v-else class="pi pi-exclamation-circle text-red-400"></i>
    </div>
  </div>
</template>
