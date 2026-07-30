/* HoG tidak akurat — akar masalahnya BUKAN jangkarnya.

   Jangkar H6 + siklus 14 sudah TERVERIFIKASI in-game untuk Kingdom 2114
   (lihat komentar seed di 05_*.js: HoG #2 jatuh H20 = 15 Jun, persis in-game).
   Yang rusak adalah cara app memakai jangkar itu:

   A. Entri manual yang SUDAH SELESAI tetap menahan seluruh ramalan tipe itu.
      renderEvent membangun userTypes dari SEMUA entri, jadi satu catatan HoG
      lama = HoG tak pernah diramalkan lagi. Pola yang benar sudah ada di
      activeAdvisories() (03) yang hanya menghitung entri yang masih berjalan.

   B. Tanggal D1 yang dicatat dipetakan dengan pembulatan KE BAWAH
      (hogNoForDay), jadi tanggal yang meleset 1 hari dari jangkar dianggap
      iterasi SEBELUMNYA — hero, ambang, dan durasi ikut salah.

   C. Tidak ada pemeriksaan kingdom. Tanggal 2026-07-13 tidak mungkin jadi D1
      HoG di Kingdom 2184 (jatuh di H33, bukan jangkar), tapi itu PERSIS D1
      HoG #4 Kingdom 2114 (H48). App menelannya diam-diam. Umur tiap kingdom
      beda, jadi tanggal HoG harus dicek terhadap kingdom profil yang aktif. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const K2114 = '2026-05-27';   // seed terverifikasi
const K2184 = '2026-06-11';

function env(kingdom, start) {
  return createEnv({
    storage: {
      ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
      ks_profiles: JSON.stringify([{ pid: '1', nick: 'A', kingdom, tc: '20', start }]),
      ks_p_1_profile: JSON.stringify({ pid: '1', kingdom, tc: '20', start }),
    },
  });
}

console.log('HoG akurat per-kingdom');

const e14 = env('2114', K2114);

/* ── B. pemetaan tanggal D1 → iterasi pakai jangkar TERDEKAT ── */

t('hogNoForStart: H33 (meleset 1 hari) = #3, bukan #2', () => {
  const f = e14.evalIn('hogNoForStart');
  eq(f(33), 3, 'H33 harus menempel ke jangkar terdekat H34 (#3)');
  eq(f(34), 3);
  eq(f(35), 3);
});

t('hogNoForStart: jangkar persis tetap benar', () => {
  const f = e14.evalIn('hogNoForStart');
  eq(f(6), 1); eq(f(20), 2); eq(f(48), 4); eq(f(62), 5);
});

t('hogAnchorFit melaporkan cocok/tidak + selisih harinya', () => {
  const f = e14.evalIn('hogAnchorFit');
  eq(f(34), { no: 3, off: 0, fits: true, beyondCap: false });
  eq(f(33), { no: 3, off: -1, fits: false, beyondCap: false });
  const mid = f(27);                       // tengah siklus: jauh dari jangkar mana pun
  eq(mid.fits, false, 'tanggal tengah siklus tidak boleh dianggap cocok');
  // Jangkar dipindai MELAMPAUI cap #5 supaya HoG nyata di H76 bisa dicatat tanpa dituduh
  // "bukan jangkar kingdom ini" — tapi wajib ditandai beyondCap (lihat test_21).
  eq(f(76), { no: 6, off: 0, fits: true, beyondCap: true });
  eq(f(62).beyondCap, false, '#5 masih di dalam rotasi terdokumentasi');
});

t('hogNoForDay (umur berjalan) TIDAK ikut berubah — tetap pembulatan ke bawah', () => {
  const f = e14.evalIn('hogNoForDay');
  eq(f(33), 2, 'status "iterasi yang sedang/terakhir berjalan" tetap floor');
  eq(f(40), 3);
});

/* ── C. deteksi kingdom dari tanggal HoG ── */

t('kingdomsForHogDate: 13 Jul 2026 = D1 HoG #4 Kingdom 2114', () => {
  const f = e14.evalIn('kingdomsForHogDate');
  const hit = f('2026-07-13');
  ok(hit.some(h => h.kid === '2114' && h.no === 4), 'harusnya terdeteksi 2114 #4');
  ok(!hit.some(h => h.kid === '2184'), '2184 tidak boleh cocok (jatuh di H33)');
});

/* KOREKSI 26 Jul: test ini dulu memakai 13 Jul 2026 sebagai contoh "tak cocok
   untuk Kingdom 2184" — itu mengabadikan model lama yang salah (hari-6). Setelah
   jangkar HoG diperbaiki jadi hari SENIN, 13 Jul justru COCOK untuk 2184 (hari
   33 = HoG#3), persis seperti catatan in-game pengguna. Jadi contohnya diganti
   ke tanggal yang benar-benar meleset: Selasa 14 Jul. */
t('tanggal Senin yang sah untuk kingdom ini TIDAK diperingatkan', () => {
  const e84 = env('2184', K2184);
  const a = e84.evalIn('evAdvisory')({ type: 'hog', date: '2026-07-13' });
  ok(!/tidak cocok|tak cocok/i.test((a.lines || []).join(' ')),
     '13 Jul = hari 33 = jangkar HoG#3 Kingdom 2184 (tercatat in-game)');
});

t('advisory HoG memperingatkan kalau tanggal tak cocok umur kingdom aktif', () => {
  const e84 = env('2184', K2184);
  const a = e84.evalIn('evAdvisory')({ type: 'hog', date: '2026-07-14' });   // Selasa
  const txt = (a.lines || []).join(' ');
  ok(/tidak cocok|tak cocok/i.test(txt), 'harus bilang tanggalnya tidak cocok');
});

t('tanggal yang COCOK tidak memicu peringatan', () => {
  const a = e14.evalIn('evAdvisory')({ type: 'hog', date: '2026-07-13' });
  ok(!/tidak cocok|tak cocok/i.test((a.lines || []).join(' ')),
     'H48 Kingdom 2114 itu jangkar sah — jangan diperingatkan');
});

t('iterasi yang dipakai advisory diambil dari jangkar terdekat', () => {
  const o = e14.evalIn('hogAdvOccurrence')(new Date('2026-07-13T00:00:00Z'), K2114);
  eq(o.no, 4, 'H48 = HoG #4');
  eq(o.len, 7);
  ok(/Hilde/.test(o.hero), 'HoG #4 hero = Hilde');
});

/* ── A. entri selesai tidak boleh menahan ramalan ── */

t('openUserTypes: entri HoG yang sudah lewat TIDAK menahan ramalan', () => {
  const f = e14.evalIn('openUserTypes');
  const s = f([{ type: 'hog', date: '2026-06-01' }]);   // H6, sudah lama selesai
  ok(!s.has('hog'), 'entri lama tak boleh menyumbat ramalan HoG');
});

t('openUserTypes: entri yang masih berjalan/akan datang TETAP menahan', () => {
  const f = e14.evalIn('openUserTypes');
  const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  ok(f([{ type: 'hog', date: soon }]).has('hog'), 'entri mendatang harus menang atas ramalan');
});

/* ── label: HoG deterministik, bukan "estimasi" ── */

t('label sumber: HoG = dihitung dari umur kingdom, KvK = estimasi', () => {
  const f = e14.evalIn('predSourceLabel');
  ok(/dihitung/i.test(f({ type: 'hog', conf: 'tinggi' })), 'HoG harus dilabeli dihitung');
  ok(!/estimasi/i.test(f({ type: 'hog', conf: 'tinggi' })), 'HoG jangan dilabeli estimasi');
  ok(/eligibility/i.test(f({ type: 'kvk', conf: 'sedang', elig: true })), 'KvK tetap eligibility');
  ok(/estimasi/i.test(f({ type: 'sg', conf: 'sedang' })), 'SG tetap estimasi');
});

t('status HoG menyebut kingdom & umur yang dipakai', () => {
  const s = e14.evalIn('hogStatusLine')(61);
  ok(/2114/.test(s), 'status HoG harus menyebut kingdom aktif');
  ok(/61/.test(s), 'status HoG harus menyebut umur yang dipakai');
});

done();
