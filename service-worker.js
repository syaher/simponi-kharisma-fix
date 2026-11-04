/* =====================================================
   🧠 SERVICE WORKER - KHARISMA
   =====================================================
   Naikkan VERSION setiap deploy yang mengubah tampilan/aplikasi supaya
   cache lama dibuang. Halaman HTML selalu divalidasi ulang ke server
   (di _headers, /* dipakai max-age=31536000 sehingga tanpa ini aplikasi
   baru terlihat setelah hard reload berjam-jam kemudian).
   ===================================================== */

const VERSION = "v20";
const CACHE_NAME = `kharisma-cache-${VERSION}`;
const OFFLINE_URL = "/offline.html";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/jindex.html",
  "/pendaftaran.html",
  "/nadhom.html",
  "/import_excel_absensi.html",
  "/import_excel_nilai.html",
  "/ubk-ubq.html",
  "/kitab.html",
  "/alumni.html",
  OFFLINE_URL,
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/logo.png",
];

const adalahShell = (request) => {
  const url = new URL(request.url);
  if (url.searchParams.has("cekUpdate")) return true;
  return url.pathname === "/" || url.pathname.endsWith(".html");
};

/* ================= INSTALL =================
   Satu per satu (allSettled): satu file yang hilang tidak boleh membatalkan
   seluruh install, karena SW yang gagal install tidak pernah memunculkan
   tombol update sama sekali. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(FILES_TO_CACHE.map((file) => cache.add(file)))
    )
  );
  // ⛔ Tanpa skipWaiting otomatis: halaman lama harus tetap jalan sampai user menekan tombol.
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
  const tipe = event.data?.type;

  if (tipe === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  // Tombol "Update aplikasi": buang salinan shell yang basi, baru ambil alih.
  if (tipe === "MUAT_ULANG") {
    event.waitUntil(
      (async () => {
        await buangCacheShell();
        self.skipWaiting();
      })()
    );
  }
});

async function buangCacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  await Promise.all(
    requests.filter((req) => adalahShell(req)).map((req) => cache.delete(req))
  );
}

/* ================= FETCH ================= */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 🚫 Jangan pernah sentuh API / Auth
  if (url.hostname.includes("supabase.co") || url.pathname.startsWith("/auth")) {
    return;
  }

  // 🔎 Probe versi dari halaman: selalu ke jaringan, dan JANGAN disimpan ke cache
  //    (kalau tidak, setiap probe meninggalkan satu entri sampah).
  if (url.searchParams.has("cekUpdate")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  // 🔥 HTML: validasi ke server dulu (304 kalau tidak berubah) supaya versi baru
  //    langsung terpakai; jatuh ke cache/offline hanya saat jaringan mati.
  if (event.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(
      (async () => {
        try {
          const jaringan = await fetch(event.request, { cache: "no-cache" });
          if (jaringan.ok) {
            // Clone sinkron, simpan tanpa ditunggu (menunda render ±500 KB tidak perlu).
            const salinan = jaringan.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, salinan))
              .catch(() => {});
          }
          return jaringan;
        } catch (err) {
          const tersimpan = await caches.match(event.request);
          return tersimpan || (await caches.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // 📦 Asset → cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // response.ok = false untuk gambar/font lintas domain (opaque, status 0).
        if (!response.ok || url.origin !== self.location.origin) return response;

        // Wajib clone sinkron di sini: response di bawah ini langsung dipakai
        // halaman, dan begitu body-nya terbaca, clone() akan melempar
        // "Response body is already used".
        const salinan = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, salinan))
          .catch(() => {});
        return response;
      });
    })
  );
});
