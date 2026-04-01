import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['badgers-icon.png', 'badgers-logo.jpg', 'gymworkspro-logo.png', 'vite.svg'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'The Badgers Admin',
        short_name: 'BadgersAdmin',
        description: 'Gym Management System Admin',
        theme_color: '#000000',
        icons: [
          {
            src: 'badgers-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'badgers-icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
