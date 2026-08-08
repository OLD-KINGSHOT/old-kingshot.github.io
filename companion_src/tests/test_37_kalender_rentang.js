/* "Harusnya kalender sesuai event mulai dan berakhir, bukan semuanya."
 *
 * Dulu event mingguan tidak punya chip sama sekali — hanya satu GARIS BIRU
 * "ada event mingguan hari ini". Dan karena Alliance Championship dkk berjalan
 * Senin-Minggu, garis itu menyala di SELURUH 31 hari. Sinyal yang selalu menyala
 * sama dengan tidak ada sinyal: kalender terlihat penuh, tapi tak memberi tahu
 * apa pun tentang kapan sesuatu MULAI dan BERAKHIR.
 *
 * Sekarang tiap event rotasi tampil pada RENTANGNYA sendiri. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const REF = '2025-12-08T00:00:00.000Z';
const NOW = Date.UTC(2026, 7, 9, 3, 0, 0);
const START = '2026-05-27';
const DAY = 86400000;
const hariKe = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(START + 'T00:00:00Z')) / DAY) + 1;

const ev = (k, n, ty, s, e2) => ({ titleKey:k, title:n, type:ty, startDay:s, endDay:e2 });
/* minggu 3 = 3-9 Agu · minggu 4 = 10-16 · minggu 1 = 17-23 · minggu 2 = 24-30 */
const WEEKS = {
  1: [ev('champagneFair','Champagne Fair','SPECIAL','Monday','Tuesday')],
  2: [ev('strongestGovernor','Strongest Governor','COMPETITION','Monday','Sunday')],
  3: [ev('allianceMobilization','Alliance Mobilization','COMPETITION','Monday','Saturday')],
  4: [ev('sanctuaryBattle','Sanctuary Battle','SPECIAL','Tuesday','Friday'),
      ev('castleBattle','Castle Battle','BATTLE','Saturday','Saturday')],
};

function env() {
  const prof = { pid:'1', nick:'A', kingdom:'2114', tc:'25', start:START };
  const e = createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([prof]),
    ks_p_1_profile: JSON.stringify(prof),
    ks_liveEvents: JSON.stringify({ t: NOW, d: {
      timestamp: new Date(NOW).toISOString(),
      calendar: { cycleReference: REF, currentWeek: 3, currentDay: 'Sunday', events: WEEKS[3] },
      weeks: WEEKS,
    }}),
  }});
  const c = e.evalIn('ksClock'); c.offset = NOW - Date.now(); c.nudge = 0;
  return e;
}
/* nama event mingguan yang ditandai kalender pada tanggal itu */
const mingguanDi = (e, iso) =>
  (e.evalIn('calWeeklyOnDay(profileAge().start,' + hariKe(iso) + ')') || []).map(x => x.n);

console.log('Task 1 — tiap event pada RENTANGNYA sendiri');

t('Sanctuary Battle (Sel→Jum) hanya di 11-14 Agu, bukan sepanjang minggu', () => {
  const e = env();
  ['2026-08-11','2026-08-12','2026-08-13','2026-08-14'].forEach(d =>
    ok(mingguanDi(e, d).indexOf('Sanctuary Battle') >= 0, d + ': seharusnya ADA'));
  ['2026-08-10','2026-08-15','2026-08-16'].forEach(d =>
    ok(mingguanDi(e, d).indexOf('Sanctuary Battle') < 0, d + ': seharusnya TIDAK ada'));
});

t('hari tanpa event mingguan benar-benar KOSONG (dulu selalu bergaris biru)', () => {
  const e = env();
  eq(mingguanDi(e, '2026-08-10'), [], '10 Agu: minggu-4 tak punya event Senin');
  eq(mingguanDi(e, '2026-08-16'), [], '16 Agu: minggu-4 tak punya event Minggu');
});

t('Alliance Mobilization (Sen→Sab) berhenti di Sabtu, tidak sampai Minggu', () => {
  const e = env();
  ok(mingguanDi(e, '2026-08-08').indexOf('Alliance Mobilization') >= 0, '8 Agu (Sab) harus ada');
  ok(mingguanDi(e, '2026-08-09').indexOf('Alliance Mobilization') < 0, '9 Agu (Min) harus habis');
});

t('hari ke-berapa event itu dihitung, supaya chip bisa menulis "SB²"', () => {
  const e = env();
  const d12 = (e.evalIn('calWeeklyOnDay(profileAge().start,' + hariKe('2026-08-12') + ')') || [])
    .find(x => x.n === 'Sanctuary Battle');
  ok(d12, 'Sanctuary Battle tak ketemu di 12 Agu');
  eq(d12.di, 1, '12 Agu = hari ke-2 (di 0-based)');
  eq(d12.len, 4, 'Sel→Jum = 4 hari');
});

console.log('\nTask 2 — tidak dobel dengan chip yang sudah ada');

t('Castle Battle tidak muncul dua kali (sudah punya chip CB sendiri)', () => {
  const e = env();
  const mingguan = mingguanDi(e, '2026-08-15');
  ok(mingguan.indexOf('Castle Battle') < 0, 'Castle Battle dobel: sudah ada chip CB dari calCastleOnDay');
  const semua = (e.evalIn('calEventsOnDay(profileAge().start,' + hariKe('2026-08-15') + ')') || []);
  ok(semua.some(x => x.type === 'castle'), 'chip CB-nya sendiri malah hilang');
});

t('SG tidak dobel juga', () => {
  const e = env();
  ok(mingguanDi(e, '2026-08-24').indexOf('Strongest Governor') < 0, 'SG dobel dengan chip SG');
});

console.log('\nTask 3 — event besar tak tertelan "+N"');

t('urutan chip: event pertumbuhan dulu, mingguan, milestone paling belakang', () => {
  const e = env();
  const urut = e.evalIn('calChipOrder')([
    { tag:'⚑', milestone:true },
    { tag:'AM', type:'wk' },
    { tag:'KvK', di:0, len:5 },
  ]);
  eq(urut.map(x => x.tag), ['KvK','AM','⚑'], 'urutan prioritas salah');
});

t('garis biru "ada event mingguan" sudah tidak dipakai lagi', () => {
  const e = env();
  e.evalIn("renderCalendar(document.getElementById('evcal_k'))");
  const html = e.evalIn("document.getElementById('evcal_k').innerHTML") || '';
  ok(!/calcell[^"]*\bwk\b/.test(html), 'kelas garis biru masih dipasang');
  ok(!/Garis biru/.test(html), 'legendanya masih menjelaskan garis yang sudah tak ada');
});

done();
