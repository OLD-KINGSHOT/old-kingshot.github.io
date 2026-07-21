/* Mesin rencana upgrade TC.

   tcPlan/tcApplyBuffs adalah fungsi MURNI: tanpa DOM, tanpa localStorage —
   parameter masuk, daftar keluar. Justru itu yang membuat angkanya bisa diuji
   tanpa browser, dan itu penting karena risiko terbesar fitur ini ada di angka,
   bukan di tampilan. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv();
const tcPlan = env.evalIn('tcPlan');
const tcApplyBuffs = env.evalIn('tcApplyBuffs');
const TC_LEVELS = env.evalIn('TC_LEVELS');
const TC_BUILDINGS = env.evalIn('TC_BUILDINGS');

const kunci = r => r.nama + ' ' + r.lv;

console.log('Mesin rencana TC');

/* ---- 1. integritas data ---- */

t('TC_LEVELS mencakup Lv2..30 tanpa bolong', () =>
  eq(TC_LEVELS.map(r => r.lv), Array.from({ length: 29 }, (_, i) => i + 2)));

t('durasi TC naik monoton (data mundur = salah parse)', () => {
  for (let i = 1; i < TC_LEVELS.length; i++)
    ok(TC_LEVELS[i].sec > TC_LEVELS[i - 1].sec, 'durasi turun di TC' + TC_LEVELS[i].lv);
});

/* Jangkar yang diverifikasi manual terhadap dua situs SEBELUM scraper ditulis.
   Kalau ini gagal, scraper-nya yang berubah/rusak — bukan sekadar data baru. */
t('jangkar TC28 = Embassy 27 + Academy 27, 190M bread, 29h 2j 52m', () => {
  const r = TC_LEVELS.find(x => x.lv === 28);
  eq(r.p, [['Embassy', 27], ['Academy', 27]]);
  eq(r.c.b, 190000000);
  eq(r.sec, 29 * 86400 + 2 * 3600 + 52 * 60);
});

t('jangkar TC30 = Embassy 29 + Range 29, 40h 4j 27m', () => {
  const r = TC_LEVELS.find(x => x.lv === 30);
  eq(r.p, [['Embassy', 29], ['Range', 29]]);
  eq(r.sec, 40 * 86400 + 4 * 3600 + 27 * 60);
});

/* Bukti pemetaan kolom berbasis nama bekerja: pembacaan lewat ringkasan sempat
   menaruh 480 di Bread, padahal header mentah menyebut Iron. */
t('Embassy Lv6 = Iron 480, Bread 0 (kolom tidak tertukar)', () => {
  const r = TC_BUILDINGS.Embassy.find(x => x.lv === 6);
  eq(r.c.i, 480);
  eq(r.c.b, 0);
});

t('setiap prasyarat TC menunjuk level bangunan yang ADA (atau tercatat tanpa data)', () => {
  const tanpaData = new Set(env.evalIn('TC_TANPA_DATA'));
  for (const r of TC_LEVELS) {
    for (const [nama, lv] of r.p) {
      if (tanpaData.has(nama)) continue;             /* sudah diakui belum punya tabel */
      ok(TC_BUILDINGS[nama], 'TC' + r.lv + ' menunjuk bangunan tak dikenal: ' + nama);
      ok(TC_BUILDINGS[nama].some(x => x.lv === lv),
        'TC' + r.lv + ' butuh ' + nama + ' ' + lv + ' tapi levelnya tak ada');
    }
  }
});

/* ---- 2. tcPlan ---- */

t('semua prasyarat sudah dipunyai -> hanya TC itu sendiri', () => {
  const p = tcPlan(27, 28, { Embassy: 27, Academy: 27 });
  eq(p.map(kunci), ['TownCenter 28']);
});

t('prasyarat yang kurang ditelusuri sampai level yang dimiliki', () => {
  const p = tcPlan(27, 28, { Embassy: 27, Academy: 25 });
  eq(p.map(kunci), ['Academy 26', 'Academy 27', 'TownCenter 28']);
});

t('prasyarat dipakai ulang tidak dihitung dua kali', () => {
  const p = tcPlan(28, 30, { Embassy: 27, Barracks: 28, Range: 29 });
  eq(p.filter(r => r.nama === 'Embassy').map(r => r.lv), [28, 29]);
  eq(new Set(p.map(kunci)).size, p.length, 'ada baris duplikat');
});

t('prasyarat mendahului bangunan yang membutuhkannya', () => {
  const p = tcPlan(27, 28, { Embassy: 27, Academy: 25 });
  ok(p.findIndex(r => kunci(r) === 'Academy 27') < p.findIndex(r => kunci(r) === 'TownCenter 28'),
    'TC28 muncul sebelum prasyaratnya');
});

t('dari == ke -> rencana kosong', () => eq(tcPlan(28, 28, {}), []));
t('target lebih rendah -> rencana kosong', () => eq(tcPlan(30, 28, {}), []));

/* Bangunan juga punya prasyarat TC (Embassy 9 butuh TC9), jadi grafnya memang
   bisa melingkar. Penjaga siklus harus membuatnya berhenti, bukan kehabisan stack. */
t('data bersiklus tidak membuat rekursi tak berujung', () => {
  const p = tcPlan(1, 30, {});
  ok(p.length > 0 && p.length < 2000, 'jumlah baris tak masuk akal: ' + p.length);
});

t('baris membawa biaya & durasi, bukan cuma nama', () => {
  const r = tcPlan(27, 28, { Embassy: 27, Academy: 27 })[0];
  eq(r.c.b, 190000000);
  ok(r.sec > 0);
});

/* ---- 3. tcApplyBuffs ---- */

const SATU = [{ jenis: 'TC', nama: 'TownCenter', lv: 28,
  c: { b: 1000, w: 1000, s: 100, i: 100, t: 50 }, sec: 1000 }];

t('tanpa buff -> nilai dasar', () => {
  const r = tcApplyBuffs(SATU, {});
  eq(r.total.sec, 1000);
  eq(r.total.c.b, 1000);
});

t('speed 100% membagi durasi dua', () =>
  eq(tcApplyBuffs(SATU, { speed: 100 }).total.sec, 500));

t('sumber speed dijumlahkan dulu, baru membagi', () =>
  eq(tcApplyBuffs(SATU, { speed: 50, wolf: 30, posisi: 20 }).total.sec, 500));

t('Double Time mengali 0,8 SESUDAH pembagian speed', () =>
  eq(tcApplyBuffs(SATU, { speed: 100, doubleTime: true }).total.sec, 400));

t('Saul Lv3 memotong 9% bahan', () =>
  eq(tcApplyBuffs(SATU, { saulSkill: 3 }).total.c.b, 910));

/* Aturan yang paling mudah dilanggar saat refactor. Sumber: kingshotoptimizer —
   potongan Saul "resources only, not Truegold". */
t('Saul TIDAK memotong Truegold', () =>
  eq(tcApplyBuffs(SATU, { saulSkill: 5 }).total.c.t, 50));

/* Bagian WAKTU milik Saul sudah termasuk di stat Construction Speed (Power
   Panel). Kalau ikut dihitung di sini, hasilnya dobel. */
t('Saul tidak mengubah durasi (sudah termasuk di Power Panel)', () =>
  eq(tcApplyBuffs(SATU, { saulSkill: 5 }).total.sec, 1000));

t('totalDasar menyimpan nilai tanpa buff untuk pembanding', () => {
  const r = tcApplyBuffs(SATU, { speed: 100, saulSkill: 5 });
  eq(r.totalDasar.sec, 1000);
  eq(r.totalDasar.c.b, 1000);
});

t('speed negatif/ngawur tidak membuat durasi negatif atau tak hingga', () => {
  const r = tcApplyBuffs(SATU, { speed: -300 });
  ok(isFinite(r.total.sec) && r.total.sec > 0, 'durasi jadi ' + r.total.sec);
});

done();
