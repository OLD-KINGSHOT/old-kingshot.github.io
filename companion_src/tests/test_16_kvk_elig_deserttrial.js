/* Dua koreksi data yang tersisa dari sesi 25 Jul 2026.

   A. RAMALAN KvK dibaca sebagai tanggal pasti.
      Commit 6d7d244 memisahkan King's Castle Battle dari KvK, tapi ramalan di
      app masih menyajikan "KvK hari-70" seperti tanggal tunggal. Hari 70 =
      ELIGIBILITY TERBUKA (paling cepat), bukan jadwal match: KvK butuh lawan
      matchmaking; tanpa lawan sepadan → "Matchmaking Bye Rewards" dan bulan itu
      tidak ada battle. Test ini menjaga agar sifat "belum tentu terjadi" itu
      ikut ditampilkan, bukan cuma tersirat di label "akurasi sedang".

   B. Entri Desert Trial terlalu generik ("tantangan bertahap di gurun ->
      hadiah trial"). Sumber: https://kingshotwiki.com/events/desert-trial/
      (di-scrape 26 Jul 2026) + konfirmasi in-game dari pemain:
      - beast di MAP pakai stamina (~8/hunt) → drop Clawshard & Challenger Pouch
      - MISI utama: Hunt 10 Dreadwolves — harus INISIASI rally sendiri,
        JOIN tidak dihitung → 10 shard Diana (maks 500 shard/event)
      - Clawshard baru bisa ditukar jadi Challenger Pouch setelah Diana 5★
      - isi pouch: 100% 5-10m General Speedup + 100% 1.000 Hero XP;
        20% 100 gem · 50% 10-30 gem · 15% 1 Governor Stamina
      - Diana: hemat stamina hunt & MULAI rally + march lebih cepat
      - event hilang di Gen 4 (diganti Champion's Way) */
const { createEnv, t, eq, ok, done } = require('./harness.js');
const fs = require('fs'), path = require('path');

const env = createEnv();
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

console.log('KvK = eligibility (bukan tanggal pasti) + Desert Trial');

/* ── A. ramalan KvK ── */

t('prediksi KvK ditandai TIDAK DIJAMIN (elig), HoG tidak', () => {
  const pred = env.evalIn('predictedEvents');
  const daysBetween = env.evalIn('daysBetween');
  const todayMidnight = env.evalIn('todayMidnight');
  const start = new Date('2026-05-27T00:00:00Z');
  const age = daysBetween(start, todayMidnight()) + 1;
  const out = pred(start, age);
  const kvk = out.find(e => e.type === 'kvk');
  ok(kvk, 'prediksi KvK ada');
  eq(kvk.elig, true, 'KvK harus ditandai elig (eligibility, bukan tanggal pasti)');
  const hog = out.find(e => e.type === 'hog');
  ok(hog && !hog.elig, 'HoG polanya pasti — jangan ikut ditandai elig');
});

t('advisory KvK pra-event menyatakan eligibility & kemungkinan Bye', () => {
  const adv = env.evalIn('evAdvisory');
  const addDaysISO = env.evalIn('addDaysISO');
  const a = adv({ type: 'kvk', date: addDaysISO(new Date(), 5) });
  ok(a && a.lines && a.lines.length, 'advisory KvK kosong');
  const txt = a.lines.join(' ');
  ok(/eligib/i.test(txt), 'advisory KvK harus menyebut eligibility');
  ok(/Bye|tidak dijamin|belum tentu/i.test(txt),
     'advisory KvK harus menyatakan event bisa batal (Matchmaking Bye)');
});

t('advisory SG/HoG tidak ikut kena catatan eligibility KvK', () => {
  const adv = env.evalIn('evAdvisory');
  const addDaysISO = env.evalIn('addDaysISO');
  const sg = adv({ type: 'sg', date: addDaysISO(new Date(), 5) });
  ok(sg && !/Matchmaking Bye/i.test(sg.lines.join(' ')),
     'catatan Bye khusus KvK, jangan bocor ke Strongest Governor');
});

t('penjelas jadwal di tab Event memakai kata eligibility untuk KvK', () => {
  const src = read('01_fa4c6c09.js');
  ok(/eligibilit/i.test(src), 'teks penjelas estimasi harus menjelaskan eligibility KvK');
});

/* ── B. entri Desert Trial ── */

const dtEntry = () => {
  const info = env.evalIn('EVENTS_INFO');
  for (const g of info) { const e = (g.items || []).find(x => /Desert Trial/.test(x.n)); if (e) return e; }
  return null;
};

t('entri Desert Trial tidak lagi generik', () => {
  const e = dtEntry();
  ok(e, 'entri Desert Trial hilang');
  ok(!/Tantangan bertahap di gurun/i.test(e.what), 'entri Desert Trial masih teks generik lama');
});

t('Desert Trial: misi Dreadwolf harus INISIASI rally (join tidak dihitung)', () => {
  const e = dtEntry();
  ok(/Dreadwol(f|ves)/i.test(e.what), 'harus menyebut Dreadwolf/Dreadwolves');
  ok(/INISIASI|inisiasi/.test(e.what), 'harus menegaskan rally diinisiasi sendiri');
  ok(/JOIN tidak|join tidak/i.test(e.what), 'harus memperingatkan join tidak dihitung');
});

t('Desert Trial: Clawshard -> Challenger Pouch hanya setelah Diana 5 bintang', () => {
  const e = dtEntry();
  ok(/Clawshard/i.test(e.what) && /Challenger Pouch/i.test(e.what),
     'harus menyebut Clawshard & Challenger Pouch');
  ok(/5★|5 bintang|5-star|5★/.test(e.what), 'harus menyebut syarat Diana 5 bintang');
});

t('Desert Trial: isi pouch tercatat (speedup + Hero XP + gem)', () => {
  const e = dtEntry();
  ok(/General Speedup/i.test(e.what), 'isi pouch: General Speedup');
  ok(/Hero XP/i.test(e.what), 'isi pouch: 1.000 Hero XP');
  ok(/gem/i.test(e.what), 'isi pouch: peluang gem');
});

t('Desert Trial: stamina disebut (beast MAP), bukan disamakan dengan Bear Trap', () => {
  const e = dtEntry();
  ok(/stamina/i.test(e.what), 'harus menyebut biaya stamina');
  ok(!/Bear Trap/i.test(e.what), 'jangan campur dengan Bear Trap (yang TANPA stamina)');
});

t('catatan hero Diana merujuk Desert Trial', () => {
  const src = read('05_8b5b9238.js');
  const line = src.split('\n').find(l => /\{n:'Diana'/.test(l));
  ok(line, 'baris hero Diana tak ditemukan');
  ok(/Desert Trial/.test(line), 'note Diana harus merujuk Desert Trial (hero unggulannya)');
});

done();
