/* HoG selalu mulai hari SENIN — bukan "hari ke-6".

   Model lama: hogStartDay(no) = 6 + (no-1)*14, tanpa melihat kalender. Itu
   kebetulan benar untuk Kingdom 2114 (buka Rabu 27 Mei → hari-6 = Senin 1 Jun,
   dan HoG#2 = Senin 15 Jun, terverifikasi in-game). Untuk kingdom yang hari-6
   nya BUKAN Senin, seluruh tanggal HoG meleset.

   Bukti pembanding (dicatat pengguna dari game, Kingdom 2184):
     buka Kamis 11 Jun → hari-6 = Selasa 16 Jun menurut model lama,
     padahal HoG-nya mulai Senin 13 Jul.
     Senin pertama setelah buka = 15 Jun (hari-5); 15 Jun +14 = 29 Jun;
     +28 = 13 Jul  ← persis tanggal yang dicatat.

   Aturan yang ditegakkan: HoG #1 = SENIN PERTAMA setelah kingdom buka
   (Hari-1 = tanggal buka), lalu tiap 14 hari. Karena selalu Senin, jaraknya
   otomatis kelipatan 7 — sama seperti Castle Battle yang selalu Sabtu. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv();
const hariPertama = env.evalIn('hogFirstDay');
const mulai = env.evalIn('hogStartDay');
const noUntuk = env.evalIn('hogNoForDay');
const hari = iso => ['Min','Sen','Sel','Rab','Kam','Jum','Sab'][new Date(iso + 'T00:00:00Z').getUTCDay()];
const tanggal = (startISO, day) => new Date(Date.parse(startISO + 'T00:00:00Z') + (day - 1) * 86400000).toISOString().slice(0, 10);

console.log('HoG mulai hari Senin (bukan hari ke-6)');

t('Kingdom 2114 tidak berubah — hari-6 memang Senin (jangkar terverifikasi)', () => {
  eq(hariPertama('2026-05-27'), 6, 'buka Rabu → Senin pertama = hari 6');
  eq(tanggal('2026-05-27', mulai(1, '2026-05-27')), '2026-06-01');
  eq(tanggal('2026-05-27', mulai(2, '2026-05-27')), '2026-06-15', 'HoG#2 = 15 Jun, terverifikasi in-game');
});

t('Kingdom 2184 kini cocok dengan catatan in-game (13 Jul)', () => {
  eq(hariPertama('2026-06-11'), 5, 'buka Kamis → Senin pertama = hari 5 (15 Jun)');
  eq(tanggal('2026-06-11', mulai(1, '2026-06-11')), '2026-06-15');
  eq(tanggal('2026-06-11', mulai(2, '2026-06-11')), '2026-06-29');
  eq(tanggal('2026-06-11', mulai(3, '2026-06-11')), '2026-07-13', 'inilah tanggal yang dicatat pengguna');
});

t('semua iterasi selalu jatuh di hari Senin, apa pun hari bukanya', () => {
  const contoh = ['2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12','2026-06-13','2026-06-14'];
  for (const s of contoh) {
    for (let no = 1; no <= 5; no++) {
      const d = tanggal(s, mulai(no, s));
      eq(hari(d), 'Sen', 'kingdom buka ' + s + ' (' + hari(s) + ') → HoG#' + no + ' = ' + d);
    }
  }
});

t('jarak antar iterasi tetap 14 hari', () => {
  for (const s of ['2026-05-27','2026-06-11','2026-01-04']) {
    for (let no = 2; no <= 5; no++) eq(mulai(no, s) - mulai(no - 1, s), 14, 'siklus 14 hari (' + s + ')');
  }
});

t('kingdom yang buka HARI SENIN tidak mendapat HoG di hari buka', () => {
  const senin = '2026-06-15';
  eq(hari(senin), 'Sen');
  ok(hariPertama(senin) > 1, 'HoG tak boleh jatuh di hari-1');
  eq(hariPertama(senin), 8, 'Senin berikutnya = hari 8');
});

t('penomoran iterasi ikut jangkar baru', () => {
  const s = '2026-06-11';
  eq(noUntuk(4, s), 1, 'sebelum HoG#1 → tetap #1');
  eq(noUntuk(5, s), 1, 'hari 5 = HoG#1 mulai');
  eq(noUntuk(18, s), 1, 'masih dalam siklus #1');
  eq(noUntuk(19, s), 2, 'hari 19 = HoG#2 (15+14 hari)');
  eq(noUntuk(33, s), 3, 'hari 33 = 13 Jul = HoG#3');
});

t('tanpa tanggal buka, perilaku lama (hari 6) dipertahankan', () => {
  eq(hariPertama(null), 6);
  eq(hariPertama(''), 6);
});

done();
