import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Haven',
    short_name: 'Haven',
    description: 'The household week, dinners and grocery list in one calm place.',
    start_url: '/week',
    scope: '/',
    display: 'standalone',
    background_color: '#FBF9F7',
    theme_color: '#C47A5A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
