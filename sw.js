// Service worker: guarda la app en el dispositivo para que funcione sin conexión.
//
// IMPORTANTE: al publicar cualquier cambio en la app hay que subir este número.
// Es lo que le avisa al celular que hay una versión nueva para descargar.
const VERSION = 'hourscalc-v2';

const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/calc.js',
  './js/formato.js',
  './js/historial.js',
  './js/motivos.js',
  './js/ranking.js',
  './js/store.js',
  './js/ui-calculadora.js',
  './js/ui-comun.js',
  './js/ui-historial.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSION)
      // `reload` evita que la versión nueva se arme con archivos viejos de la caché HTTP.
      .then((cache) => cache.addAll(ARCHIVOS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(request, { ignoreSearch: true }).then((guardado) => guardado ?? fetch(request)),
  );
});
