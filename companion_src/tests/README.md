# Test suite

```
node companion_src/tests/run.js        # semua
node companion_src/tests/test_05_hog.js # satu berkas
```

Tanpa dependensi — Node saja. Tidak menyentuh jaringan (semua `fetch` di-stub).

## Cara kerjanya

`harness.js` memuat `companion_src/0X_*.js` **apa adanya** ke dalam konteks `vm` Node, dengan stub `localStorage`/`document`/`fetch`. Tiap berkas dijalankan sebagai `vm.Script` terpisah dalam satu konteks bersama — meniru browser, di mana tiap `<script>` berbagi scope global tapi punya evaluasi sendiri. Ini penting: kalau semua digabung jadi satu skrip, `const` lintas-berkas akan kena TDZ dan `typeof X` di top-level berperilaku beda dari aslinya.

`document.readyState` dibuat `'loading'` supaya `01_*.js` tidak memanggil `init()` sendiri (butuh DOM sungguhan).

Deklarasi `const`/`let` top-level **tidak** menempel di objek global, jadi tidak bisa dibaca lewat `ctx.store`. Pakai `env.evalIn('store')` — itu mengevaluasi di konteks yang sama, seperti yang dilakukan app.

## Isi

| Berkas | Menjaga apa |
|---|---|
| `test_01_redeem.js` | Pesan error redeem tidak menyalahkan jam perangkat; nudge manual tidak pernah masuk ke `time` yang ditandatangani |
| `test_02_clocksync.js` | Sinkron jam dari `/time` server sendiri, fallback timeapi.io; tidak ada kode yang membaca header `Date` (disembunyikan CORS) |
| `test_03_profiles.js` | Ganti server membawa identitas & tanggal buka server ITU; `start` tidak basi saat kingdom berubah |
| `test_04_stale.js` | Flag "perkiraan" & bulan kalender tidak bocor antar server |
| `test_05_hog.js` | Jadwal & penomoran HoG: nomor dan datanya dari iterasi yang sama; iterasi yang sudah lewat tidak muncul lagi |

## Fakta yang dikunci test ini

Diverifikasi lewat probe langsung ke API (Jul 2026) — jangan diubah tanpa probe ulang:

- `/api/gift_code` menerima `time` yang meleset **±24 jam** (di luar itu → 40009). Jadi **40004/40009 BUKAN soal jam perangkat** — itu sesi login. Sign salah dijawab `msg:"Sign Error", err_code:0`.
- Respons API **tidak** mengirim `Access-Control-Expose-Headers`, dan `Date` bukan header CORS-safelisted → `headers.get('date')` **selalu null di browser**. Node/curl tidak menegakkan CORS, jadi ini terlihat "jalan" saat diprobe dari CLI. Stub di test ini sengaja meniru browser (`headers.get()` → null).
- Durasi HoG per-iterasi: #1=5, #2=6, #3+=7 hari; siklus 14, mulai H6. HoG #4 **terverifikasi in-game** (Kingdom 2114, 2026-07-17): Hilde, Top 100, urutan stage cocok.

⚠️ `HOG_LAST_NO=5` (cap di `01_*.js`) **belum terverifikasi** — tidak ada sumber yang menyebut HoG berhenti di #5; satu sumber komunitas menyebut ada #6 (H76). Menunggu verifikasi in-game di H76 (2026-08-10).
