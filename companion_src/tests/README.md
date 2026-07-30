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

- `HOG_LAST_NO=5` (cap di `01_*.js`) — **diriset 30 Jul 2026, kini didukung tiga garis bukti**:
  1. frasa `"6th Hall of Governors"` **nol hasil** di seluruh web;
  2. kingshotwiki.com, kingshotdata.com, dan kingshot-data.com (terakhir diperbarui **25 Mar 2026**, saat server tertua sudah ~380 hari) sama-sama menghitung tepat #1–#5;
  3. event kembarnya di Whiteout Survival, *Hall of Chiefs*, identik sampai durasi 5/6/7 hari + pola hero Gen1/Gen2, dan menurut *WoS Handbook* (2026) **"permanently replaced once your state enters State vs. State; the exact server-day varies by state"**. Padanan SvS = KvK (gerbang H70–80), sehingga #6 (H76) jatuh tepat di era KvK.

  Alasan "cuma Gen 1-2 → Gen 3" yang dulu tertulis di app **salah** dan sudah dibuang: generasi hero ke-3 baru hari ~105–120. Karena hari transisi bervariasi antar kingdom, `hogAnchorFit` sengaja memindai sampai `HOG_ANCHOR_SCAN=8` dan menandai `beyondCap` — HoG nyata di H76 harus bisa dicatat tanpa dituduh salah, sedangkan `predictedEvents` tetap TIDAK meramalkan #6.
- Poin & satuan task HoG (dipakai kalkulator, `HOG_SCORING` di `04_*.js`): silang-cek **dua sumber independen** (kingshotdata.com + kingshot-data.com) sepakat 100%. Power dihitung **per 1 Power** (45 di stage City Construction/Gather-Charm, 30 di Power Boost, 20 dari troop), charm/gear **per 1 poin max score** (1.000/500), troop **per 1 troop** (90…1.960), speedup 300/menit hanya di stage Hero Dev terakhir.
- Desert Trial (`DT_FARM`): beast map → **50% Clawshard / 50% Challenger Pouch**; rally Dreadwolf 25 stamina (20 dengan Diana maks); Dreadwolf → 2–4 shard Diana. Harapan gem/pouch = 0,20×100 + 0,50×20 = **30**, cocok dengan catatan lama app.

⚠️ Belum ada sumbernya, JANGAN dikarang: ambang 4 tier milestone HoG & ambang leaderboard Top 100 (diisi pengguna dari game), semantik tabel level-up Charm/Gear (kumulatif vs kenaikan), harga gem per spin Roulette, kurs Clawshard→Pouch, dan tabel poin per hari KvK/SG yang lengkap.
