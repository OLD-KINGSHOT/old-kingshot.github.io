/* Tanggal KvK datang dari jadwal GLOBAL, bukan siklus per-kingdom.

   Terverifikasi 26 Jul 2026 dari feed kingshot.net (/api/events):
     timestamp 2026-07-25T19:54:01Z + kvk.timeLeft.total 15h4j6m
     -> KvK #17 mulai 2026-08-10T00:00Z (= 07:00 WIB, jam reset harian).
   kingshotoptimizer.com/kvk-rankings/guide: "KvK runs on a 28-day GLOBAL cycle
   ... every KvK match across all Kingdoms happens at the exact same time."

   Jadi umur kingdom (H70) cuma GERBANG: kingdom ikut gelombang global pertama
   yang saat itu umurnya sudah >= 70. Model lama (H70 lalu +28 dari H70 sendiri)
   memberi tanggal yang salah — untuk Kingdom 2114 ia bilang 4 Agu (H70) padahal
   KvK-nya 10 Agu. App bahkan sudah menampilkan "KvK #17" dari feed yang sama di
   tab Jadwal Live, jadi dua bagian app saling bertentangan. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const FEED = {
  t: Date.parse('2026-07-25T19:54:01.664Z'),
  d: {
    timestamp: '2026-07-25T19:54:01.664Z',
    kvk: { phase: 'countdown', phaseName: 'Next KvK', eventNumber: 17,
           timeLeft: { days: 15, hours: 4, minutes: 6, seconds: 45, total: 1310805163 } },
  },
};
const K2114 = '2026-05-27';

function env(withFeed) {
  const storage = {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([{ pid: '1', nick: 'A', kingdom: '2114', tc: '20', start: K2114 }]),
    ks_p_1_profile: JSON.stringify({ pid: '1', kingdom: '2114', tc: '20', start: K2114 }),
  };
  if (withFeed) storage.ks_p_1_liveEvents = JSON.stringify(FEED);
  if (withFeed) storage.ks_liveEvents = JSON.stringify(FEED);
  return createEnv({ storage });
}

console.log('KvK = jadwal global, umur kingdom = gerbang');

t('kvkGlobalStartISO membaca tanggal mulai dari hitung mundur feed', () => {
  const f = env(false).evalIn('kvkGlobalStartISO');
  eq(f(FEED.d), '2026-08-10', 'timestamp + timeLeft.total = 10 Agu 2026 (00:00Z)');
});

t('kvkGlobalStartISO menyerah kalau feed tak ada / bukan hitung mundur', () => {
  const f = env(false).evalIn('kvkGlobalStartISO');
  eq(f(null), null);
  eq(f({ timestamp: FEED.d.timestamp, kvk: { phase: 'preparation', timeLeft: { total: 100 } } }), null,
     'fase berjalan tidak dipakai sebagai tanggal MULAI');
});

t('Kingdom 2114 ikut gelombang 10 Agu (umur 76, sudah lewat gerbang H70)', () => {
  const f = env(false).evalIn('kvkNextForKingdom');
  eq(f('2026-08-10', K2114, 70), { date: '2026-08-10', day: 76 });
});

t('kingdom yang belum cukup umur menunggu gelombang global berikutnya (+28)', () => {
  const f = env(false).evalIn('kvkNextForKingdom');
  // buka 1 Jul 2026: 10 Agu = H41, 7 Sep = H69 (masih kurang), 5 Okt = H97
  eq(f('2026-08-10', '2026-07-01', 70), { date: '2026-10-05', day: 97 });
});

t('predictedEvents memakai tanggal feed kalau feed tersedia', () => {
  const e = env(true);
  const kvk = e.evalIn('predictedEvents')(new Date(K2114 + 'T00:00:00Z'), 61).find(x => x.type === 'kvk');
  eq(kvk.date, '2026-08-10', 'harus 10 Agu (feed), bukan 4 Agu (model umur)');
  eq(kvk.src, 'feed');
  eq(kvk.elig, true, 'tetap tidak dijamin — Matchmaking Bye masih mungkin');
});

t('tanpa feed, predictedEvents jatuh ke model umur & TIDAK mengaku dari feed', () => {
  const e = env(false);
  const kvk = e.evalIn('predictedEvents')(new Date(K2114 + 'T00:00:00Z'), 61).find(x => x.type === 'kvk');
  eq(kvk.day, 70, 'fallback = gerbang H70');
  ok(!kvk.src, 'jangan mengklaim sumber feed saat feed tak ada');
});

t('label sumber membedakan feed global dari estimasi', () => {
  const f = env(false).evalIn('predSourceLabel');
  ok(/feed|global/i.test(f({ type: 'kvk', src: 'feed', elig: true })), 'tanggal feed harus dilabeli global/feed');
  ok(/eligibility/i.test(f({ type: 'kvk', elig: true })), 'tanpa feed tetap label eligibility');
});

t('advisory KvK menyebut jadwal global saat tanggalnya dari feed', () => {
  const a = env(false).evalIn('evAdvisory')({ type: 'kvk', date: '2026-08-10', src: 'feed' });
  const txt = (a.lines || []).join(' ');
  ok(/global/i.test(txt), 'harus menjelaskan siklus global');
  ok(/Bye|tidak dijamin/i.test(txt), 'tetap ingatkan Matchmaking Bye');
});

done();
