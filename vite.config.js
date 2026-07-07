import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/beatdrop/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'BeatDrop - Name That Tune',
        short_name: 'BeatDrop',
        description: 'The ultimate music party game',
        theme_color: '#6C63FF',
        background_color: '#0D0D1A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/beatdrop/',
        start_url: '/beatdrop/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png',  sizes: '512x512',  type: 'image/png', purpose: 'any maskable' },
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
      }
    })
  ],
  server: { port: 5174 },
})
