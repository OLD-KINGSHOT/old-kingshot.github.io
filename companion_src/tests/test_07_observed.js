/* Catat Kemunculan — Task 1: klasifikasi recur + disambiguasi duplikat terverifikasi.
   Fakta (kingshotwiki, 2026-07-17): Treasure Raiders BERULANG (any gen, pickaxe
   tersimpan antar event) -> cadence bisa dipelajari. Power Up / Plan your City /
   War Preparation = Gen 1 SAJA ("not seen in gen2 and older"), one-time, early. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

function env() {
  return createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid:'1', nick:'A', kingdom:'2114', tc:'20', start:'2026-05-27' }]),
    ks_p_1_profile: JSON.stringify({ pid:'1', kingdom:'2114', tc:'20', start:'2026-05-27' }),
  }});
}

console.log('Task 1 — klasifikasi recur + disambiguasi');

const e = env();
const EVU = e.evalIn('EV_UNPREDICTABLE');
const INFO = e.evalIn('EVENTS_INFO');
const items = INFO.reduce((a, g) => a.concat(g.items || []), []);

t('setiap EV_UNPREDICTABLE punya kelas recur valid', () =>
  EVU.forEach(u => ok(u.recur === 'recurring' || u.recur === 'oneTime', u.id + ' recur hilang/salah')));
t('hanya Treasure Raiders yang recurring', () => {
  eq(EVU.find(u => u.id === 'treasureRaiders').recur, 'recurring');
  ['powerUp', 'planYourCity', 'warPreparation'].forEach(id =>
    eq(EVU.find(u => u.id === id).recur, 'oneTime', id + ' harus oneTime'));
});
t('KvK-prep tidak lagi salah label "War Preparation"', () => {
  ok(!items.some(x => x.n === 'War Preparation' && /KvK/i.test(x.cat)), 'KvK-prep masih bernama War Preparation');
  ok(items.some(x => x.n === 'KvK Prep Phase'), 'entri "KvK Prep Phase" hilang');
  ok(items.some(x => x.n === 'War Preparation' && /Gen 1/i.test(x.cat)), 'War Preparation Gen-1 asli hilang');
});
t('Power Up Gen-1 diperbaiki: sebut Gen 1 + menit speedup', () => {
  const pu = items.find(x => x.n === 'Power Up' && /power$/.test(x.cat) || (x.n === 'Power Up' && /Gen 1/i.test(x.cat)));
  ok(pu, 'entri Power Up Gen-1 hilang');
  ok(/Gen 1/i.test(pu.what) && /menit|speedup/i.test(pu.what), 'deskripsi Power Up belum sesuai wiki');
});

console.log('\nTask 2 — evObserved + evLog + wiring');

const DAY = 86400000;
function envLog(rows) {
  const storage = {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid:'1', nick:'A', kingdom:'2114', tc:'20', start:'2026-05-27' }]),
    ks_p_1_profile: JSON.stringify({ pid:'1', kingdom:'2114', tc:'20', start:'2026-05-27' }),
  };
  if (rows) storage.ks_p_1_evLog = JSON.stringify(rows);   // per-profile key
  return createEnv({ storage });
}
const R = (id, d) => ({ id, date: d });

t('0 catatan → semua null, tak melempar', () => {
  const o = envLog().ctx.evObserved('treasureRaiders');
  eq(o.count, 0); eq(o.lastUTC, null); eq(o.medianGapDays, null); eq(o.nextEstUTC, null);
});
t('1-2 catatan → lastUTC ada, belum ada estimasi', () => {
  const o = envLog([R('treasureRaiders','2026-07-01'), R('treasureRaiders','2026-07-07')]).ctx.evObserved('treasureRaiders');
  eq(o.count, 2); eq(o.lastUTC, Date.UTC(2026,6,7)); eq(o.medianGapDays, null); eq(o.nextEstUTC, null);
});
t('3 catatan berjarak sama → median gap + nextEst', () => {
  const o = envLog([R('treasureRaiders','2026-07-01'), R('treasureRaiders','2026-07-07'), R('treasureRaiders','2026-07-13')]).ctx.evObserved('treasureRaiders');
  eq(o.count, 3); eq(o.medianGapDays, 6); eq(o.nextEstUTC, Date.UTC(2026,6,13) + 6*DAY);
});
t('median menahan outlier (gaps 6,6,30 → 6, bukan mean 14)', () => {
  const o = envLog([R('x','2026-07-01'), R('x','2026-07-07'), R('x','2026-07-13'), R('x','2026-08-12')]).ctx.evObserved('x');
  eq(o.count, 4); eq(o.medianGapDays, 6);
});
t('duplikat tanggal + tak urut → dedup & sort, tanpa gap nol', () => {
  const o = envLog([R('x','2026-07-13'), R('x','2026-07-01'), R('x','2026-07-07'), R('x','2026-07-07')]).ctx.evObserved('x');
  eq(o.count, 3); eq(o.medianGapDays, 6);
});
t('guardrail: item evLog TAK PERNAH punya startUTC/endUTC', () => {
  const it = envLog([R('treasureRaiders','2026-07-01'), R('treasureRaiders','2026-07-07'), R('treasureRaiders','2026-07-13')]).ctx.evUpcoming().find(x => x.id === 'treasureRaiders');
  ok(it, 'treasureRaiders hilang'); eq(it.startUTC, null); eq(it.endUTC, null);
  eq(it.recur, 'recurring'); ok(it.observed && it.observed.count === 3);
});
t('HONESTY: oneTime tak pernah punya cadence walau 3+ catatan', () => {
  const it = envLog([R('powerUp','2026-07-01'), R('powerUp','2026-07-07'), R('powerUp','2026-07-13')]).ctx.evUpcoming().find(x => x.id === 'powerUp');
  eq(it.recur, 'oneTime'); eq(it.observed.medianGapDays, null); eq(it.observed.nextEstUTC, null);
  ok(it.observed.count === 3 && it.observed.lastUTC != null, 'tapi histori tetap disimpan');
});
t('recurring DOES punya cadence dengan 3+ catatan', () => {
  const it = envLog([R('treasureRaiders','2026-07-01'), R('treasureRaiders','2026-07-07'), R('treasureRaiders','2026-07-13')]).ctx.evUpcoming().find(x => x.id === 'treasureRaiders');
  eq(it.observed.medianGapDays, 6);
});
t('evLogAdd idempoten pada (id,date)', () => {
  const en = envLog(); en.ctx.evLogAdd('powerUp','2026-07-10'); en.ctx.evLogAdd('powerUp','2026-07-10');
  eq(en.ctx.evObserved('powerUp').count, 1);
});
t('evLogRemoveLast membuang baris terbaru untuk id', () => {
  const en = envLog([R('x','2026-07-01'), R('x','2026-07-20')]); en.ctx.evLogRemoveLast('x');
  const o = en.ctx.evObserved('x'); eq(o.count, 1); eq(o.lastUTC, Date.UTC(2026,6,1));
});
t('id seasonal:* round-trip lewat evObserved', () => {
  const o = envLog([R('seasonal:football-fiesta','2025-07-10'), R('seasonal:football-fiesta','2026-07-09')]).ctx.evObserved('seasonal:football-fiesta');
  eq(o.count, 2);
});

done();
