import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [vue(), tailwindcss(), basicSsl()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
