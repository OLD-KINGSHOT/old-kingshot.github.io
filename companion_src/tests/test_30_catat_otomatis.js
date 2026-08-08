/* Catat kemunculan OTOMATIS dari feed live.
 *
 * Sampai sekarang evLog hanya terisi lewat tombol "✏️ Muncul hari ini" — pemain
 * harus ingat sendiri. Padahal feed sudah mengirim kebenarannya: untuk minggu yang
 * SEDANG berjalan, `calendar.events[].isActive` + `startUtc` adalah laporan server,
 * bukan tebakan app.
 *
 * Aturan yang dikunci berkas ini:
 *   1. Hanya minggu BERJALAN yang boleh jadi observasi. `startUtc` untuk minggu lain
 *      berisi kejadian LAMPAU (jebakan yang sudah terdokumentasi di nextWkStarts) —
 *      mencatatnya = mengarang riwayat.
 *   2. Yang dicatat tanggal MULAI event, bukan "hari ini". Jarak antar kemunculan
 *      hanya berarti kalau titiknya konsisten.
 *   3. Catatan otomatis ditandai src:'feed' dan TIDAK PERNAH menggusur catatan
 *      tangan pemain — pemain melihat dengan matanya sendiri, app cuma membaca feed.
 *   4. Idempoten: app dibuka sepuluh kali sehari, catatannya tetap satu. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const REF = '2025-12-08T00:00:00.000Z';
const NOW = Date.UTC(2026, 7, 9, 3, 0, 0);        /* Min 9 Agu 2026 */
const START = '2026-05-27';

/* Minggu BERJALAN: dua aktif (satu COMPETITION, satu PACK), satu sudah selesai. */
const EVENTS_BERJALAN = [
  { titleKey:'strongestGovernor', title:'Strongest Governor', type:'COMPETITION',
    startDay:'Monday', endDay:'Sunday', startUtc:'2026-08-03T00:00:00.000Z', endUtc:'2026-08-09T23:59:59.999Z', isActive:true },
  { titleKey:'allianceMobilization', title:'Alliance Mobilization', type:'COMPETITION',
    startDay:'Monday', endDay:'Saturday', startUtc:'2026-08-03T00:00:00.000Z', endUtc:'2026-08-08T23:59:59.999Z', isActive:false },
  { titleKey:'conqueror', title:'Conqueror', type:'PACK',
    startDay:'Thursday', endDay:'Saturday', startUtc:'2026-08-06T00:00:00.000Z', endUtc:'2026-08-08T23:59:59.999Z', isActive:true },
];
/* Minggu LAIN — startUtc di sini adalah kejadian LAMPAU, bukan jadwal mendatang. */
const WEEKS = {
  1: [{ titleKey:'champagneFair', title:'Champagne Fair', type:'SPECIAL', startDay:'Monday', endDay:'Tuesday',
        startUtc:'2026-06-22T00:00:00.000Z', endUtc:'2026-06-23T23:59:59.999Z', isActive:true }],
  2: [], 3: EVENTS_BERJALAN, 4: [],
};

function env(opts) {
  opts = opts || {};
  const prof = { pid:'1', nick:'A', kingdom:'2114', tc:'25', start:START };
  const storage = {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([prof]),
    ks_p_1_profile: JSON.stringify(prof),
    ks_liveEvents: JSON.stringify({ t: opts.cacheT === undefined ? NOW : opts.cacheT, d: {
      timestamp: new Date(NOW).toISOString(),
      calendar: { cycleReference: REF, currentWeek: 3, currentDay: 'Sunday', events: EVENTS_BERJALAN },
      weeks: WEEKS,
    }}),
  };
  if (opts.evLog) storage.ks_p_1_evLog = JSON.stringify(opts.evLog);
  const e = createEnv({ storage });
  const c = e.evalIn('ksClock'); c.offset = NOW - Date.now(); c.nudge = 0;
  return e;
}
const log = e => e.evalIn('store.get("evLog",[])') || [];

console.log('Task 1 — apa yang dicatat, dan apa yang TIDAK');

t('event feed yang AKTIF tercatat dengan tanggal MULAI aslinya', () => {
  const e = env();
  eq(e.evalIn('evLogAutoFromFeed()'), 1, 'tepat satu baris baru');
  const rows = log(e);
  eq(rows.length, 1);
  eq(rows[0].id, 'sg', 'id kanonik, bukan titleKey feed');
  eq(rows[0].date, '2026-08-03', 'tanggal MULAI dari startUtc, bukan hari ini (9 Agu)');
});

t('PACK tidak pernah dicatat — bundel bayar bukan kemunculan event', () => {
  const e = env(); e.evalIn('evLogAutoFromFeed()');
  ok(!log(e).some(r => r.id === 'conqueror'), 'Conqueror (PACK) ikut tercatat');
});

t('event yang tidak aktif tidak dicatat', () => {
  const e = env(); e.evalIn('evLogAutoFromFeed()');
  ok(!log(e).some(r => r.id === 'allianceMobilization'), 'isActive:false tak boleh jadi observasi');
});

t('minggu BUKAN-berjalan diabaikan (startUtc-nya kejadian LAMPAU)', () => {
  const e = env(); e.evalIn('evLogAutoFromFeed()');
  ok(!log(e).some(r => r.id === 'champagneFair'),
     'Champagne Fair minggu-1 tercatat 22 Jun — riwayat karangan dari minggu lain');
});

console.log('\nTask 2 — catatan otomatis hidup berdampingan dengan catatan tangan');

t('dijalankan dua kali tidak menggandakan baris', () => {
  const e = env();
  e.evalIn('evLogAutoFromFeed()');
  eq(e.evalIn('evLogAutoFromFeed()'), 0, 'jalan kedua tak boleh menambah apa pun');
  eq(log(e).length, 1);
});

t('baris otomatis ditandai src feed; baris tangan tetap tanpa tanda', () => {
  const e = env({ evLog: [{ id:'treasureRaiders', date:'2026-07-01' }] });
  e.evalIn('evLogAutoFromFeed()');
  const rows = log(e);
  const auto = rows.find(r => r.id === 'sg'), tangan = rows.find(r => r.id === 'treasureRaiders');
  eq(auto.src, 'feed');
  ok(!tangan.src, 'catatan tangan tak boleh ikut ditandai');
});

t('pemangkasan membuang baris otomatis TERLAMA, tak pernah baris tangan', () => {
  /* 500 baris otomatis lama + 1 catatan tangan; batasnya 400. */
  const banyak = [];
  for (let i = 0; i < 500; i++)
    banyak.push({ id:'x'+i, date:'2025-01-01', src:'feed' });
  banyak.push({ id:'treasureRaiders', date:'2025-06-06' });
  const e = env({ evLog: banyak });
  e.evalIn('evLogAutoFromFeed()');
  const rows = log(e);
  ok(rows.length <= 401, 'baris otomatis tak dibatasi — evLog tumbuh selamanya, got ' + rows.length);
  ok(rows.some(r => r.id === 'treasureRaiders'), 'catatan tangan ikut terbuang');
  ok(rows.some(r => r.id === 'sg'), 'baris baru justru yang terbuang');
});

console.log('\nTask 3 — dipanggil sendiri, dan hasilnya dipakai');

t('evObserved memakai catatan otomatis: 3 kemunculan memberi jarak median', () => {
  const e = env({ evLog: [
    { id:'sg', date:'2026-06-01', src:'feed' },
    { id:'sg', date:'2026-07-06', src:'feed' },   /* +35 */
    { id:'sg', date:'2026-08-03', src:'feed' },   /* +28 */
  ]});
  const o = e.evalIn('evObserved("sg")');
  eq(o.count, 3);
  eq(o.medianGapDays, 32, 'median dari 35 & 28 = 31.5 -> 32 (dibulatkan seperti _median)');
});

t('evUpcoming melampirkan observasi ke event feed, bukan cuma yang tak-terprediksi', () => {
  const e = env({ evLog: [
    { id:'sg', date:'2026-06-01', src:'feed' },
    { id:'sg', date:'2026-07-06', src:'feed' },
  ]});
  const sg = (e.evalIn('evUpcoming()') || []).find(x => x.id === 'sg');
  ok(sg, 'SG hilang dari daftar');
  ok(sg.observed, 'tanpa ini UI tak punya apa pun untuk ditampilkan');
  eq(sg.observed.count, 2);
});

/* `t()` di harness bersifat SINKRON: callback async akan dianggap lulus begitu ia
   mengembalikan promise, tanpa satu pun assertion dijalankan. Jadi bagian async
   ditunggu di luar, baru assertion-nya dibungkus t(). */
(async () => {
  const e = env();
  const sebelum = log(e).length;
  await e.evalIn('ksLiveEvents()');
  const sesudah = log(e).length;
  t('ksLiveEvents mencatat tanpa diminta (jalur cache masih segar)', () => {
    ok(sesudah > sebelum, 'membuka app tidak mencatat apa pun (' + sebelum + ' -> ' + sesudah + ')');
  });
  done();
})();
