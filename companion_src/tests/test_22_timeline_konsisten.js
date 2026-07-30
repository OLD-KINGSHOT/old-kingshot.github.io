/* Konsistensi timeline lintas halaman: satu aturan, satu sumber.

   Dua bug nyata yang ditemukan lewat audit 30 Jul 2026 — keduanya berakar sama, yaitu
   aritmetika jangkar HoG DISALIN ke tampilan lain alih-alih memanggil hogStartDay():

   1. hogAnchorFit()/hogNoForStart() diam-diam memakai tanggal buka PROFIL AKTIF, padahal
      kingdomsForHogDate() menyuapinya hari yang dihitung dari kingdom LAIN. Akibatnya
      fitur "tanggal ini sebenarnya milik kingdom mana" tak pernah bisa menyebut kingdom
      lain — persis kebalikan dari gunanya. Bukti: 13 Jul 2026 adalah D1 HoG sungguhan
      untuk 2114 (hari 48 = #4) DAN 2184 (hari 33 = #3), keduanya terverifikasi in-game,
      tapi fungsinya cuma pernah menyebut satu.

   2. 02_*.js menghitung tanggal "HoG muncul lagi" dengan rumus lama `6+(no-1)*14`, yang
      sudah digantikan jangkar hari SENIN (commit b84aa3d). Untuk kingdom yang HoG-nya
      tidak mulai hari ke-6 (2184 mulai hari ke-5), jam-atas menyebut 11 Agu sementara
      kalender, tab HoG, dan advisory menyebut 10 Agu. App berselisih dengan dirinya sendiri.

   Aturan yang ditegakkan berkas ini: tanggal jangkar HANYA boleh berasal dari hogStartDay()/
   hogStartUTC(). Kalau nanti modelnya berubah lagi, satu perubahan harus merambat ke semua
   tampilan — dan test terakhir menjaga tak ada yang menyalin rumusnya lagi. */
const fs = require('fs'), path = require('path');
const { createEnv, t, eq, ok, done } = require('./harness.js');

const SRC = path.join(__dirname, '..');
const K = { '2114': '2026-05-27', '2184': '2026-06-11' };   /* Rabu → hari-6 · Kamis → hari-5 */
const envFor = kid => createEnv({ storage: {
  ks_activePid: JSON.stringify('p' + kid), ks_profilesV: '1',
  ['ks_p_p' + kid + '_profile']: JSON.stringify({ pid: 'p' + kid, kingdom: kid, start: K[kid] }),
} });
const iso = (startISO, day) => new Date(Date.parse(startISO + 'T00:00:00Z') + (day - 1) * 86400000).toISOString().slice(0, 10);

console.log('Konsistensi timeline lintas halaman');

t('jangkar tiap kingdom dihitung dari tanggal bukanya sendiri, bukan profil aktif', () => {
  for (const aktif of ['2114', '2184']) {
    const ev = envFor(aktif).evalIn;
    const fit14 = ev('hogAnchorFit')(48, K['2114']);   /* hari 48 di kingdom 2114 = HoG #4 */
    const fit84 = ev('hogAnchorFit')(33, K['2184']);   /* hari 33 di kingdom 2184 = HoG #3 */
    eq(fit14.fits, true, 'profil aktif ' + aktif + ': hari 48 milik 2114 harus cocok');
    eq(fit14.no, 4);
    eq(fit84.fits, true, 'profil aktif ' + aktif + ': hari 33 milik 2184 harus cocok');
    eq(fit84.no, 3);
  }
});

t('kingdomsForHogDate menyebut SEMUA kingdom yang tanggalnya pas', () => {
  for (const aktif of ['2114', '2184']) {
    const hasil = envFor(aktif).evalIn('kingdomsForHogDate')('2026-07-13');
    const kids = hasil.map(h => h.kid + '#' + h.no).sort();
    eq(kids, ['2114#4', '2184#3'],
      'profil aktif ' + aktif + ': 13 Jul = D1 HoG untuk KEDUA kingdom (dua-duanya terverifikasi in-game)');
  }
});

t('tanggal jangkar dari satu sumber: hogStartUTC == hogStartDay', () => {
  for (const kid of ['2114', '2184']) {
    const ev = envFor(kid).evalIn;
    const start = new Date(K[kid] + 'T00:00:00Z');
    for (let no = 1; no <= 5; no++) {
      const lewatUTC = new Date(ev('hogStartUTC')(start, no)).toISOString().slice(0, 10);
      const lewatHari = iso(K[kid], ev('hogStartDay')(no));
      eq(lewatUTC, lewatHari, 'Kingdom ' + kid + ' HoG #' + no + ': dua jalur harus sama');
      eq(new Date(lewatUTC + 'T00:00:00Z').getUTCDay(), 1, 'dan harus jatuh hari Senin');
    }
  }
});

t('kingdom yang HoG-nya tidak mulai hari-6 tetap benar (regresi rumus lama)', () => {
  const ev = envFor('2184').evalIn;
  const start = new Date(K['2184'] + 'T00:00:00Z');
  eq(ev('hogFirstDay')(K['2184']), 5, 'buka Kamis → Senin pertama = hari 5');
  const lamaSalah = new Date(start.getTime() + ((6 + (5 - 1) * 14) - 1) * 86400000).toISOString().slice(0, 10);
  const benar = new Date(ev('hogStartUTC')(start, 5)).toISOString().slice(0, 10);
  eq(lamaSalah, '2026-08-11', 'rumus lama memang meleset ke Selasa');
  eq(benar, '2026-08-10', 'jangkar Senin yang benar');
  ok(lamaSalah !== benar, 'test ini tak ada gunanya kalau kedua rumus kebetulan sama');
});

t('kalender, advisory, dan jam-atas sepakat untuk iterasi yang sama', () => {
  for (const kid of ['2114', '2184']) {
    const ev = envFor(kid).evalIn;
    const start = new Date(K[kid] + 'T00:00:00Z');
    const umur = 3;                                   /* sebelum HoG #1 → kalender meramal #1.. */
    const ramal = ev('predictedEvents')(start, umur).filter(e => e.type === 'hog');
    ok(ramal.length > 0, 'harus ada ramalan HoG untuk server muda');
    for (const r of ramal) {
      eq(r.date, new Date(ev('hogStartUTC')(start, ev('hogNoForStart')(r.day, K[kid]))).toISOString().slice(0, 10),
        'Kingdom ' + kid + ': tanggal ramalan harus sama dengan jangkar');
      eq(r.day, ev('hogStartDay')(ev('hogNoForStart')(r.day, K[kid])), 'hari ramalan = hari jangkar');
    }
  }
});

t('tak ada lagi rumus jangkar yang disalin di berkas mana pun', () => {
  /* Inti audit: satu perubahan model harus merambat ke semua tampilan. Itu hanya mungkin
     kalau tak ada tampilan yang menyimpan rumusnya sendiri. */
  const berkas = fs.readdirSync(SRC).filter(f => /^0\d_.*\.js$/.test(f));
  const salinan = [];
  for (const f of berkas) {
    /* komentar dibuang dulu (baris diganti kosong agar nomor barisnya tetap benar) —
       prosa BOLEH menyebut rumus lama, yang dilarang adalah kode yang memakainya. */
    const isi = fs.readFileSync(path.join(SRC, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
    isi.split('\n').forEach((baris, i) => {
      if (/\bhogStartDay\b|\bhogFirstDay\b/.test(baris)) return;       /* sumber resminya */
      if (/\b6\s*\+\s*\(\s*no\s*-\s*1\s*\)\s*\*\s*14|\(\s*no\s*-\s*1\s*\)\s*\*\s*14/.test(baris))
        salinan.push(f + ':' + (i + 1) + '  ' + baris.trim().slice(0, 90));
    });
  }
  eq(salinan, [], 'rumus jangkar harus dipanggil, bukan disalin');
});

done();
