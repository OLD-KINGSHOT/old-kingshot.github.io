/* Stamina yang dibayar sebagai KUOTA, bukan sebagai hunt.

   Truegold Refinement adalah lubang terakhir sekelas Champion's Way: ia MEMAKAN
   stamina, tapi tak pernah masuk deteksi "stamina hari ini terbayar ke mana saja".
   Bentuknya beda dari semua event lain yang sudah terdaftar — bukan "sekian
   stamina per hunt", melainkan kuota: habiskan 50 stamina -> 1 Lesser Truegold,
   maksimal 5 kali per event. Sumbernya entri ensiklopedia app sendiri, yang sudah
   terverifikasi lebih dulu: "Lesser Truegold gratis dari gather 25M (x5) +
   habiskan 50 stamina (x5) - itu SEMUA yang gratis".

   Model `hunt` TIDAK bisa dipakai untuk ini. Kalau dipaksa, 250 stamina akan
   dilaporkan sebagai 25 hunt, dan batas 5x-nya hilang - persis jenis kesalahan
   "benar sebagian lalu digeneralisasi" yang sudah beberapa kali ketahuan di data
   event ini.

   Test ini juga menjaga `id2`, yang sebelumnya KODE MATI: dideklarasikan di entri
   Desert Trial tapi tak pernah dibaca staminaEventsNow(), sehingga deteksi hanya
   bergantung pada satu ejaan id. Kalau feed memakai ejaan yang lain, deteksinya
   diam-diam gagal dan pemain melihat "tidak sedang berjalan" untuk event yang
   sebenarnya jalan. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const NOW = Date.parse('2026-07-15T10:00:00.000Z');
const REF = '2025-12-08T00:00:00.000Z';

/* Feed minimal: hanya perlu ada event yang AKTIF hari ini. Hari NOW = Rabu. */
function feedDengan(list) {
  const events = list.map(x => ({
    titleKey: x.key, title: x.title, type: 'SPECIAL',
    startDay: 'Wednesday', endDay: 'Friday', isMainEvent: true,
  }));
  const weeks = { 1: [], 2: [], 3: [], 4: events };
  return {
    t: NOW,
    d: {
      timestamp: new Date(NOW).toISOString(),
      calendar: { cycleReference: REF, currentWeek: 4, currentDay: 'Wednesday', events },
      weeks,
    },
  };
}

function env(list) {
  const e = createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid: '1', nick: 'A', kingdom: '2114', tc: '25', start: '2026-05-27' }]),
    ks_p_1_profile: JSON.stringify({ pid: '1', kingdom: '2114', tc: '25', start: '2026-05-27' }),
    ks_liveEvents: JSON.stringify(feedDengan(list)),
  } });
  const c = e.evalIn('ksClock'); c.offset = NOW - Date.now(); c.nudge = 0;
  return e.evalIn;
}

const TG = { key: 'truegoldRefinement', title: 'Truegold Refinement' };
const barisTG = P => P.baris.find(b => /Truegold Refinement/i.test(b.nama));

t('Truegold Refinement terdaftar sebagai event pemakan stamina', () => {
  const e = env([TG]);
  const SE = e('STAMINA_EVENTS');
  const row = SE.find(x => x.id === 'truegoldRefinement');
  ok(row, 'harus ada entri truegoldRefinement di STAMINA_EVENTS');
  eq(row.model, 'kuota', 'modelnya kuota, bukan hunt');
  eq(row.kuotaStamina, 50, '50 stamina per 1 Lesser Truegold');
  eq(row.kuotaMax, 5, 'maksimal 5x per event');
  eq(row.poinPerHunt, null, 'bukan event berpoin — jangan dikarang poinnya');
});

t('kuota dihitung dari stamina, bukan dari jumlah hunt', () => {
  const e = env([TG]);
  const P = e('staminaPlan')(250, {});
  const b = barisTG(P);
  ok(b, 'barisnya harus muncul');
  eq(b.aktif, true, 'feed bilang event ini sedang berjalan');
  eq(b.kuota, 5, '250 / 50 = 5 Lesser Truegold');
  eq(b.kuotaStamina, 250, 'stamina yang benar-benar terpakai untuk kuota');
});

t('kuota dibatasi 5x — stamina berlebih TIDAK menambah', () => {
  const e = env([TG]);
  eq(barisTG(e('staminaPlan')(600, {})).kuota, 5, '600 stamina tetap 5, bukan 12');
  eq(barisTG(e('staminaPlan')(1000, {})).kuota, 5, 'jauh lebih besar pun tetap 5');
});

t('kuota dibulatkan ke BAWAH — 49 stamina belum menghasilkan apa pun', () => {
  const e = env([TG]);
  eq(barisTG(e('staminaPlan')(49, {})).kuota, 0, '49 < 50 → 0');
  eq(barisTG(e('staminaPlan')(120, {})).kuota, 2, '120 → 2 (bukan 2,4)');
  eq(barisTG(e('staminaPlan')(120, {})).kuotaStamina, 100, 'yang terpakai 100, sisanya 20');
});

t('event kuota tidak melaporkan hunt atau poin karangan', () => {
  const e = env([TG]);
  const b = barisTG(e('staminaPlan')(250, {}));
  eq(b.hunts, 0, 'kuota bukan hunt — 250 stamina di sini BUKAN 25 hunt');
  eq(b.poin, 0, 'tidak ada poin');
  eq(b.takTerukur, false, 'hasilnya terukur (Lesser Truegold), jadi jangan ditandai tak terukur');
});

t('kalau tidak berjalan: nol, DAN alasannya disebut', () => {
  const e = env([{ key: 'somethingElse', title: 'Something Else' }]);
  const b = barisTG(e('staminaPlan')(250, {}));
  eq(b.aktif, false);
  eq(b.kuota, 0, 'tidak berjalan → tidak ada kuota');
  ok(b.sebab.length > 0, 'app harus bilang KENAPA');
});

t('id2 dibaca juga — feed yang memakai judul, bukan camelCase, tetap terdeteksi', () => {
  /* regresi: id2 dulu kode mati, jadi ejaan feed yang berbeda = gagal diam-diam */
  const e = env([{ key: 'Truegold Refinement', title: 'Truegold Refinement' }]);
  const b = barisTG(e('staminaPlan')(100, {}));
  eq(b.aktif, true, 'titleKey = "Truegold Refinement" harus cocok lewat id2');
  eq(b.kuota, 2);
});

t('stamina yang sama tetap dibayar event lain — kuota tidak memotong hunt', () => {
  const e = env([TG, { key: 'defeatBeasts', title: 'Defeat Nearby Beasts' }]);
  const P = e('staminaPlan')(250, {});
  const beast = P.baris.find(b => /Defeat Nearby Beasts/i.test(b.nama));
  ok(beast && beast.aktif, 'Defeat Nearby Beasts harus ikut aktif');
  eq(beast.hunts, 25, '250 / 10 = 25 hunt — TIDAK dikurangi kuota Truegold');
  eq(barisTG(P).kuota, 5, 'dan kuotanya tetap penuh');
});

done();
