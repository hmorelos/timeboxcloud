const CACHE_NAME = 'planeador-v2';
const ASSETS = ['./', './index.html', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// HTML y JS: red primero (siempre intenta la version mas nueva),
// cae al cache solo si no hay internet. Esto evita quedarse
// atorado en una version vieja despues de actualizar archivos.
const NETWORK_FIRST = ['.html', '.js', '/'];

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const esNetworkFirst = NETWORK_FIRST.some(suf => url.endsWith(suf)) || event.request.mode === 'navigate';

  if (esNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'chequeo-planeador') {
    event.waitUntil(self.registration.showNotification('Planeador', {
      body: 'Abre la app para revisar tus tareas de hoy.',
      icon: 'icon-192.png'
    }));
  }
});
