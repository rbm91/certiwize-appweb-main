import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  build: {
    // Cibler Safari 14+ pour compatibilité iOS/macOS
    target: ['es2020', 'safari14'],
  },
})
