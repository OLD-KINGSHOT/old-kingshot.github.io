/* Kalkulator inventaris — "barangku sebaiknya dipakai di mana?"

   Membalik arah tiga kalkulator lain (HoG, KvK/SG, stamina) yang semuanya menuntut
   pengguna tahu dulu mau menghitung event apa.

   Yang dijaga berkas ini:
   · barang ditaruh di event berpoin TERTINGGI — skala HoG dan KvK/SG berbeda jauh
     (Widget 100.000 vs 8.000), jadi salah pilih = salah besar;
   · barang yang cuma ada di satu event tetap ketemu (Mithril tak ada di HoG);
   · barang tanpa tempat DILAPORKAN, tidak hilang diam-diam;
   · tanpa jadwal, barisnya tetap muncul dan ditandai — tabel kosong tak menolong;
   · stamina TIDAK dipaksa jadi poin (hasilnya gem/speedup/shard);
   · inventaris tersimpan per profil. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const PID = '330300846', PID2 = '343522603';
const env = createEnv({ storage: {
  ks_activePid: JSON.stringify(PID), ks_profilesV: '1',
  ['ks_p_' + PID + '_profile']: JSON.stringify({ pid: PID, kingdom: '2114', start: '2026-05-27' }),
  ['ks_p_' + PID2 + '_profile']: JSON.stringify({ pid: PID2, kingdom: '2184', start: '2026-06-11' }),
} });
const ev = env.evalIn;
const plan = ev('invPlan');
const cari = (r, frag) => r.baris.find(b => b.lbl.includes(frag));

console.log('Kalkulator inventaris');

t('barang ditaruh di event berpoin TERTINGGI, bukan yang pertama ketemu', () => {
  const r = plan({ wid: 2, ham: 8 });
  const w = cari(r, 'Widget'), h = cari(r, 'Forgehammer');
  eq(w.ev, 'hog', 'Widget: HoG 100.000 harus mengalahkan KvK/SG 8.000');
  eq(w.pts, 200000);
  eq(h.ev, 'hog');
  eq(h.pts, 400000, '8 × 50.000');
  ok(w.lain.length >= 2, 'alternatifnya tetap dilaporkan supaya keputusannya bisa diperiksa');
});

t('barang yang TIDAK ada di HoG tetap ketemu di KvK/SG', () => {
  const r = plan({ mithril: 5, truegold: 3, intel: 2, tamingA: 1 });
  const m = cari(r, 'Mithril');
  ok(m, 'Mithril harus ketemu');
  ok(m.ev === 'kvk' || m.ev === 'sg', 'Mithril hanya ada di KvK/SG, dapat: ' + m.ev);
  eq(m.pts, 200000, '5 × 40.000');
  eq(cari(r, 'Intel').pts, 12000, '2 × 6.000');
  eq(cari(r, 'Truegold').pts, 6000, '3 × 2.000');
});

t('barang yang tak punya tempat DILAPORKAN, bukan hilang', () => {
  /* Terror & Beast hanya ada di HoG #1; profil ini sudah lewat jauh dari sana. */
  const r = plan({ terror: 3, beast: 10 });
  eq(r.baris.length, 0, 'tak boleh dipaksa masuk event lain');
  eq(r.takTerpakai.length, 2, 'keduanya wajib muncul di takTerpakai');
  ok(r.takTerpakai.every(x => x.qty > 0));
});

t('ringkasan per event = jumlah baris yang menunjuk event itu', () => {
  const r = plan({ wid: 2, ham: 8, mithril: 5 });
  const hog = r.ringkas.find(x => x.ev === 'hog');
  eq(hog.pts, 200000 + 400000, 'HoG = Widget + Forgehammer');
  const lain = r.ringkas.find(x => x.ev !== 'hog');
  eq(lain.pts, 200000, 'Mithril masuk event non-HoG');
  eq(r.total, 800000, 'total = jumlah seluruh baris');
  ok(r.ringkas[0].pts >= r.ringkas[r.ringkas.length - 1].pts, 'ringkasan urut turun');
});

t('tanpa jadwal, barisnya TETAP ada dan ditandai', () => {
  const r = plan({ mithril: 5 });
  const x = r.ringkas[0];
  eq(typeof x.adaJadwal, 'boolean', 'harus melaporkan apakah jadwalnya diketahui');
  ok(x.pts > 0, 'poinnya tetap dihitung walau jadwalnya tak diketahui');
  /* env test tanpa feed → tak ada jadwal live; yang penting barisnya tidak hilang */
  ok(r.ringkas.length >= 1);
});

t('stamina tidak dipaksa jadi poin', () => {
  const r = plan({ stamina: 210, diana: true });
  ok(r.stamina, 'harus ada jalur stamina');
  eq(r.stamina.f.perHunt, 8, '10 × 0,8 dengan Diana');
  eq(r.stamina.f.hunts, 26, 'floor(210 / 8)');
  eq(r.total, 0, 'stamina TIDAK boleh menambah total poin');
  ok(!r.baris.some(b => /[Ss]tamina/.test(b.lbl)), 'stamina bukan baris poin');
});

t('input kotor → 0, tak pernah NaN', () => {
  for (const g of [{}, { wid: '' }, { wid: -5 }, { wid: 'abc' }, null]) {
    const r = plan(g);
    eq(r.total, 0, 'inventaris ' + JSON.stringify(g));
    ok(!isNaN(r.total));
  }
  eq(plan({ wid: '2' }).total, 200000, 'string angka tetap dihitung');
});

t('inventaris tersimpan per profil, tak bocor antar akun', () => {
  ev('invSet')({ wid: 7 });
  eq(ev('invGet')().wid, 7);
  ok(env.storage.has('ks_p_' + PID + '_inv'), 'harus di slot per-profil');
  env.localStorage.setItem('ks_activePid', JSON.stringify(PID2));
  eq(ev('invGet')().wid, undefined, 'akun lain tak melihat inventaris akun pertama');
  env.localStorage.setItem('ks_activePid', JSON.stringify(PID));
  eq(ev('invGet')().wid, 7, 'kembali ke akun asal → utuh');
});

t('kartu ter-render tanpa undefined/NaN', () => {
  ev('invSet')({ wid: 2, ham: 8, mithril: 5, stamina: 210, diana: true });
  const h = ev('invCardHTML')(), o = ev('invOut')();
  ok(/Kalkulator Inventaris/.test(h));
  ok(h.length > 1000 && !/undefined|NaN/.test(h));
  ok(o.length > 300 && !/undefined|NaN/.test(o));
  ev('invSet')({});
  ok(/Isi minimal satu barang/.test(ev('invOut')()), 'kosong → ajakan mengisi, bukan tabel nol');
});

done();

/* Barang tanpa tempat harus menyebut ALASAN yang spesifik.
   Dulu invPlan mendorong ke takTerpakai tanpa `sebab` sama sekali, jadi UI terpaksa
   memakai satu kalimat tebakan untuk semua kasus: "tak punya task di HoG/KvK/SG, ATAU
   tabel poin event-nya belum kita punya". Dua sebab yang sangat berbeda dilebur jadi
   satu, dan pemain tak bisa tahu mana yang berlaku — apakah barangnya memang tak
   terpakai sekarang, atau app-nya yang belum punya datanya. */
t('barang tanpa tempat menyebut ALASAN spesifik, bukan tebakan umum', () => {
  const INV = ev('INV_ITEMS');
  const isi = {}; INV.forEach(i => { isi[i.id] = 5; });
  const r = ev('invPlan')(isi);
  ok(r.takTerpakai.length > 0, 'skenario ini memang harus menyisakan barang');
  r.takTerpakai.forEach(x => {
    ok(x.sebab && x.sebab.length > 0, x.lbl + ' harus menyebut sebabnya, bukan diam');
  });
});

t('barang yang HANYA ada di HoG disebut begitu — bukan dituduh datanya hilang', () => {
  const INV = ev('INV_ITEMS');
  const hanyaHog = INV.filter(i => i.hog && !i.ev).map(i => i.id);
  ok(hanyaHog.length > 0, 'harus ada barang yang cuma punya jalur HoG');
  const isi = {}; hanyaHog.forEach(id => { isi[id] = 5; });
  const r = ev('invPlan')(isi);
  r.takTerpakai.forEach(x => {
    ok(/HoG/i.test(x.sebab), x.lbl + ': sebabnya harus menyebut HoG, dapat "' + x.sebab + '"');
  });
});
