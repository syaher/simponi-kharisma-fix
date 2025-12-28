/* =====================================================
   🧠 SERVICE WORKER - KHARISMA (FINAL)
   ===================================================== */

const CACHE_NAME = "kharisma-cache-v17";
const OFFLINE_URL = "/offline.html";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/jindex.html",
  "/pendaftaran.html",
  "/nadhom.html",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/logo.png",
];

/* ================= INSTALL ================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  // ⛔ Jangan skipWaiting otomatis
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 🔥 Hapus cache versi lama
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );

      // 🚀 Ambil kontrol halaman
      await self.clients.claim();
    })()
  );
});

/* ================= MESSAGE ================= */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ================= FETCH ================= */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 🚫 Jangan cache API / Auth
  if (
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/auth")
  ) {
    return;
  }

  // 🔥 HTML → SELALU ambil dari network (biar update terasa)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 📦 Asset → cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});
