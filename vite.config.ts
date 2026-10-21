import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' — GitHub Pages 하위 경로(/저장소이름/)에서도 동작하도록 상대 경로 사용
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // PWA: 홈 화면 설치 + 오프라인 학습. 새 버전은 다음에 앱을 열 때 자동 적용된다.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: '매장 중국어 — 백화점 판매 실전 중국어',
        short_name: '매장 중국어',
        description: '중국인 고객 응대를 위한 듣기·말하기 연습',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f6f3',
        theme_color: '#c8102e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 파일 전부를 기기에 저장해 인터넷 없이도 열리게 한다
        globPatterns: ['**/*.{js,css,html,png,svg,json,webmanifest}'],
        navigateFallback: 'index.html',
        // 미리 만든 음성 파일(MP3)은 처음 재생할 때 저장해 두고 이후 오프라인 재생
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/'),
            handler: 'CacheFirst',
            options: { cacheName: 'audio', expiration: { maxEntries: 2000 } },
          },
        ],
      },
    }),
  ],
})
