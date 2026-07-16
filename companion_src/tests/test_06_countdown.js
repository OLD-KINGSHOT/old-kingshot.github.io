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

console.log('\nTask 2 — daftar terpadu (user + model umur)');

/* Kingdom 2114 buka 2026-05-27; pada 2026-07-16 = H51.
   HoG #4 = H48..H54 -> AKTIF. KvK = H70 -> mendatang, terkunci (minDay 70). */
{
  const env = envAt(NOW);
  const list = env.ctx.evUpcoming();
  const byId = id => list.find(x => x.id === id);

  t('HoG terdeteksi AKTIF pada H51 (iterasi #4 = H48-H54)', () => {
    const h = byId('hog');
    ok(h, 'hog tidak ada di daftar');
    eq(h.active, true, 'HoG #4 harusnya aktif di H51');
    eq(h.conf, 'ingame', 'HoG terverifikasi in-game -> conf tertinggi');
  });
  t('KvK mendatang dan TERKUNCI di H51 (gate H70)', () => {
    const k = byId('kvk');
    ok(k, 'kvk tidak ada');
    eq(k.active, false);
    eq(k.locked, true, 'H51 < minDay 70 -> harus locked');
    eq(k.gate.minDay, 70);
    ok(k.startUTC > NOW, 'KvK harus di masa depan');
  });
  t('item aktif diurut sebelum item mendatang', () => {
    const iActive = list.findIndex(x => x.active);
    const iFuture = list.findIndex(x => !x.active && x.startUTC != null);
    ok(iActive >= 0 && iFuture >= 0 && iActive < iFuture, 'urutan salah: aktif harus di atas');
  });
  t('item mendatang terurut menaik menurut startUTC', () => {
    const f = list.filter(x => !x.active && x.startUTC != null).map(x => x.startUTC);
    for (let i = 1; i < f.length; i++) ok(f[i] >= f[i - 1], 'tidak terurut di indeks ' + i);
  });
  t('setiap item punya bentuk lengkap (tak ada field hilang)', () => {
    for (const it of list)
      for (const k of ['id','title','startUTC','endUTC','active','source','conf','locked','unpredictable'])
        ok(k in it, 'field "' + k + '" hilang di item ' + it.id);
  });
}

/* Koreksi manual user menang atas model umur server. */
{
  const env = envAt(NOW);
  env.evalIn('store').set('events', [{ type: 'kvk', date: '2026-09-01' }]);
  const k = env.ctx.evUpcoming().find(x => x.id === 'kvk');
  t('koreksi manual user menang atas model umur server', () => {
    eq(iso(k.startUTC), '2026-09-01', 'tanggal ralat user diabaikan');
    eq(k.source, 'user');
    eq(k.conf, 'ingame', 'ralat user = kelas in-game');
  });
}

/* Tanpa profil (belum konek): tidak melempar error, model umur kosong. */
t('tanpa profil -> evUpcoming tetap jalan, tidak melempar', () => {
  const env = createEnv({ storage: { ks_activePid: JSON.stringify('9'), ks_profilesV: '1' } });
  const l = env.ctx.evUpcoming();
  ok(Array.isArray(l), 'harus array');
  ok(!l.some(x => x.id === 'hog'), 'tanpa tanggal buka server, HoG tak bisa dihitung');
});

console.log('\nTask 3 — sumber live');

const KVK_PREP = { phase:'preparation', phaseName:'Prep Phase', eventNumber:16, timeLeft:{ total: 2 * DAY } };
const TRANSFER = { phase:'countdown', phaseName:'Next Transfer', eventNumber:7, timeLeft:{ total: 2 * DAY + 5 * 3600000 } };

{
  const env = envAt(NOW, { kvk: KVK_PREP, transfer: TRANSFER });
  const list = env.ctx.evUpcoming();
  const byId = id => list.find(x => x.id === id);

  t('transfer (phase=countdown): timeLeft = menuju MULAI', () => {
    const tr = byId('transfer');
    ok(tr, 'transfer tidak ada');
    eq(tr.startUTC, NOW + TRANSFER.timeLeft.total, 'harus jadi startUTC');
    eq(tr.active, false);
    eq(tr.conf, 'live');
  });
  t('phase != countdown: timeLeft = sisa fase BERJALAN, bukan menuju mulai', () => {
    /* id 'kvk' sudah diambil model umur server (prioritas lebih tinggi) -> pakai id lain
       untuk menguji semantiknya: 'transfer' saja tidak cukup. Cek lewat fase aktif global. */
    const env2 = createEnv({ storage: { ks_activePid: JSON.stringify('9'), ks_profilesV: '1',
      ks_liveEvents: JSON.stringify({ t: NOW, d: { timestamp: new Date(NOW).toISOString(),
        kvk: KVK_PREP, transfer: TRANSFER,
        calendar: { cycleReference: REF, currentWeek: 4, currentDay: 'Thursday', events: WEEKS[4] }, weeks: WEEKS } }) } });
    const ks = env2.evalIn('ksClock'); ks.offset = NOW - Date.now(); ks.nudge = 0;
    const k = env2.ctx.evUpcoming().find(x => x.id === 'kvk');
    ok(k, 'kvk global tidak ada saat profil kosong');
    eq(k.active, true, 'phase preparation = sedang berjalan');
    eq(k.startUTC, null, 'JANGAN pakai timeLeft sbg startUTC saat fase berjalan');
    eq(k.endUTC, NOW + KVK_PREP.timeLeft.total, 'timeLeft = akhir fase berjalan');
  });
  t('model umur server menang atas KvK global dari API', () => {
    eq(byId('kvk').source, 'age', 'profil H51 punya model umur -> harus menang');
  });
  t('Sanctuary Battle terdeteksi AKTIF (mulai 14 Jul, bukan 11 Agu)', () => {
    const s = byId('sanctuaryBattle');
    ok(s, 'sanctuaryBattle tidak ada');
    eq(s.active, true);
    eq(iso(s.startUTC), '2026-07-14', 'wkActiveNow harus mundur cari hari mulai');
  });
  t('Champagne Fair muncul sbg mendatang 20 Jul', () =>
    eq(iso(byId('champagneFair').startUTC), '2026-07-20'));
  t('PACK disaring dari daftar (bundel bayar, bukan event skor)', () =>
    ok(!byId('conqueror'), 'PACK bocor ke daftar countdown'));
  t('gate WEEKLY_MIN diterapkan ke event rotasi (pakai titleKey ASLI, bukan id ter-alias)', () => {
    /* strongestGovernor -> id 'sg' (alias), gate WEEKLY_MIN['strongestGovernor']=75.
       Di H51: terkunci TAPI tetap punya countdown. Kalau gate dicari pakai id 'sg',
       WEEKLY_MIN['sg'] undefined -> gate hilang diam-diam. */
    const s = byId('sg');
    ok(s, 'strongestGovernor tidak ter-alias ke sg');
    eq(s.gate && s.gate.minDay, 75, 'gate hilang — dicari pakai id ter-alias?');
    eq(s.locked, true, 'H51 < 75 harus terkunci');
    ok(s.startUTC != null, 'tetap punya countdown walau terkunci');
  });
  t('alias: strongestGovernor dari feed = id "sg" (tidak dobel)', () =>
    ok(!byId('strongestGovernor'), 'harus di-alias ke sg, bukan id feed'));
}

console.log('\nTask 4 — kejujuran');

{
  const env = envAt(NOW, { kvk: KVK_PREP, transfer: TRANSFER });
  const list = env.ctx.evUpcoming();
  const un = list.filter(x => x.unpredictable);

  t('event tak-terprediksi ada di daftar', () => {
    ok(un.length >= 3, 'harusnya >=3 (Treasure Raiders, Power Up, War Preparation), dapat ' + un.length);
    ok(un.some(x => x.id === 'treasureRaiders'), 'treasureRaiders hilang');
    ok(un.some(x => x.id === 'powerUp'), 'powerUp hilang');
    ok(un.some(x => x.id === 'warPreparation'), 'warPreparation hilang');
  });
  t('event tak-terprediksi TIDAK punya tanggal apa pun', () => {
    for (const u of un) {
      eq(u.startUTC, null, u.id + ' punya startUTC — dilarang mengarang countdown');
      eq(u.endUTC, null, u.id + ' punya endUTC');
      eq(u.conf, 'unknown', u.id + ' conf salah');
    }
  });
  t('tiap item tak-terprediksi menjelaskan KENAPA (mengutip sumber)', () =>
    un.forEach(u => ok(u.why && u.why.length > 20, u.id + ' tanpa alasan')));
  t('item tak-terprediksi selalu diurut PALING BAWAH', () => {
    const last = list.length - un.length;
    for (let i = last; i < list.length; i++) ok(list[i].unpredictable, 'indeks ' + i + ' harusnya unpredictable');
  });
  t('catatan musiman ada dan tidak memuat countdown', () => {
    const n = env.evalIn('EV_SEASONAL_NOTE');
    ok(n && n.body, 'EV_SEASONAL_NOTE hilang');
    ok(/Football Fiesta/.test(n.body), 'harus menyebut contoh konkret');
    ok(!/hari lagi|days? left/i.test(n.body), 'catatan musiman tak boleh mengandung countdown');
    ok(/discord/i.test(n.discord || ''), 'butuh tautan Discord resmi');
  });
}

/* Offline (spec §7 no.7 + 5b): tanpa cache live, mesin tetap berguna dan tidak melempar. */
{
  const env = envAt(NOW, { noCache: true });
  const list = env.ctx.evUpcoming();
  t('offline: model umur server tetap jalan tanpa cache live', () => {
    ok(Array.isArray(list), 'harus array');
    const h = list.find(x => x.id === 'hog');
    ok(h, 'HoG hilang saat offline — model umur tidak butuh jaringan');
    eq(h.active, true, 'HoG #4 tetap aktif di H51 walau offline');
  });
  t('offline: item tak-terprediksi tetap ada (statis, tak butuh jaringan)', () =>
    ok(list.filter(x => x.unpredictable).length >= 3, 'daftar tak-terprediksi hilang saat offline'));
  t('offline: tidak ada item rotasi yang mengarang tanggal', () =>
    ok(!list.some(x => x.source === 'live'), 'item live muncul tanpa cache'));
}

done();
