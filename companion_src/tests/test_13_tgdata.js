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

t('labelForOrd/ordForLabel bolak-balik konsisten sepanjang 1..70', () => {
  const labelForOrd = env.evalIn('labelForOrd');
  const ordForLabel = env.evalIn('ordForLabel');
  for (let o = 1; o <= 70; o++)
    eq(ordForLabel(labelForOrd(o)), o, 'putus di ord ' + o + ' (label ' + labelForOrd(o) + ')');
});

t('labelForOrd memetakan batas jalur TG dengan benar', () => {
  const f = env.evalIn('labelForOrd');
  eq(f(30), '30', 'ord 30');
  eq(f(31), '30-1', 'ord 31');
  eq(f(34), '30-4', 'ord 34');
  eq(f(35), 'TG1', 'ord 35 = TG1 (langkah ke-5 band 1)');
  eq(f(36), 'TG1-1', 'ord 36');
  eq(f(40), 'TG2', 'ord 40 = TG2');
  eq(f(70), 'TG8', 'ord 70 = TG8');
});

t('ordForLabel menolak label tak sah', () => {
  const f = env.evalIn('ordForLabel');
  eq(f('TG9'), null, 'TG9 tak ada');
  eq(f('30-5'), null, '30-5 tak ada');
  eq(f('99'), null, 'level 99 tak ada');
  eq(f('TG3-5'), null, 'TG3-5 tak ada');
});

t('label jalur TG di data cocok labelForOrd', () => {
  const f = env.evalIn('labelForOrd');
  for (const [n, rows] of Object.entries(semua))
    for (const r of rows) eq(r.label, f(r.ord), n + ' ord ' + r.ord);
});

done();
