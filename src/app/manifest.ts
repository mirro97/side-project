import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Brawl Companion',
    short_name: 'Brawl Companion',
    description: 'Brawl Stars companion — profile, brawlers, ranking, events, recommendations',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F1117',
    theme_color: '#0F1117',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
