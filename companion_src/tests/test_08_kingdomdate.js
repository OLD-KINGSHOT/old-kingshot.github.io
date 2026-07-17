/* Konvensi tanggal-buka kingdom (Hari-1 = tanggal buka di zona server UTC+8).
   Terverifikasi in-game 2026-07-18: K2184 (buka 2026-06-11T17:45Z) = H37, BUKAN H38.
   Buka sore UTC = hari parsial → di UTC+8 tanggalnya bergeser ke besoknya (12 Jun).
   K2114 (buka 2026-05-27T00:06Z) tetap 27 Mei (00:06Z+8 = 08:06 tanggal sama). */
const { createEnv, t, eq, ok, done } = require('./harness.js');

function envAt(nowUTC, start) {
  const env = createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid:'1', nick:'A', kingdom:'2184', tc:'20', start }]),
    ks_p_1_profile: JSON.stringify({ pid:'1', kingdom:'2184', tc:'20', start }),
  }});
  const ks = env.evalIn('ksClock'); ks.offset = nowUTC - Date.now(); ks.nudge = 0;
  return env;
}

console.log('Konvensi tanggal-buka kingdom (UTC+8)');

const KD = createEnv({ storage: { ks_activePid: JSON.stringify('1'), ks_profilesV: '1' } }).evalIn('KINGDOM_DATES');
t('2184 di-seed ke tanggal UTC+8 2026-06-12 (game H37, bukan H38 dari UTC)', () => eq(KD['2184'], '2026-06-12'));
t('2114 seed tetap 2026-05-27', () => eq(KD['2114'], '2026-05-27'));

t('profil 2184 = H37 pada 2026-07-18', () =>
  eq(envAt(Date.UTC(2026, 6, 18, 12, 0, 0), '2026-06-12').ctx.profileAge().age, 37));
t('start tanggal-UTC (2026-06-11) akan keliru jadi H38 — membuktikan geser +8 penting', () =>
  eq(envAt(Date.UTC(2026, 6, 18, 12, 0, 0), '2026-06-11').ctx.profileAge().age, 38));

done();
