

const CACHE_NAME = 'logicflow-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/registro.html',
  '/recuperar-password.html',
  '/actualizar-password.html',
  '/menu.html',
  '/juego.html',
  '/calculadora.html',
  '/glosario.html',
  '/css/estilos.css',
  '/css/inicio.css',
  '/css/logicflow-premium.css',
  '/css/landing-v2.css',
  '/css/auth-v2.css',
  '/css/dashboard-v2.css',
  '/css/sim-v2.css',
  '/css/tools-v2.css',
  '/js/theme.js',
  '/js/ui-effects.js',
  '/js/menu.js',
  '/js/achievements.js',
  '/js/learning-tools.js',
  '/js/calculadora.js',
  '/js/glosario.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).catch(() => {

    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }).catch(() => {
      return caches.match('/index.html');
    })
  );
});
