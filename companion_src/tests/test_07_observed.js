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

done();
