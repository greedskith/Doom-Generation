import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['dg-favicon.svg', 'dg-favicon.ico', 'dg-apple-icon.png', 'paper-texture-compressed.jpg'],
      manifest: {
        name: 'Doom Generation',
        short_name: 'DG',
        description: 'A brutalist photo gallery.',
        theme_color: '#031211',
        background_color: '#031211',
        display: 'standalone',
        icons: [
          {
            src: '/dg-favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/dg-favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
