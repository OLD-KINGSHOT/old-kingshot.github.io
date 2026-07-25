/* Dukungan SERVER LAIN tanpa jaringan.

   Sebelumnya app cuma menyemai 2 kingdom (2114, 2184). Kingdom lain harus
   ditembak lewat kingshot.net/api/kingdom-tracker — dan di browser itu WAJIB
   lewat proxy karena kingshot.net menolak fetch langsung (CORS). Proxy pertama
   app (worker sendiri) sekarang menjawab 404, jadi lookup jatuh ke proxy publik
   yang lambat/diblokir; ujungnya interpolasi ±2-3 hari. Untuk HoG itu fatal:
   meleset sehari = salah iterasi (hero, ambang, durasi ikut salah).

   Solusinya: tabel tanggal buka 2.341 kingdom ditanam di app (snapshot 26 Jul
   2026, base36 lebar-3 per kingdomId). Test ini menjaga tabel + jalur offline. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

/* fetch SELALU gagal → membuktikan jalur ini tak butuh jaringan sama sekali */
const env = createEnv({ fetch: () => Promise.reject(new Error('offline')) });
const seed = env.evalIn('kingdomOpenSeed');

console.log('Tanggal buka kingdom — tabel tertanam (offline)');

t('kingdom yang sudah diverifikasi in-game tetap sama', () => {
  eq(seed(2114), '2026-05-27', '2114 = jangkar terverifikasi (HoG#2 = H20 = 15 Jun)');
  eq(seed(2184), '2026-06-11', '2184 = openTime 11 Jun 17:45Z → tanggal UTC');
});

t('kingdom lain (yang dulu butuh jaringan) kini terjawab langsung', () => {
  eq(seed(1), '2025-02-24');
  eq(seed(900), '2025-08-26');
  eq(seed(1500), '2026-01-04');
});

t('kingdom yang belum ada saat snapshot = null (bukan tanggal karangan)', () => {
  eq(seed(3000), null);
  eq(seed(99999), null);
});

t('masukan tak wajar tidak bikin error', () => {
  eq(seed(0), null); eq(seed(-5), null); eq(seed('abc'), null);
});

t('tabel utuh: kelipatan 3 & sesuai jumlah kingdom', () => {
  const s = env.evalIn('KO_DAYS');
  ok(s.length % 3 === 0, 'lebar tetap 3 karakter per kingdom');
  const total = s.length / 3;
  ok(total > 2300 && total < 2500, 'jumlah slot wajar (2.341 kingdom + celah), dapat ' + total);
  const kosong = (s.match(/---/g) || []).length;
  ok(kosong < 60, 'celah id yang belum terisi harus sedikit, dapat ' + kosong);
});

/* fetchKingdomDate itu async, sedangkan harness-nya sinkron: kalau fungsi async
   diserahkan ke t(), kegagalannya jadi promise rejection dan test PALSU lulus.
   Jadi hasilnya di-await dulu di luar, baru diperiksa secara sinkron. */
const f = env.evalIn('fetchKingdomDate');
Promise.all([
  f(1500).then(v => ({ v, est: env.ctx.window._kdateEst }), e => ({ err: e.message })),
  f(3000).then(v => ({ v }), e => ({ err: e.message })),
]).then(([a, b]) => {
  t('fetchKingdomDate memakai tabel walau jaringan mati', () => {
    ok(!a.err, 'tak boleh melempar error: ' + a.err);
    eq(a.v, '2026-01-04', 'harus dari tabel, bukan interpolasi/jaringan');
    eq(a.est, false, 'jangan ditandai perkiraan — ini tanggal pasti');
  });
  t('kingdom di luar tabel tetap punya jalan keluar (tak melempar error)', () => {
    ok(!b.err, 'tak boleh melempar error: ' + b.err);
    ok(b.v === null || b.v === '' || /^\d{4}-\d{2}-\d{2}$/.test(b.v),
       'boleh null atau perkiraan, asal bukan error; dapat ' + JSON.stringify(b.v));
  });
  done();
});
