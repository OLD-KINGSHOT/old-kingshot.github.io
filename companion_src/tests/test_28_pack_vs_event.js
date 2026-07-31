/* PACK tidak boleh ditulis sebagai event poin.

   Ini kesalahan yang sudah terjadi EMPAT kali di app ini: Treasure Cove, Truegold
   Wonders, Charm Craftsman, Governor Gear Enhancement — semuanya sempat ditulis
   sebagai event poin lengkap dengan strategi F2P ("tabung Forgehammer, habiskan di
   window"), padahal etalase berbayar yang tak pernah membayar poin. Nasihat seperti
   itu bukan cuma salah, ia menyuruh pemain menahan barang demi sesuatu yang tak akan
   pernah datang.

   Kelimanya ketahuan bukan dari menebak, melainkan dari feed kalender RESMI
   kingshot.net/api/events — sumber yang app ini sendiri konsumsi — yang menandai tiap
   entri dengan type: SPECIAL | COMPETITION | BATTLE | PACK.

   Daftar di bawah adalah snapshot type:PACK dari keempat minggu, ditarik 31 Jul 2026.
   Snapshot dipakai (bukan panggilan jaringan) supaya test tetap jalan offline dan
   deterministik; kalau feed berubah, perbarui daftar ini dan alasannya ikut tercatat.

   CATATAN PENTING: sebuah PACK boleh bernama SAMA dengan event nyata. "Hall of
   Governors" muncul sebagai PACK di feed, padahal HoG memang event poin besar — ia
   digerakkan umur kingdom, bukan rotasi mingguan, jadi tak pernah muncul sebagai
   entri non-PACK. Karena itu HoG dikecualikan secara eksplisit di bawah, dengan
   alasannya, bukan dihapus diam-diam dari daftar. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv({ storage: {
  ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
  ks_p_1_profile: JSON.stringify({ pid: '1', kingdom: '2114', start: '2026-05-27' }),
} });
const ev = env.evalIn;

/* type:PACK di kingshot.net/api/events, minggu 1-4, ditarik 31 Jul 2026 */
const PACK_FEED = [
  'Conqueror', 'Charm Craftsman', 'Custom Arms Set', 'Truegold Wonders',
  'Governor Gear Enhancement', 'Tech Storm', 'World Traveler', 'Wishful Emporium',
  'Enhance Gear', 'Top Governor - Governor Gear', 'Custom Selection', 'Hope Market',
  'Combat Medic', 'Custom Forging Set', 'Governor Stamina', 'Troop Training',
  "Jeweler's Collection",
];
/* Bernama sama dengan PACK, tapi memang event nyata — beserta alasannya. */
const KECUALI = { 'Hall of Governors': 'event umur-kingdom; entri PACK di feed adalah pack pendampingnya' };

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const semuaEntri = () => {
  const out = [];
  ev('EVENTS_INFO').forEach(g => (g.items || []).forEach(e => out.push(e)));
  return out;
};

t('tiap PACK dari feed resmi ditandai berbayar di app, bukan dijual sebagai event poin', () => {
  const app = semuaEntri();
  const gagal = [];
  PACK_FEED.forEach(title => {
    if (KECUALI[title]) return;
    const e = app.find(x => norm(x.n).indexOf(norm(title)) >= 0 || norm(title).indexOf(norm(x.n)) >= 0);
    if (!e) return;                       /* belum terdaftar diuji terpisah di bawah */
    /* HANYA `cat` yang diperiksa, bukan cat+what. Versi pertama test ini memindai
       keduanya dan karena itu LOLOS saat diuji-mutasi: teks penjelasan sudah memuat
       kata "PACK" (mis. "type:PACK di feed"), jadi kategori yang salah pun tersamarkan.
       Kategori adalah yang menentukan bagaimana entri dibaca sekilas. */
    const berbayar = /PACK|berbayar/i.test(e.cat);
    if (!berbayar) gagal.push(title + ' → app: "' + e.n + '" [' + e.cat + ']');
  });
  eq(gagal.length, 0, 'PACK yang masih ditulis sebagai event poin:\n  ' + gagal.join('\n  '));
});

t('PACK berbayar tidak menyuruh menabung barang untuk dihabiskan di sana', () => {
  /* nasihat "tabung X lalu habiskan di window" hanya sah untuk event yang MENSKOR */
  const app = semuaEntri();
  const gagal = [];
  app.forEach(e => {
    if (!/PACK berbayar/i.test(e.cat)) return;
    const w = e.what || '';
    /* "tabung ... untuk window Stand of Arms/Officer Project" boleh — itu mengarahkan
       KELUAR dari pack. Yang dilarang: menabung UNTUK pack ini sendiri. */
    if (/(tabung|hold|habiskan)[^.]{0,60}(di|saat|dalam) (event|window) ini/i.test(w)) gagal.push(e.n);
  });
  eq(gagal.length, 0, 'pack yang menyuruh menabung untuk dirinya sendiri: ' + gagal.join(', '));
});

t('semua PACK dari feed sudah punya entri — supaya tak terbaca sebagai peluang terlewat', () => {
  const app = semuaEntri();
  const hilang = PACK_FEED.filter(title =>
    !app.some(x => norm(x.n).indexOf(norm(title)) >= 0 || norm(title).indexOf(norm(x.n)) >= 0));
  eq(hilang.length, 0, 'PACK tanpa entri di app: ' + hilang.join(', '));
});

t('pengecualian ditulis dengan alasannya, bukan daftar telanjang', () => {
  Object.keys(KECUALI).forEach(k => {
    ok(KECUALI[k] && KECUALI[k].length > 20, k + ' harus punya alasan yang bisa dibaca');
  });
});

done();
