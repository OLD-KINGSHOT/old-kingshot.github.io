/* Mesin countdown terpadu.
   Fakta yang dikunci (probe langsung, Jul 2026 — jangan ubah tanpa probe ulang):
   - Model proyeksi COCOK 100% dgn API: dari cycleReference 2025-12-08 (Senin),
     minggu = floor(hari/7)%4+1, dow = hari%7. Pada 2026-07-16 -> minggu 4, Kamis.
   - JEBAKAN: startUtc dari API untuk minggu BUKAN-berjalan = kejadian LAMPAU.
     Champagne Fair (minggu 1) mengembalikan 2026-06-22; yang benar 2026-07-20. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const REF = '2025-12-08T00:00:00.000Z';                 // Senin
const NOW = Date.UTC(2026, 6, 16, 18, 0, 0);            // Kamis 16 Jul 2026 = minggu 4
const DAY = 86400000;
const iso = ms => new Date(ms).toISOString().slice(0, 10);

const WEEKS = {
  1: [
    { titleKey:'champagneFair', title:'Champagne Fair', type:'SPECIAL', startDay:'Monday', endDay:'Tuesday', isMainEvent:true },
    { titleKey:'allianceBrawl', title:'Alliance Brawl', type:'BATTLE', startDay:'Monday', endDay:'Sunday', isMainEvent:true },
  ],
  2: [
    { titleKey:'strongestGovernor', title:'Strongest Governor', type:'COMPETITION', startDay:'Monday', endDay:'Sunday', isMainEvent:true },
    { titleKey:'officerProject2', title:'Officer Project 2', type:'COMPETITION', startDay:'Sunday', endDay:'Monday', isMainEvent:true },
  ],
  3: [],
  4: [
    { titleKey:'sanctuaryBattle', title:'Sanctuary Battle', type:'SPECIAL', startDay:'Tuesday', endDay:'Friday', isMainEvent:true },
    { titleKey:'kvkFieldTriage', title:'KvK Field Triage', type:'SPECIAL', startDay:'Saturday', endDay:'Monday', isMainEvent:true },
    { titleKey:'conqueror', title:'Conqueror', type:'PACK', startDay:'Thursday', endDay:'Saturday', isMainEvent:false },
  ],
};

function envAt(nowUTC, opts) {
  opts = opts || {};
  const storage = {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid:'1', nick:'A', kingdom:'2114', tc:'20', start:'2026-05-27' }]),
    ks_p_1_profile: JSON.stringify({ pid:'1', kingdom:'2114', tc:'20', start:'2026-05-27' }),
  };
  if (!opts.noCache) storage.ks_liveEvents = JSON.stringify({ t: nowUTC, d: {
    timestamp: new Date(nowUTC).toISOString(),
    kvk: opts.kvk, transfer: opts.transfer,
    calendar: { cycleReference: REF, currentWeek: 4, currentDay: 'Thursday', events: WEEKS[4] },
    weeks: WEEKS,
  }});
  const env = createEnv({ storage });
  const ksClock = env.evalIn('ksClock');
  ksClock.offset = nowUTC - Date.now(); ksClock.nudge = 0;  // bekukan jam ke NOW
  return env;
}

console.log('Task 1 — proyeksi rotasi');

/* sanity: model minggu/hari harus cocok dgn yang dilaporkan API pada tanggal itu */
t('model (minggu, hari) cocok dengan currentWeek/currentDay dari API', () => {
  const days = Math.floor((Date.UTC(2026, 6, 16) - Date.parse(REF)) / DAY);
  eq(days, 220, 'hari sejak cycleReference');
  eq((Math.floor(days / 7) % 4) + 1, 4, 'currentWeek');
  eq(days % 7, 3, 'dow index (3 = Thursday)');
});

const e = envAt(NOW);
const starts = e.ctx.nextWkStarts(28);

t('Champagne Fair: proyeksi memberi kemunculan BERIKUTNYA, bukan startUtc lampau', () => {
  const cf = starts.get('champagneFair');
  ok(cf, 'champagneFair tidak ada di hasil sapuan');
  eq(iso(cf.startUTC), '2026-07-20', 'harus 20 Jul (bukan 22 Jun = kejadian lampau)');
});
t('Champagne Fair: durasi Senin→Selasa = 2 hari', () =>
  eq(starts.get('champagneFair').endUTC - starts.get('champagneFair').startUTC + 1, 2 * DAY));
t('wrap Sabtu→Senin (KvK Field Triage) = 3 hari, mulai 18 Jul', () => {
  const k = starts.get('kvkFieldTriage');
  eq(iso(k.startUTC), '2026-07-18');
  eq(k.endUTC - k.startUTC + 1, 3 * DAY, 'wrap batas minggu salah hitung');
});
t('wrap Minggu→Senin (Officer Project 2) = 2 hari, mulai 2 Agu', () => {
  const o = starts.get('officerProject2');
  eq(iso(o.startUTC), '2026-08-02');
  eq(o.endUTC - o.startUTC + 1, 2 * DAY);
});
t('event yang sedang aktif dilaporkan mulai berikutnya 4 minggu lagi (bukan hari ini)', () => {
  /* Sanctuary Battle minggu 4 Selasa: kemunculan sekarang mulai 14 Jul (lampau).
     Sapuan ke depan sengaja hanya melihat ke depan — status aktif ditangani wkActiveNow (Task 3). */
  eq(iso(starts.get('sanctuaryBattle').startUTC), '2026-08-11');
});
t('nextWkStarts adalah proyeksi murni: PACK tidak difilter di sini', () =>
  ok(starts.has('conqueror'), 'filter kebijakan harus di evUpcoming, bukan di proyeksi'));
t('tanpa cache live -> Map kosong, tidak melempar error', () =>
  eq(envAt(NOW, { noCache: true }).ctx.nextWkStarts(28).size, 0));

t('jendela sapuan = TEPAT daysAhead hari (bukan 29)', () => {
  /* 20 Jul (Champagne Fair) berjarak 4 hari dari 16 Jul: masuk di window 5, tidak di 4. */
  ok(!e.ctx.nextWkStarts(4).has('champagneFair'), 'window 4 hari tidak boleh memuat hari ke-5');
  ok(e.ctx.nextWkStarts(5).has('champagneFair'), 'window 5 hari harus memuat 20 Jul');
});
t('nextWkStarts(0) = hari ini saja, tidak diam-diam jadi 28', () =>
  eq(e.ctx.nextWkStarts(0).size, 0, 'window 0 harus kosong (16 Jul bukan hari mulai event mana pun)'));

done();
