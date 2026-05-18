import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [vue(), tailwindcss(), basicSsl()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
