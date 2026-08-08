/* Strongest Governor: satu event, tiga permukaan yang dulu menyebut tiga tanggal.
 *
 * Ditemukan 8 Agu 2026 pada profil nyata (Kingdom 2114, buka 27 Mei, H74):
 *   kalender     : H75 = 9 Agu  (model LAMA "H75 + 28 hari", sudah dibantah 30 Jul)
 *   daftar event : 1 Sep, TERKUNCI tanpa tanggal (gerbang dihitung dari umur HARI INI)
 *   feed global  : 24 Agu       (rotasi minggu-2 kingshot.net — data resmi hari itu)
 *
 * Tiga aturan yang dikunci berkas ini:
 *   1. Terkunci = kamu belum layak PADA HARI-H event itu. Kejadian yang jatuh setelah
 *      gerbang harus tampil dengan tanggal, bukan label kunci tanpa angka.
 *   2. SG itu LINTAS-KINGDOM (6 kingdom, satu jendela) — feed global mengalahkan model
 *      umur per-kingdom. Model bulanan tetap ada sebagai cadangan saat feed tak termuat.
 *   3. Kalender memakai sumber yang SAMA. Tidak ada siklus SG per-kingdom di mana pun. */
const fs = require('fs'), path = require('path');
const { createEnv, t, eq, ok, done } = require('./harness.js');

const REF = '2025-12-08T00:00:00.000Z';                 /* Senin, jangkar rotasi 4-minggu */
const NOW = Date.UTC(2026, 7, 8, 9, 0, 0);              /* Sab 8 Agu 2026 = minggu 3 */
const START = '2026-05-27';                             /* Kingdom 2114 — H74 pada NOW */
const DAY = 86400000;
const hariKe = iso => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.parse(START + 'T00:00:00Z')) / DAY) + 1;

const WEEKS = {
  1: [{ titleKey:'champagneFair', title:'Champagne Fair', type:'SPECIAL', startDay:'Monday', endDay:'Tuesday' }],
  2: [{ titleKey:'strongestGovernor', title:'Strongest Governor', type:'COMPETITION', startDay:'Monday', endDay:'Sunday' }],
  3: [{ titleKey:'allianceMobilization', title:'Alliance Mobilization', type:'COMPETITION', startDay:'Monday', endDay:'Saturday' }],
  4: [{ titleKey:'castleBattle', title:'Castle Battle', type:'BATTLE', startDay:'Saturday', endDay:'Saturday' }],
};

function env(opts) {
  opts = opts || {};
  const prof = { pid:'1', nick:'A', kingdom:'2114', tc:'25', start: opts.start === undefined ? START : opts.start };
  const storage = {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([prof]),
    ks_p_1_profile: JSON.stringify(prof),
  };
  if (!opts.noFeed) storage.ks_liveEvents = JSON.stringify({ t: NOW, d: {
    timestamp: new Date(NOW).toISOString(),
    calendar: { cycleReference: REF, currentWeek: 3, currentDay: 'Saturday', events: WEEKS[3] },
    weeks: WEEKS,
  }});
  const e = createEnv({ storage });
  const c = e.evalIn('ksClock'); c.offset = NOW - Date.now(); c.nudge = 0;
  return e;
}
const sgDari = e => (e.evalIn('evUpcoming()') || []).find(x => x && x.id === 'sg');
const isoDari = ms => new Date(ms).toISOString().slice(0, 10);
/* hari-server yang ditandai SG di kalender, dalam rentang [dari,sampai] */
function sgDiKalender(e, dari, sampai) {
  const out = [];
  for (let d = dari; d <= sampai; d++)
    if ((e.evalIn('calEventsOnDay(profileAge().start,' + d + ')') || []).some(x => x && x.type === 'sg')) out.push(d);
  return out;
}
/* hanya hari MULAI (di === 0) — bentuk yang membedakan dua model: model 28-hari
   memulai di H75/H103, model bulanan di H98. Menguji "hari mana saja yang berwarna"
   tak bisa membedakan keduanya begitu jendelanya bertumpang tindih. */
function sgMulaiKalender(e, dari, sampai) {
  const out = [];
  for (let d = dari; d <= sampai; d++)
    if ((e.evalIn('calEventsOnDay(profileAge().start,' + d + ')') || []).some(x => x && x.type === 'sg' && x.di === 0)) out.push(d);
  return out;
}

console.log('Task 1 — gerbang umur dihitung pada HARI-H, bukan hari ini');

t('SG yang jatuh setelah gerbang H75 TIDAK terkunci (H74 hari ini, event H90)', () => {
  const sg = sgDari(env());
  ok(sg, 'SG hilang dari evUpcoming');
  eq(sg.locked, false, 'kingdom sudah H90 saat event mulai — tak ada yang mengunci');
});

t('SG yang tidak terkunci tetap membawa tanggal (bukan label kunci tanpa angka)', () => {
  const sg = sgDari(env());
  ok(sg.startUTC != null, 'startUTC null → UI kehilangan hitung mundur');
  ok(hariKe(isoDari(sg.startUTC)) >= 75, 'tanggalnya harus di atas gerbang H75');
});

t('gerbang tetap mengunci kalau kejadiannya memang di dalam masa terkunci', () => {
  /* Kingdom yang baru buka 20 hari lalu: SG rotasi 24 Agu jatuh di H16 — masih di
     bawah H75, jadi kunci itu JUJUR dan harus tetap ada. */
  const e = env({ start: '2026-08-09' });
  const sg = sgDari(e);
  ok(sg, 'SG hilang untuk kingdom muda');
  eq(sg.locked, true, 'kingdom belum layak pada hari-H → harus terkunci');
  eq(sg.gate && sg.gate.minDay, 75);
});

console.log('\nTask 2 — feed global mengalahkan model umur (SG lintas-kingdom)');

t('SG memakai tanggal feed global, bukan tebakan awal-bulan', () => {
  const sg = sgDari(env());
  eq(isoDari(sg.startUTC), '2026-08-24', 'rotasi minggu-2 berikutnya');
  eq(sg.source, 'live');
  eq(sg.conf, 'live', 'tebakan tak boleh menyamar sebagai data');
});

t('tanpa feed, model bulanan tetap jadi cadangan (awal bulan, bukan diam)', () => {
  const sg = sgDari(env({ noFeed: true }));
  ok(sg, 'tanpa feed SG tak boleh hilang sama sekali');
  eq(isoDari(sg.startUTC), '2026-09-01', 'cadangan = tanggal 1 bulan berikutnya yang layak');
  eq(sg.source, 'age');
  eq(sg.conf, 'inferred', 'cadangan harus mengaku dirinya perkiraan');
});

console.log('\nTask 3 — kalender memakai sumber yang sama');

t('kalender menandai SG di jendela rotasi feed (24-30 Agu), bukan H75', () => {
  const hit = sgDiKalender(env(), 70, 97);     /* Agustus saja */
  eq(hit, [90, 91, 92, 93, 94, 95, 96], 'H90 = 24 Agu, tujuh hari Senin-Minggu');
});

t('kalender TIDAK lagi memulai SG di H75 atau H75+28 (model yang sudah dibantah)', () => {
  const mulai = sgMulaiKalender(env(), 70, 110);
  ok(mulai.indexOf(75) < 0, 'H75 = 9 Agu — sisa model lama');
  ok(mulai.indexOf(103) < 0, 'H103 = 6 Sep — sisa siklus 28 hari');
});

t('bulan yang belum dijawab feed tetap dapat perkiraan bulanan (bukan kosong)', () => {
  /* Feed menempatkan SG di Agustus (24 Agu) tapi tidak di September dalam jangkauannya.
     September kosong akan terbaca "tak ada SG bulan ini" — padahal yang benar
     "belum terjawab", dan model bulanan punya jawaban yang mengaku perkiraan. */
  const mulai = sgMulaiKalender(env(), 97, 127);
  eq(mulai, [98], 'H98 = 1 Sep, perkiraan model bulanan');
});

t('tanpa feed, kalender ikut memakai cadangan bulanan yang sama dgn daftar event', () => {
  const hit = sgDiKalender(env({ noFeed: true }), 70, 110);
  eq(hit[0], 98, 'H98 = 1 Sep, sama dengan sgNextOccurrence');
  eq(hit.length, 7);
});

t('kalender tidak memproyeksikan cadence 28-hari SG berbulan-bulan ke depan', () => {
  /* Rotasi feed berulang tiap 28 hari. Diproyeksikan jauh ke depan ia melahirkan
     kembali cadence 28-hari untuk event yang riset sebut BULANAN — kesalahan yang
     sama dengan model lama, cuma sumbernya beda. Di luar jangkauan feed (28 hari),
     kalender harus kembali ke model bulanan yang mengaku perkiraan. */
  const mulai = sgMulaiKalender(env(), 110, 190);
  ok(mulai.indexOf(118) < 0, 'H118 = 21 Sep — proyeksi 28-hari, bukan data');
  ok(mulai.indexOf(146) < 0, 'H146 = 19 Okt — idem');
  eq(mulai, [128, 159, 189], 'H128/H159/H189 = 1 Okt, 1 Nov, 1 Des — jarak mengikuti BULAN');
});

t('kalender tidak menandai SG sebelum gerbang H75', () => {
  /* Kingdom buka 9 Agu 2026: rotasi 24 Agu = H16, jauh di bawah gerbang. */
  const hit = sgDiKalender(env({ start: '2026-08-09' }), 1, 74);
  eq(hit, [], 'kingdom muda tak ikut SG — jangan janjikan di kalender');
});

console.log('\nTask 4 — tak ada model SG per-kingdom yang boleh hidup lagi');

const SRC = path.join(__dirname, '..');
const berkas = fs.readdirSync(SRC).filter(f => /^0\d_.*\.js$/.test(f));
const tanpaKomentar = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));

t('tak ada siklus SG per-kingdom (75 + n*28) tersisa di sumber', () => {
  const sisa = [];
  berkas.forEach(f => tanpaKomentar(fs.readFileSync(path.join(SRC, f), 'utf8')).split('\n').forEach((b, i) => {
    if (/['"]sg['"][^;]*\b75\b[^;]*\b28\b|\b75\s*\+[^;]*\*\s*28/.test(b) && !/sgNextOccurrence|calSgOnDay/.test(b))
      sisa.push(f + ':' + (i + 1) + ' — ' + b.trim().slice(0, 90));
  }));
  eq(sisa, [], 'model lama hidup lagi di luar fungsi sumbernya');
});

console.log('\nTask 5 — layar first-run tidak boleh memanggil endpoint yang sudah mati');

const src01 = fs.readFileSync(path.join(SRC, '01_fa4c6c09.js'), 'utf8');
const potong = s => {
  const i = s.indexOf('function showOnboard(');
  const j = s.indexOf('\nfunction ', i + 10);
  return s.slice(i, j < 0 ? s.length : j);
};
const badanOnboard = potong(src01);              /* untuk memeriksa TEKS yang dilihat user */
const kodeOnboard = potong(tanpaKomentar(src01)); /* untuk memeriksa yang benar-benar DIJALANKAN
                                                     — komentar boleh (dan harus) menyebut kenapa
                                                     endpoint itu ditinggalkan */

t('showOnboard tidak memanggil ksPlayerLookup (/api/player dihapus Century)', () => {
  ok(kodeOnboard.length > 200, 'showOnboard tak ketemu — test ini jadi palsu');
  ok(!/ksPlayerLookup/.test(kodeOnboard), 'first-run masih menembak endpoint mati → ID apa pun gagal');
});

t('showOnboard meminta Kingdom dan mengambil tanggal buka darinya', () => {
  ok(/ob_kid/.test(kodeOnboard), 'tak ada kolom Kingdom — tanpa itu umur server tak pernah terisi');
  ok(/fetchKingdomDate/.test(kodeOnboard), 'tanggal buka kingdom tidak diambil');
});

t('teks first-run tidak lagi menjanjikan nama/TC terdeteksi otomatis', () => {
  const janji = /TC[^<]{0,40}(terdeteksi otomatis|auto-detected)/i.test(badanOnboard);
  ok(!janji, 'nama & TC tak bisa lagi diambil dari server — jangan menjanjikannya');
});

done();
