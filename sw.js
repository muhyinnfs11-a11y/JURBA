// Service worker - Jurnal Guru SDN 1 Baharu Utara
// Naikkan angka VERSI setiap kali ada perubahan besar agar cache lama dibersihkan.
const VERSI = 'jurnal-v4';
const INTI = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSI);
    await c.addAll(INTI);
    try { await c.add(XLSX_URL); } catch (err) { /* lanjut walau gagal */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSI).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Jangan pernah mencegat data/login ke Google Apps Script (POST atau domain Google)
  if (req.method !== 'GET') return;
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // Halaman utama: ambil versi terbaru dari internet dulu, cadangan dari cache
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(VERSI);
        c.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }

  // File lain (ikon, library xlsx, font): cache dulu, lalu internet
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(VERSI);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
