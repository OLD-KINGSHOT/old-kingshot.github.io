/* Konvensi tanggal-buka kingdom = TANGGAL UTC dari openTime — SERVER-WIDE (sama utk
   SEMUA Player ID di server yg sama). Terverifikasi 2114: HoG #2 = server day 20 =
   15 Jun in-game ⇒ day 1 = 27 Mei = tanggal UTC openTime (2026-05-27T00:06Z).
   Terapkan sama ke 2184 (openTime 2026-06-11T17:45Z) ⇒ tanggal UTC = 11 Jun (BUKAN
   12 Jun; percobaan "+8/zona server" itu KELIRU — menggeser HoG 1 hari).
   Umur = daysBetween(start@UTC-midnight, todayMidnight@UTC) + 1. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

function envAt(nowUTC, start, kingdom) {
  const env = createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid:'1', nick:'A', kingdom:kingdom||'2184', tc:'20', start }]),
    ks_p_1_profile: JSON.stringify({ pid:'1', kingdom:kingdom||'2184', tc:'20', start }),
  }});
  const ks = env.evalIn('ksClock'); ks.offset = nowUTC - Date.now(); ks.nudge = 0;
  return env;
}
/* UTC 17 Jul malam (= WIB 18 Jul dini hari — hari server masih 17 Jul UTC) */
const NOW = Date.UTC(2026, 6, 17, 21, 0, 0);

console.log('Konvensi tanggal-buka kingdom (tanggal UTC, server-wide)');

const KD = createEnv({ storage: { ks_activePid: JSON.stringify('1'), ks_profilesV: '1' } }).evalIn('KINGDOM_DATES');
t('2184 = tanggal UTC openTime 2026-06-11 (BUKAN 12 Jun)', () => eq(KD['2184'], '2026-06-11'));
t('2114 = 2026-05-27', () => eq(KD['2114'], '2026-05-27'));

t('2184 (buka 11 Jun) = H37 pada UTC 17 Jul', () =>
  eq(envAt(NOW, '2026-06-11').ctx.profileAge().age, 37));
t('2114 (buka 27 Mei) = H52 pada UTC 17 Jul', () =>
  eq(envAt(NOW, '2026-05-27', '2114').ctx.profileAge().age, 52));

/* Bukti konvensi: 2114 HoG #2 = server day 20 = 15 Jun. day 20 → start + 19 hari. */
t('2114 HoG #2 (day 20) jatuh 15 Jun (anchor terverifikasi)', () =>
  eq(envAt(NOW, '2026-05-27', '2114').ctx.addDaysISO(new Date('2026-05-27T00:00:00Z'), 20), '2026-06-15'));

/* SERVER-WIDE: umur = fungsi tanggal buka server, sama utk start yg sama (bukan per-ID). */
t('dua profil server sama (start sama) → umur & HoG IDENTIK (bukan per-Player-ID)', () => {
  const a = envAt(NOW, '2026-06-11').ctx.profileAge().age;
  const b = envAt(NOW, '2026-06-11').ctx.profileAge().age;
  eq(a, b); eq(a, 37);
});

done();
