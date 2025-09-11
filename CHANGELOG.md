# Changelog
Semua perubahan penting pada **Simponi Kharisma** akan didokumentasikan di file ini.

## [1.0.0] - 2025-09-09
### Added
- Rilis awal aplikasi **Simponi Kharisma**.
- Fitur login aman dengan Supabase.
- Dashboard interaktif untuk admin, guru, dan wali santri.
- Rekap nilai & absensi santri dengan grafik.
- Ekspor data ke PDF & Excel.
- Tampilan responsif (mobile-friendly, PWA support).
- Penambahan halaman Kebijakan Privasi dan Kontak.
- Service Worker dengan caching aman (tidak mencache login & Supabase auth).
- Deployment di Netlify dengan HTTPS & Content Security Policy.

### Security
- API Supabase menggunakan **Anon Key** dengan Row Level Security.
- Service Worker diperketat untuk menghindari flagging phishing.
- Favicon dipindah dari Imgur → lokal `/icons/logo.png`.
- Penambahan header keamanan (CSP, HSTS, X-Frame-Options, dll).
