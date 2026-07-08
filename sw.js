const CACHE_NAME = 'planeador-v1';
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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Best-effort: intenta revisar alertas periodicamente si el navegador lo permite.
// El soporte de periodicSync en Android/Chrome es limitado y depende del uso que
// le des a la app; no sustituye abrir la app para garantizar avisos puntuales.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'chequeo-planeador') {
    event.waitUntil(self.registration.showNotification('Planeador', {
      body: 'Abre la app para revisar tus tareas de hoy.',
      icon: 'icon-192.png'
    }));
  }
});
