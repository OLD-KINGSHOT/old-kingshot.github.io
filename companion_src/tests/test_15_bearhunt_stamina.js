/* Bear Hunt (Bear Trap) TIDAK memakai stamina — koreksi data.

   Terverifikasi 25 Jul 2026 di 4 sumber (ldshop, kingshotmastery, kingshot.net
   wiki, fandom): rally lawan Raging Bear TIDAK mengonsumsi Governor Stamina.
   Yang pakai stamina = berburu beast LIAR di MAP (Beast Hunting), rebel hunt
   (Cesare's Fury), Pet Adventure. Forgehammer bersumber dari Bear Trap (rally,
   tanpa stamina) — jadi hemat-stamina Diana TIDAK relevan untuk farming
   Forgehammer.

   Dua kesalahan yang ditegakkan test ini agar tidak kembali:
   - entri ensiklopedia Bear Hunt (04) sempat menulis "rally beruang pakai
     stamina" (salah).
   - advisory (03) sempat menyatukan "Diana hemat stamina" dengan "farming
     Forgehammer" (menyesatkan). */
const { createEnv, t, ok, done } = require('./harness.js');
const fs = require('fs'), path = require('path');

createEnv();
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

console.log('Bear Hunt vs stamina');

t('entri Bear Hunt tidak lagi mengklaim rally pakai stamina', () => {
  const src = read('04_0ce30e21.js');
  ok(!/Rally beruang bareng aliansi pakai stamina/.test(src),
     'entri Bear Hunt masih menulis "pakai stamina"');
});

t('entri Bear Hunt menegaskan TANPA stamina', () => {
  const src = read('04_0ce30e21.js');
  // baris entri Bear Hunt harus memuat penegasan tanpa stamina
  const line = src.split('\n').find(l => /'Bear Hunt \(Bear Trap\)'/.test(l));
  ok(line, 'entri Bear Hunt tak ditemukan');
  ok(/TANPA stamina|tanpa stamina/.test(line), 'entri Bear Hunt harus tegaskan TANPA stamina');
});

t('advisory tidak menyatukan hemat-stamina Diana dengan farming Forgehammer', () => {
  const src = read('03_7897e180.js');
  ok(!/Beast Hunt \(hemat stamina\)/.test(src),
     'advisory masih menyatukan Diana-stamina dengan Forgehammer');
});

t('advisory Forgehammer harian menyebut sumbernya Bear Trap tanpa stamina', () => {
  const src = read('03_7897e180.js');
  // baris advisory Forgehammer harus benar: Bear Trap, tanpa stamina
  ok(/Forgehammer[^']*TANPA stamina|Bear Trap[^']*Forgehammer|Bear Hunt[^']*Forgehammer/i.test(src),
     'advisory Forgehammer harus merujuk Bear Trap/Bear Hunt (tanpa stamina)');
});

done();
