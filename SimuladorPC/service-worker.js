// Service worker de LogicFlow.
//
// Estrategia:
//   • HTML y JS de la app  → network-first (los cambios de un deploy llegan de
//     inmediato; si no hay red, se sirve la copia cacheada).
//   • /vendor/, CSS, imágenes, fuentes locales, modelos 3D y wasm → cache-first
//     (contenido estable/inmutable, se sirve al instante y se cachea en runtime).
//   • Google Fonts (cross-origin) → cache-first para funcionar offline.
//   • Resto cross-origin (YouTube, Supabase) → directo a la red.

const CACHE_VERSION = 'v36';
const CACHE_NAME = `logicflow-${CACHE_VERSION}`;

// App shell precacheado en install para arranque offline.
const PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/registro.html',
  '/recuperar-password.html',
  '/actualizar-password.html',
  '/confirmar-cuenta.html',
  '/menu.html',
  '/juego.html',
  '/retos.html',
  '/calculadora.html',
  '/glosario.html',
  '/academia.html',
  '/leccion.html',
  '/manifest.json',
  '/favicon.svg',
  '/assets/icon.svg',
  '/css/estilos.css',
  '/css/logicflow-premium.css',
  '/css/landing-v2.css',
  '/css/auth-v2.css',
  '/css/dashboard-v2.css',
  '/css/sim-v2.css',
  '/css/tools-v2.css',
  '/css/retos.css',
  '/css/academia.css',
  '/js/theme.js',
  '/js/ui-effects.js',
  '/js/menu.js',
  '/js/achievements.js',
  '/js/learning-tools.js',
  '/js/calculadora.js',
  '/js/glosario.js',
  '/js/academia.js',
  '/js/academia-data.js',
  '/js/academia-api.js',
  '/js/leccion.js',
  '/js/quiz-data.js'
];

function esNavegacion(request) {
  return request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (esNavegacion(request)) {
      const shell = await cache.match('/index.html');
      if (shell) return shell;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && (fresh.status === 200 || fresh.type === 'opaque')) {
    cache.put(request, fresh.clone());
  }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Cross-origin: solo cacheamos Google Fonts. El resto pasa directo a la red.
  if (url.origin !== self.location.origin) {
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Librerías vendorizadas (Three.js, decodificador Draco): inmutables → cache-first.
  if (url.pathname.startsWith('/vendor/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML y JS de la app → network-first (freshness en cada deploy).
  if (esNavegacion(request) || url.pathname.endsWith('.js')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // CSS, imágenes, fuentes locales, modelos 3D, wasm → cache-first.
  event.respondWith(cacheFirst(request));
});
