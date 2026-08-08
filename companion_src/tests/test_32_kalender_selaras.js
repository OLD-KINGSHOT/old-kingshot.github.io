/* Kalender harus menyebut tanggal yang SAMA dengan daftar event.
 *
 * Dilapor pemain 9 Agu 2026: "kalender tidak sesuai". Benar, dan sebabnya tiga:
 *
 *   1. KvK di kalender masih dari model per-kingdom `rec('kvk',70,28,…)` — sisa yang
 *      sama seperti SG, cuma belum ikut dibuang. Feed bilang KvK #17 mulai 10 Agu
 *      (countdown resmi server), daftar event ikut 10 Agu, kalender bilang 4 Agu.
 *      Meleset 6 hari untuk event terbesar bulan itu.
 *   2. Panel detail hari memakai `start + d*86400000`, padahal konvensi seluruh app
 *      `start + (d-1)`. Jadi mengetuk tanggal 9 menampilkan event mingguan tanggal 10.
 *   3. Castle Battle tak pernah muncul di kalender, padahal app menghitungnya persis
 *      (castleFirstDay: hari-54 mundur ke Sabtu, lalu +14).
 */
const fs = require('fs'), path = require('path');
const { createEnv, t, eq, ok, done } = require('./harness.js');

const REF = '2025-12-08T00:00:00.000Z';
const NOW = Date.UTC(2026, 7, 9, 3, 0, 0);        /* Min 9 Agu 2026, H75 */
const START = '2026-05-27';
const DAY = 86400000;
const hariKe = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(START + 'T00:00:00Z')) / DAY) + 1;
const isoDari = d => new Date(Date.parse(START + 'T00:00:00Z') + (d - 1) * DAY).toISOString().slice(0, 10);
const dow = d => new Date(Date.parse(isoDari(d) + 'T00:00:00Z')).getUTCDay();

/* Sengaja SEPADAT feed nyata (17 event rotasi): batas "Lihat semua" baru menggigit
   di atas 6 baris, jadi daftar yang tipis akan membuat test lulus tanpa menguji apa
   pun. SG jatuh paling akhir (minggu-2 = 24 Agu) — persis posisi yang membuatnya
   tak terlihat di app pemain. */
const ev = (k, n, ty, s, e2) => ({ titleKey:k, title:n, type:ty, startDay:s, endDay:e2 });
const WEEKS = {
  1: [ev('champagneFair','Champagne Fair','SPECIAL','Monday','Tuesday'),
      ev('allianceBrawl','Alliance Brawl','BATTLE','Monday','Sunday'),
      ev('desertTrial','Desert Trial','COMPETITION','Wednesday','Friday'),
      ev('fishing','Fishing','SPECIAL','Tuesday','Thursday')],
  2: [ev('strongestGovernor','Strongest Governor','COMPETITION','Monday','Sunday')],
  3: [ev('allianceMobilization','Alliance Mobilization','COMPETITION','Monday','Saturday'),
      ev('officerProject1','Officer Project 1','COMPETITION','Wednesday','Thursday'),
      ev('mysticDivination','Mystic Divination','SPECIAL','Friday','Saturday')],
  4: [ev('castleBattle','Castle Battle','BATTLE','Saturday','Saturday'),
      ev('goldenGlaives','Golden Glaives','BATTLE','Monday','Tuesday'),
      ev('allOut','All Out','BATTLE','Friday','Saturday'),
      ev('defeatBeasts','Defeat Beasts','COMPETITION','Tuesday','Wednesday'),
      ev('eternitysReach',"Eternity's Reach",'BATTLE','Tuesday','Tuesday')],
};

function env(opts) {
  opts = opts || {};
  const prof = { pid:'1', nick:'A', kingdom:'2114', tc:'25', start:START };
  const d = {
    timestamp: new Date(NOW).toISOString(),
    calendar: { cycleReference: REF, currentWeek: 3, currentDay: 'Sunday', events: WEEKS[3] },
    weeks: WEEKS,
  };
  /* KvK #17: countdown 1,2 hari dari sekarang -> mulai 10 Agu (sama dgn feed nyata) */
  if (!opts.noKvk) d.kvk = { phase:'countdown', phaseName:'Next KvK', eventNumber:17,
    timeLeft:{ total: Math.round(1.2 * DAY) } };
  const e = createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([prof]),
    ks_p_1_profile: JSON.stringify(prof),
    ks_liveEvents: JSON.stringify({ t: NOW, d }),
  }});
  const c = e.evalIn('ksClock'); c.offset = NOW - Date.now(); c.nudge = 0;
  return e;
}
/* hari-server tempat sebuah tipe event MULAI, menurut kalender */
function mulaiDiKalender(e, tipe, dari, sampai) {
  const out = [];
  for (let d = dari; d <= sampai; d++)
    if ((e.evalIn('calEventsOnDay(profileAge().start,' + d + ')') || []).some(x => x && x.type === tipe && x.di === 0)) out.push(d);
  return out;
}

console.log('Task 1 — KvK: kalender vs daftar event');

t('feed dibaca: KvK berikutnya 10 Agu', () => {
  const e = env();
  eq(e.evalIn("kvkGlobalStartISO(store.get('liveEvents',null).d)"), '2026-08-10');
});

t('kalender menandai KvK di tanggal yang SAMA dengan daftar event', () => {
  const e = env();
  const kal = mulaiDiKalender(e, 'kvk', 60, 110).map(isoDari);
  const daftar = (e.evalIn('evUpcoming()') || []).find(x => x.id === 'kvk');
  ok(daftar && daftar.startUTC, 'KvK hilang dari daftar event');
  const tglDaftar = new Date(daftar.startUTC).toISOString().slice(0, 10);
  eq(tglDaftar, '2026-08-10', 'daftar event harus ikut feed');
  ok(kal.indexOf('2026-08-10') >= 0, 'kalender tak menandai 10 Agu (kalender: ' + kal.join(', ') + ')');
});

t('kalender tidak lagi memakai model H70 + 28 untuk KvK', () => {
  const kal = mulaiDiKalender(env(), 'kvk', 60, 110);
  ok(kal.indexOf(70) < 0, 'H70 = 4 Agu — sisa model per-kingdom');
});

t('tanpa feed, kalender jatuh ke model umur (cadangan yang jujur, bukan diam)', () => {
  const kal = mulaiDiKalender(env({ noKvk: true }), 'kvk', 60, 110);
  ok(kal.length, 'tanpa feed KvK hilang total dari kalender');
  ok(kal.indexOf(70) >= 0, 'cadangan harus H70 (gerbang KvK)');
});

t('label sumber: KvK dari feed disebut live, bukan "perkiraan hitungan app"', () => {
  const kvk = (env().evalIn('evUpcoming()') || []).find(x => x.id === 'kvk');
  eq(kvk.conf, 'live', 'tanggal dari countdown server dilabeli tebakan app');
});

console.log('\nTask 2 — Castle Battle di kalender');

t('Castle Battle muncul di kalender', () => {
  const kal = mulaiDiKalender(env(), 'castle', 1, 120);
  ok(kal.length, 'Castle Battle tak pernah tampil — padahal app menghitungnya persis');
});

t('tiap Castle Battle jatuh hari SABTU dan berjarak 14 hari', () => {
  const kal = mulaiDiKalender(env(), 'castle', 1, 120);
  kal.forEach(d => eq(dow(d), 6, 'H' + d + ' (' + isoDari(d) + ') bukan Sabtu'));
  for (let i = 1; i < kal.length; i++) eq(kal[i] - kal[i - 1], 14, 'jarak antar Castle harus 14 hari');
});

t('Castle pertama memakai jangkar castleFirstDay, bukan angka baru', () => {
  const e = env();
  const f = e.evalIn("castleFirstDay('" + START + "')");
  const kal = mulaiDiKalender(e, 'castle', 1, 120);
  eq(kal[0], f, 'kalender memulai Castle di hari yang berbeda dari fungsi sumbernya');
});

console.log('\nTask 3 — panel detail hari memakai tanggal hari ITU');

t('calDateOf: hari ke-1 = tanggal buka server', () => {
  const e = env();
  eq(e.evalIn("calDateOf(profileAge().start,1).toISOString().slice(0,10)"), START);
});

t('calDetail tidak lagi menghitung tanggalnya sendiri (sumber tunggal)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '01_fa4c6c09.js'), 'utf8');
  const i = src.indexOf('function calDetail('), j = src.indexOf('\nfunction ', i + 10);
  const badan = src.slice(i, j < 0 ? src.length : j);
  ok(badan.length > 200, 'calDetail tak ketemu — test ini jadi palsu');
  ok(!/start\.getTime\(\)\s*\+\s*d\s*\*\s*86400000/.test(badan),
     'masih menggeser satu hari: detail tanggal-N menampilkan event tanggal N+1');
  ok(/calDateOf/.test(badan), 'harus memakai helper tanggal yang sama dengan kalender');
});

console.log('\nTask 4 — event besar tak boleh tersembunyi');

t('chip: event nyata didahulukan atas milestone (slot chip cuma 2)', () => {
  /* 4 Agu di data nyata tampil "⚑⚑+1": dua milestone memakan kedua slot, dan KvK
     hari-1 — alasan utama orang membuka kalender — jadi "+1" tanpa nama. */
  const e = env();
  const urut = e.evalIn('calChipOrder')([
    { tag:'⚑', milestone:true }, { tag:'⚑', milestone:true }, { tag:'KvK', di:0, len:5 },
  ]);
  eq(urut.slice(0, 2).map(x => x.tag).indexOf('KvK') >= 0, true,
     'KvK masih terdorong keluar dua slot pertama');
});

t('legenda kalender menyebut Castle Battle', () => {
  const e = env();
  e.evalIn("renderCalendar(document.getElementById('evcal_k'))");
  const html = e.evalIn("document.getElementById('evcal_k').innerHTML") || '';
  ok(/Castle Battle/.test(html), 'CB ditandai di grid tapi tak dijelaskan di legenda');
});

(async () => {
  const e = env();
  await e.evalIn('fillSoonEvents(profileAge().age)');
  const html = e.evalIn("$('#sk_soon').innerHTML") || '';
  const barisSG = (html.match(/<div[^>]*data-name="Strongest Governor"[^>]*>/) || [''])[0];
  t('Strongest Governor tidak disembunyikan di balik "Lihat semua"', () => {
    ok(barisSG, 'baris SG tak ada sama sekali di tab Sekarang');
    ok(!/data-xtra/.test(barisSG),
       'SG ditandai baris tambahan — pemain harus menekan "Lihat semua" untuk melihatnya');
  });
  done();
})();
