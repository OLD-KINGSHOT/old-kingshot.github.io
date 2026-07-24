/* King's Castle Battle vs KvK (Kingdom of Power) — pemisahan & jadwal.

   Disilang-cek 24 Jul 2026 di dua sumber independen:
   - kingshotmastery.com/guides/kingshot-castle-battle-guide
   - kingshot.net/server-timeline  (+ kingshotdata KvK event)

   Fakta kunci yang ditegakkan test ini:
   1. King's Castle Battle = event INTERNAL (dalam kingdom), pertama ~hari 54,
      siklus BIWEEKLY (~14 hari, Sabtu). Siklus HARUS kelipatan 7 supaya jatuh
      di hari yang sama; 18 (nilai lama) menggeser hari = salah.
   2. KvK (Kingdom of Power) = event ANTAR-kingdom terpisah; eligible ~hari 70,
      siklus ~4 minggu (28 hari). BUKAN sama dengan Castle Battle hari-54.
      Tidak dijamin: tanpa lawan matchmaking → "Matchmaking Bye Rewards". */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv();

console.log('King’s Castle Battle vs KvK');

t('siklus Castle Battle = 14 hari (biweekly), bukan 18', () => {
  const f = env.evalIn('nextCastleDay');
  // umur 60 -> castle berikutnya hari 68 (54+14), bukan 72 (54+18 lama)
  eq(f(60), 68, 'umur 60 harusnya castle berikutnya hari 68');
  eq(f(54), 68, 'pas hari 54 -> berikutnya 68');
  eq(f(70), 82, 'umur 70 -> berikutnya 82');
});

t('hari Castle Battle selalu kelipatan 14 dari 54 (jaga hari Sabtu)', () => {
  const f = env.evalIn('nextCastleDay');
  for (const age of [54, 60, 68, 82, 100, 150]) {
    const d = f(age);
    ok((d - 54) % 14 === 0, `hari castle ${d} (umur ${age}) bukan kelipatan 14 dari 54`);
  }
  ok(14 % 7 === 0, 'siklus harus kelipatan 7 supaya tetap di hari yang sama');
});

t('umur < 54 -> Castle Battle pertama = hari 54', () => {
  const f = env.evalIn('nextCastleDay');
  eq(f(40), 54, 'sebelum hari 54');
  eq(f(null), 54, 'tanpa umur -> default 54');
});

t("milestone King's Castle Battle pertama = hari 54 (2 sumber)", () => {
  const MS = env.evalIn('MILESTONES');
  const row = MS.find(m => /Castle Battle/.test(m.name));
  ok(row, "baris King's Castle hilang");
  eq(row.d, 54, 'first battle ~hari 54 (kingshotmastery + kingshot.net)');
});

t('KvK tetap siklus 28 hari, gate 70 (tak berubah, regresi)', () => {
  const pred = env.evalIn('predictedEvents');
  const daysBetween = env.evalIn('daysBetween');
  const todayMidnight = env.evalIn('todayMidnight');
  const start = new Date('2026-05-27T00:00:00Z');
  const age = daysBetween(start, todayMidnight()) + 1;
  const kvk = pred(start, age).find(e => e.type === 'kvk');
  ok(kvk, 'prediksi KvK ada');
  ok(kvk.day >= 70 && (kvk.day - 70) % 28 === 0, 'KvK gate 70 + siklus 28');
});

t('entri ensiklopedia KvK tidak lagi mengklaim Castle Battle hari-54 sebagai KvK', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '04_0ce30e21.js'), 'utf8');
  // frasa yang menyatukan dua event (sumber kebingungan) harus HILANG dari entri KvK
  ok(!/Castle Battle pertama ~hari 54/.test(src),
     'entri KvK masih menyatukan Castle Battle hari-54 dengan KvK');
  // dan entri KvK harus menjelaskan sifat antar-kingdom + matchmaking bye
  ok(/Matchmaking Bye|antar-kingdom/i.test(src),
     'entri KvK harus menyebut antar-kingdom / Matchmaking Bye');
});

done();
