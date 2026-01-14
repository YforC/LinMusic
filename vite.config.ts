import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/music-api': {
        target: 'https://music-dl.sayqz.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/music-api/, '')
      }
    }
  }
})
