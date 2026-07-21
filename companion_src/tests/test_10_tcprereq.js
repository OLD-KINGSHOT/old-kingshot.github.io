/* Prasyarat Town Center — data yang ditampilkan tab Bangun.

   Data lama SALAH dan menyesatkan: isinya menyuruh user menaikkan "Wall" dan
   "Hospital" ke level tertentu sebelum naik TC. Kingshot tidak punya bangunan
   bernama Wall MAUPUN Hospital (yang ada Infirmary) — dua database bangunan
   lengkap (kingshot.net, kingshotguide.org) tak memuat keduanya. Hampir pasti
   tersalin dari game lain; Rise of Kingdoms punya mekanik Wall persis begitu.

   Data pengganti disilang-cek di dua sumber untuk SETIAP level:
     TC2-15  : kingshotdata.kr + kingshotdata.com
     TC16-24 : kingshotdata.kr + kingshotdata.com + kingshot.net
     TC25-30 : kingshotdata.kr + kingshotguide.org
   Ditarik 21-22 Jul 2026. Dikonfirmasi user dari dalam game bahwa tabel lama ngaco. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv();
const TC = env.evalIn('TC_PREREQ');
const teks = TC.map(r => r.join(' ')).join(' | ');

console.log('Prasyarat Town Center');

/* Ini inti perbaikannya: menyuruh user membangun sesuatu yang tidak ada di game
   adalah kesalahan yang tak akan dia sadari — dia cuma bingung mencarinya. */
t('tidak menyebut "Wall" (bangunan itu tidak ada di Kingshot)', () =>
  ok(!/wall/i.test(teks), 'masih menyebut Wall'));

t('tidak menyebut "Hospital" (di Kingshot namanya Infirmary)', () =>
  ok(!/hospital/i.test(teks), 'masih menyebut Hospital'));

t('hanya menyebut bangunan yang benar-benar ada di Kingshot', () => {
  const SAH = ['Town Center', 'Embassy', 'Academy', 'Barracks', 'Range', 'Stable',
    'Command Center', 'Infirmary', 'Storehouse', 'Guard Station', 'Kitchen',
    'War Academy', 'Truegold Crucible', 'Hero Hall', 'House', 'Iron Mine',
    'Mill', 'Quarry', 'Sawmill'];
  for (const [, butuh] of TC) {
    /* buang angka level & pemisah, sisakan nama bangunannya */
    for (const bagian of butuh.split('+')) {
      const nama = bagian.replace(/\d+/g, '').trim();
      if (!nama) continue;
      ok(SAH.some(s => nama === s), 'bangunan tak dikenal: "' + nama + '" di "' + butuh + '"');
    }
  }
});

t('mencakup TC2 sampai TC30 tanpa bolong', () => {
  eq(TC.map(([target]) => target),
    Array.from({ length: 29 }, (_, i) => 'TC' + (i + 2)));
});

/* Jangkar: user menyebut TC28 butuh Academy + Embassy dari layar in-game, dan
   dua sumber sepakat. Kalau test ini gagal, data diedit tanpa verifikasi ulang. */
t('jangkar TC28 = Embassy 27 + Academy 27', () =>
  eq(TC.find(([a]) => a === 'TC28')[1], 'Embassy 27 + Academy 27'));

t('jangkar TC30 = Embassy 29 + Range 29', () =>
  eq(TC.find(([a]) => a === 'TC30')[1], 'Embassy 29 + Range 29'));

t('jangkar TC10 = Range 9 + Academy', () =>
  eq(TC.find(([a]) => a === 'TC10')[1], 'Range 9 + Academy'));

/* Pola yang terpantau di semua sumber: dari TC13 ke atas selalu Embassy (level-1)
   plus satu bangunan yang berputar tetap Barracks -> Range -> Stable -> Academy.
   Salah ketik satu baris akan memutus pola ini. */
t('TC13+ mengikuti pola Embassy(lv-1) + rotasi Barracks/Range/Stable/Academy', () => {
  const ROTASI = ['Barracks', 'Range', 'Stable', 'Academy'];
  for (let lv = 13; lv <= 30; lv++) {
    const butuh = TC.find(([a]) => a === 'TC' + lv)[1];
    const putar = ROTASI[(lv - 13) % 4];
    eq(butuh, 'Embassy ' + (lv - 1) + ' + ' + putar + ' ' + (lv - 1), 'TC' + lv);
  }
});

/* ---- urutan bangun harus selaras dengan prasyarat yang sebenarnya ---- */
const BO = env.evalIn('BUILD_ORDER');
const boTeks = BO.map(r => r.t + ' ' + r.d).join(' | ');

t('urutan bangun tidak lagi menyuruh menaikkan Wall', () =>
  ok(!/wall/i.test(boTeks), 'BUILD_ORDER masih menyebut Wall'));

t('tidak menyebut "Scout Camp" (bukan bangunan Kingshot)', () =>
  ok(!/scout camp/i.test(boTeks), 'masih menyebut Scout Camp'));

/* Ini kesalahan yang paling merugikan: Embassy adalah prasyarat SETIAP upgrade
   TC dari 9 ke atas, tapi data lama menandainya prioritas rendah (warn:true).
   User yang menurut akan tersendat di tiap level TC tanpa tahu sebabnya. */
t('Embassy TIDAK ditandai prioritas rendah', () => {
  const baris = BO.find(r => /embassy/i.test(r.t));
  ok(baris, 'Embassy tidak disebut sama sekali di urutan bangun');
  ok(!baris.warn, 'Embassy ditandai warn/prioritas rendah padahal prasyarat tiap TC');
});

t('Embassy disebut sebagai prasyarat tiap TC', () => {
  const baris = BO.find(r => /embassy/i.test(r.t));
  ok(/prasyarat/i.test(baris.d), 'penjelasan Embassy tidak menyebut prasyarat: ' + baris.d);
});

done();
