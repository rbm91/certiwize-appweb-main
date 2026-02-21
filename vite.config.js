import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  build: {
    // Cibler Safari 14+ pour compatibilité JS iOS/macOS
    target: ['es2020', 'safari14'],
  },
  css: {
    // Utiliser Lightning CSS pour convertir les fonctions CSS modernes
    // (oklch → rgb pour Safari < 15.4)
    // Note : color-mix() avec var() ne peut pas être converti statiquement
    // (limitation Tailwind v4 — dégradation visuelle mineure sur très anciens Safari)
    transformer: 'lightningcss',
    lightningcss: {
      // Safari 14.0 = (14 << 16) | (0 << 8) = 917504
      targets: {
        safari: (14 << 16),
        ios_saf: (14 << 16),
      },
    },
  },
})
