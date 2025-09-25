const CACHE_NAME = "kharisma-cache-v7"; 
const OFFLINE_URL = "/offline.html";

// Hanya file statis non-login
const FILES_TO_CACHE = [
  "/index.html",
  "/jindex.html",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/logo.png"
];

// Install → cache file dasar
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting(); // langsung aktifkan SW baru
});

// Activate → hapus cache lama + beri tahu client
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Hapus cache lama
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );

      // Klaim kontrol semua client
      await self.clients.claim();

      // Kirim pesan ke semua client bahwa ada versi baru
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((client) => {
        client.postMessage({ type: "NEW_VERSION" });
      });
    })()
  );
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Jangan cache endpoint auth atau Supabase
  if (event.request.url.includes("/auth") || event.request.url.includes("supabase.co")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // hanya cache resource statis
            if (response.ok && event.request.url.startsWith(self.location.origin)) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL))
      );
    })
  );
});
