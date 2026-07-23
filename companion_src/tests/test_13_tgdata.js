/* Data jalur Truegold (pasca-Lv30) — integritas & silang-cek.

   Dibangkitkan dari kingshotdata.com, disilang-cek per-langkah terhadap
   kingshotguide (s/d TG5) dan total-band terhadap kingshot.net (TG1-8).
   Silang-cek penuh (scratchpad/xcheck_tg.js): 240 baris, 0 rotasi, 0 tak-cocok.

   Model langkah KRITIS: tiap band TG = 5 langkah, baris "TGn" = langkah ke-5
   NYATA (bukan penanda). Bukti: kingshot.net total band = 5× biaya per-langkah.
   Test band-total di bawah menjaga model ini tidak diam-diam berubah jadi 4. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv();
const TC = env.evalIn('TC_TG_LEVELS');
const B = env.evalIn('TC_TG_BUILDINGS');
const TANPA = env.evalIn('TC_TG_TANPA_DATA');

console.log('Data jalur Truegold (pasca-30)');

const semua = { TownCenter: TC, ...B };

t('6 bangunan berjalur-TG ada', () => {
  eq(Object.keys(semua).length, 6, 'jumlah bangunan salah');
  for (const n of ['TownCenter','Embassy','CommandCenter','Barracks','Range','Stable'])
    ok(semua[n], 'hilang: ' + n);
});

t('tiap bangunan 40 baris, ord 31..70 tanpa lubang', () => {
  for (const [n, rows] of Object.entries(semua)) {
    eq(rows.length, 40, n + ': jumlah baris');
    for (let k = 0; k < 40; k++)
      eq(rows[k].ord, 31 + k, n + ': ord bolong di indeks ' + k);
  }
});

t('label konsisten dengan ord (30-1..TG8)', () => {
  const lab = o => { const p = o - 30; if (p <= 4) return '30-' + p;
    const band = Math.floor((p - 1) / 5), step = (p - 1) % 5 + 1;
    return step === 5 ? 'TG' + (band + 1) : 'TG' + band + '-' + step; };
  for (const [n, rows] of Object.entries(semua))
    for (const r of rows) eq(r.label, lab(r.ord), n + ' ord ' + r.ord);
});

t('Tempered Truegold: 0 s/d TG5, > 0 mulai TG5-1 (ord 56)', () => {
  // TG5 milestone = ord 55; Tempered mulai TG5-1 = ord 56 (cocok kingshot.net)
  for (const [n, rows] of Object.entries(semua)) {
    for (const r of rows) {
      if (r.ord <= 55) eq(r.c.tt, 0, n + ' ' + r.label + ': tt harusnya 0');
      else ok(r.c.tt > 0, n + ' ' + r.label + ': tt harusnya > 0');
    }
  }
});

t('setiap baris punya semua jenis sumber daya', () => {
  for (const [n, rows] of Object.entries(semua))
    for (const r of rows)
      for (const k of ['b','w','s','i','t','tt'])
        ok(typeof r.c[k] === 'number', n + ' ' + r.label + ': ' + k + ' bukan angka');
});

t('total band Truegold cocok kingshot.net (TG1-5)', () => {
  const KN = { TownCenter:[660,790,1190,1400,1675], Embassy:[165,195,295,350,415],
    CommandCenter:[130,155,235,280,335], Barracks:[295,355,535,630,750],
    Range:[295,355,535,630,750], Stable:[295,355,535,630,750] };
  for (const [n, rows] of Object.entries(semua)) {
    for (let band = 1; band <= 5; band++) {
      const langkah = rows.filter(r => r.ord > 30 + (band - 1) * 5 && r.ord <= 30 + band * 5);
      eq(langkah.length, 5, n + ' band TG' + band + ': harus 5 langkah');
      const tot = langkah.reduce((a, r) => a + r.c.t, 0);
      eq(tot, KN[n][band - 1], n + ' band TG' + band + ': total TG');
    }
  }
});

t('durasi selalu positif di jalur TG', () => {
  for (const [n, rows] of Object.entries(semua))
    for (const r of rows) ok(r.sec > 0, n + ' ' + r.label + ': durasi <= 0');
});

t('celah tanpa-data-TG dicatat (Infirmary, WarAcademy)', () => {
  ok(TANPA.indexOf('Infirmary') >= 0, 'Infirmary tak tercatat');
  ok(TANPA.indexOf('WarAcademy') >= 0, 'WarAcademy tak tercatat');
});

done();
