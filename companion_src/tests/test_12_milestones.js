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

t('milestone pet lengkap Gen 1-7', () => {
  for (const g of [1, 2, 3, 4, 5, 6, 7]) {
    const row = MS.find(m => m.cat === 'Pet' && m.name === 'Gen ' + g + ' Pets');
    ok(row, 'tidak ada milestone Gen ' + g + ' Pets');
  }
});

t('milestone pet urut naik menurut generasi', () => {
  const pets = MS.filter(m => m.cat === 'Pet').sort((a, b) => a.d - b.d);
  eq(pets.map(m => m.name).join(','),
     'Gen 1 Pets,Gen 2 Pets,Gen 3 Pets,Gen 4 Pets,Gen 5 Pets,Gen 6 Pets,Gen 7 Pets',
     'urutan generasi pet tidak naik');
});

t('Truegold Lv8 + Tempered Truegold ada dan ditandai penting', () => {
  const row = MS.find(m => /Tempered Truegold/.test(m.name));
  ok(row, 'baris TG8 + Tempered Truegold tidak ada');
  eq(row.d, 310, 'd salah');
  eq(row.key, true, 'harusnya ditandai key');
});

t("Artisan's Vision h170 ada", () => {
  const row = MS.find(m => /Artisan/.test(m.name));
  ok(row, "baris Artisan's Vision tidak ada");
  eq(row.d, 170, 'd salah');
});

t('Gen 2 Heroes masuk recruitment tercatat', () => {
  ok(MS.some(m => /Hero Recruitment/.test(m.name) || /Hero Recruitment/.test(m.note || '')),
     'tidak ada catatan Gen 2 Heroes masuk Hero Recruitment');
});

t('baris baru bersumber tunggal ditandai src:ksg', () => {
  for (const n of ['Gen 3 Pets', 'Gen 4 Pets', 'Gen 5 Pets', 'Gen 6 Pets', 'Gen 7 Pets']) {
    const row = MS.find(m => m.name === n);
    ok(row, 'baris hilang: ' + n);
    eq(row.src, 'ksg', 'src salah untuk ' + n);
  }
});

t('Age of Truegold = hari 70 (kingshotguide, 2 halaman)', () => {
  const row = MS.find(m => m.name === 'Age of Truegold');
  ok(row, 'baris Age of Truegold hilang');
  eq(row.d, 70, 'harusnya 70; 65 adalah titik tengah tebakan tanpa sumber');
  eq(row.id, 'truegold', 'butuh id supaya bisa dirujuk tanpa mencocokkan nama');
});

t('milestoneHari mengembalikan hari dari tabel, bukan angka tertanam', () => {
  const f = env.evalIn('milestoneHari');
  eq(f('truegold'), 70, 'milestoneHari("truegold") salah');
  eq(f('tidak-ada'), null, 'id tak dikenal harus null');
});

/* Tiga tempat di 01_*.js dulu menanam angka 65 dan menyimpang dari tabel ini
   tanpa ada yang sadar — app sempat menampilkan dua tanggal Age of Truegold
   yang berbeda. Test ini menjaga agar tidak kembali begitu. */
t('tidak ada lagi angka 65 tertanam untuk Age of Truegold', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', '01_fa4c6c09.js'), 'utf8');
  ok(!/\b65\s*-\s*age\b/.test(src), 'masih ada "65-age" di 01_fa4c6c09.js');
});

t('fiturTerbuka(0) hanya berisi milestone hari 0', () => {
  const f = env.evalIn('fiturTerbuka');
  const r = f(0);
  eq(r.length, 1, 'jumlah salah');
  eq(r[0].name, 'Gen 1 Heroes', 'isi salah');
});

t('fiturTerbuka(70) memuat Age of Truegold, belum memuat War Academy', () => {
  const f = env.evalIn('fiturTerbuka');
  const nama = f(70).map(m => m.name);
  ok(nama.indexOf('Age of Truegold') >= 0, 'Age of Truegold harusnya sudah terbuka di h70');
  ok(nama.indexOf('War Academy (T11 + Truegold Dust)') < 0, 'War Academy belum terbuka di h70');
});

t('fiturTerbuka(-1) kosong, bukan error', () => {
  const f = env.evalIn('fiturTerbuka');
  eq(f(-1).length, 0, 'umur negatif harusnya kosong');
});

t('fiturTerbuka(9999) memuat seluruh tabel', () => {
  const f = env.evalIn('fiturTerbuka');
  eq(f(9999).length, MS.length, 'harusnya semua baris');
});

done();
