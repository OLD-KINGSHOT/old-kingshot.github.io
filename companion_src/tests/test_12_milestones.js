/* Tabel milestone umur server — kelengkapan, jejak sumber, dan konsistensi.

   Silang-cek terhadap kingshotguide.com/database/server-timeline (ditarik
   23 Jul 2026). Lima kelompok baris hanya ada di sana (Gen 3-7 Pets,
   Artisan's Vision h170, TG8+Tempered h310-320); tidak ada sumber kedua yang
   menyediakan timeline umur server — kingshotdata dan kingshot.net sama-sama
   tidak punya, sudah diperiksa. Karena itu `src` wajib ada di setiap baris:
   baris bersumber tunggal tidak boleh tersaji seolah setara dengan baris
   terverifikasi. Disiplin yang sama dengan k:1 di data biaya TC. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv();
const MS = env.evalIn('MILESTONES');

console.log('Milestone umur server');

t('setiap baris punya jejak sumber', () => {
  const tanpa = MS.filter(m => !m.src).map(m => m.name);
  ok(tanpa.length === 0, 'baris tanpa src: ' + tanpa.join(', '));
});

t('src hanya memakai nilai yang dikenal', () => {
  const sah = ['ksg+kita', 'ksg', 'kita'];
  const aneh = MS.filter(m => sah.indexOf(m.src) < 0).map(m => m.name + '=' + m.src);
  ok(aneh.length === 0, 'src tak dikenal: ' + aneh.join(', '));
});

t('rng selalu memuat d', () => {
  const salah = MS.filter(m => m.rng && !(m.rng[0] <= m.d && m.d <= m.rng[1]))
                  .map(m => m.name + ' d=' + m.d + ' rng=' + m.rng.join('-'));
  ok(salah.length === 0, 'rng tidak memuat d: ' + salah.join(', '));
});

t('rng selalu berupa pasangan angka naik', () => {
  const salah = MS.filter(m => m.rng && (m.rng.length !== 2 || m.rng[0] > m.rng[1]))
                  .map(m => m.name);
  ok(salah.length === 0, 'rng cacat: ' + salah.join(', '));
});

t('terurut tidak menurun menurut d (kalender mengandalkan ini)', () => {
  for (let i = 1; i < MS.length; i++)
    ok(MS[i].d >= MS[i - 1].d, `urutan rusak di ${MS[i].name} (${MS[i].d} < ${MS[i - 1].d})`);
});

t('tiga baris hasil verifikasi sendiri tetap ada', () => {
  for (const n of ['Beast Hunting / Hunting Trap', 'Sanctuaries', 'Fortress']) {
    const row = MS.find(m => m.name === n);
    ok(row, 'baris hilang: ' + n);
    eq(row.src, 'kita', 'src salah untuk ' + n);
  }
});

done();
