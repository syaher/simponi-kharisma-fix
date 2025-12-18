const CACHE_NAME = "kharisma-cache-v14";
const OFFLINE_URL = "/offline.html";

const FILES_TO_CACHE = [
  "/index.html",
  "/jindex.html",
  "/pendaftaran.html",
  "/nadhom.html",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/logo.png"
];

/* ================= INSTALL ================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  // ❌ jangan skipWaiting di sini
});

/* ================= ACTIVATE ================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );

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

  if (
    event.request.url.includes("supabase.co") ||
    event.request.url.includes("/auth")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            if (
              response.ok &&
              event.request.url.startsWith(self.location.origin)
            ) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(event.request, copy)
              );
            }
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL))
      );
    })
  );
});
