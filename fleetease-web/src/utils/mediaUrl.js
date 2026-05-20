import { API_ORIGIN } from '../config/env';

const ASSET_FILES = new Set([
  'Sameer1.jpg', 'Sameer2.jpg', 'Sameer3.jpg', 'Sameer4.jpg',
  'Sameer5.jpg', 'Sameer6.jpg', 'Sameer7.jpg', 'Sameer8.jpg',
  'sameer1.svg', 'sameer2.svg', 'sameer3.svg', 'sameer4.svg',
  'sameer5.svg', 'sameer6.svg', 'sameer7.svg', 'sameer8.svg',
  'sameer9.svg', 'sameer10.svg', 'sameer11.svg',
]);

/** Resolve gallery/bus image URL for display in the React app. */
export function resolveMediaUrl(file) {
  if (!file) return '';
  const name = file.name || '';
  let url = file.url || '';

  if (!url && name) {
    url = ASSET_FILES.has(name) || /\.(jpg|jpeg|png|svg|webp)$/i.test(name)
      ? `/assets/${name}`
      : `/gallery/${name}`;
  }

  if (url.startsWith('http')) return url;

  if (url.startsWith('/assets/') || ASSET_FILES.has(name)) {
    return url.startsWith('/assets/') ? url : `/assets/${name}`;
  }

  if (url.startsWith('/gallery/')) {
    return `${API_ORIGIN}${url}`;
  }

  return url.startsWith('/') ? url : `/assets/${url}`;
}

export const DEFAULT_GALLERY = [
  { name: 'Sameer1.jpg', title: 'Fleet coach exterior', url: '/assets/Sameer1.jpg', source: 'assets' },
  { name: 'Sameer2.jpg', title: 'Sleeper coach interior', url: '/assets/Sameer2.jpg', source: 'assets' },
  { name: 'Sameer3.jpg', title: 'Highway journey', url: '/assets/Sameer3.jpg', source: 'assets' },
  { name: 'Sameer4.jpg', title: 'Comfort seating', url: '/assets/Sameer4.jpg', source: 'assets' },
  { name: 'Sameer5.jpg', title: 'Premium AC fleet', url: '/assets/Sameer5.jpg', source: 'assets' },
  { name: 'Sameer6.jpg', title: 'Night travel service', url: '/assets/Sameer6.jpg', source: 'assets' },
  { name: 'Sameer7.jpg', title: 'Clean and sanitized', url: '/assets/Sameer7.jpg', source: 'assets' },
  { name: 'Sameer8.jpg', title: 'Corporate charter bus', url: '/assets/Sameer8.jpg', source: 'assets' },
  { name: 'sameer9.svg', title: 'Driver cabin', url: '/assets/sameer9.svg', source: 'assets' },
  { name: 'sameer10.svg', title: 'Bus terminal', url: '/assets/sameer10.svg', source: 'assets' },
  { name: 'sameer11.svg', title: 'Onboard amenities', url: '/assets/sameer11.svg', source: 'assets' },
];
