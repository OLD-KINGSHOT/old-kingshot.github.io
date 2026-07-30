/* AUDIT AKURASI — dijalankan terjadwal, bukan saat kebetulan ada yang memeriksa.
 *
 *   node companion_src/tests/audit_akurasi.js
 *   node companion_src/tests/audit_akurasi.js --hari-ini=2026-08-10   (untuk menguji audit itu sendiri)
 *
 * Dua bug terburuk yang pernah ditemukan di repo ini lolos berbulan-bulan karena tak ada
 * yang memeriksa secara rutin:
 *   · jam-atas memakai rumus jangkar lama → tanggal HoG beda sehari dari kalender;
 *   · kode Castle Battle dikoreksi ke 14 hari, tapi TEKS yang dibaca pengguna tetap 18.
 * Keduanya bukan "bug logika" yang bisa ditangkap unit test biasa — keduanya adalah
 * KONTRADIKSI ANTAR-BAGIAN. Itulah yang diburu berkas ini.
 *
 * Aturan mainnya: KONTRADIKSI = gagal (exit 1). KEDALUWARSA = peringatan (exit 0) —
 * fakta game bisa berubah, jadi umur verifikasi dilaporkan, bukan dihakimi. */
const fs = require('fs'), path = require('path');
const { createEnv } = require('./harness.js');

const SRC = path.join(__dirname, '..');
const arg = (process.argv.find(a => a.startsWith('--hari-ini=')) || '').split('=')[1];
const HARI_INI = arg ? new Date(arg + 'T00:00:00Z') : new Date();
const BATAS_BASI_HARI = 90;

const gagal = [], warn = [], oke = [];
const F = (m) => gagal.push(m), W = (m) => warn.push(m), O = (m) => oke.push(m);
const berkasSumber = fs.readdirSync(SRC).filter(f => /^0\d_.*\.js$/.test(f));
const isi = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const tanpaKomentar = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
const envKingdom = startISO => createEnv({ storage: {
  ks_activePid: JSON.stringify('a'), ks_profilesV: '1',
  ks_p_a_profile: JSON.stringify({ pid: 'a', kingdom: '9999', start: startISO }),
} });
const isoHari = (startISO, day) => new Date(Date.parse(startISO + 'T00:00:00Z') + (day - 1) * 86400000).toISOString().slice(0, 10);
const dow = iso => new Date(iso + 'T00:00:00Z').getUTCDay();
/* seminggu penuh hari buka: setiap bug jangkar yang pernah ada hanya muncul di
   sebagian hari buka, jadi memeriksa satu kingdom saja tidak pernah cukup. */
const SEMINGGU = ['2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12','2026-06-13','2026-06-14'];

/* ── 1. Kontradiksi angka: kode bilang X, teks untuk pengguna bilang Y ────────
   Tiap aturan menyebut konsep, nilai yang dipegang KODE, dan pola prosa yang
   bertentangan dengannya. Sengaja eksplisit — audit yang menebak akan berisik,
   dan audit berisik akan diabaikan. */
const KONTRADIKSI = [
  { konsep: 'siklus Castle Battle', kode: 14, pola: /(tiap|every)\s*~?\s*(\d{1,2})\s*(hari|days)/gi,
    hanyaDekat: /castle/i, kecuali: [14] },
  { konsep: 'siklus HoG', kode: 14, pola: /(HoG|Hall of Governors)[^.]{0,60}?(tiap|every)\s*~?\s*(\d{1,2})\s*(hari|days)/gi,
    kecuali: [14] },
];
for (const f of berkasSumber) {
  const teks = tanpaKomentar(isi(f));
  teks.split('\n').forEach((baris, i) => {
    for (const k of KONTRADIKSI) {
      if (k.hanyaDekat && !k.hanyaDekat.test(baris)) continue;
      let m; const re = new RegExp(k.pola.source, k.pola.flags);
      while ((m = re.exec(baris))) {
        const n = Number(m[2] && /^\d+$/.test(m[2]) ? m[2] : m[3]);
        if (!n || k.kecuali.indexOf(n) >= 0) continue;
        F(`${f}:${i + 1} — teks untuk pengguna menulis ${n} hari untuk ${k.konsep}, padahal kode memakai ${k.kode}.\n      ${baris.trim().slice(0, 120)}`);
      }
    }
  });
}
if (!gagal.length) O('tak ada angka di teks pengguna yang bertentangan dengan konstanta kode');

/* ── 2. Rumus jangkar tak boleh disalin ─────────────────────────────────────── */
const SALINAN = [
  { nama: 'jangkar HoG', pola: /\(\s*no\s*-\s*1\s*\)\s*\*\s*14/, sumber: /hogStartDay|hogFirstDay|hogStartUTC/ },
  { nama: 'jangkar Castle', pola: /\b54\s*\+\s*[^;]*\*\s*14/, sumber: /castleFirstDay|nextCastleDay/ },
  { nama: 'siklus SG 28 hari', pola: /\b75\s*\+[^;]*\*\s*28/, sumber: /sgNextOccurrence/ },
];
for (const f of berkasSumber) {
  tanpaKomentar(isi(f)).split('\n').forEach((baris, i) => {
    for (const s of SALINAN) {
      if (s.pola.test(baris) && !s.sumber.test(baris))
        F(`${f}:${i + 1} — ${s.nama} dihitung ulang di sini; panggil fungsi sumbernya.\n      ${baris.trim().slice(0, 120)}`);
    }
  });
}
if (!gagal.length) O('tak ada rumus jangkar yang disalin di luar fungsi sumbernya');

/* ── 3. Kesepakatan lintas-jalur, untuk KETUJUH hari buka ──────────────────── */
let bedaJalur = 0;
for (const s of SEMINGGU) {
  const ev = envKingdom(s).evalIn;
  const start = new Date(s + 'T00:00:00Z');
  for (let no = 1; no <= 5; no++) {
    const a = new Date(ev('hogStartUTC')(start, no)).toISOString().slice(0, 10);
    const b = isoHari(s, ev('hogStartDay')(no));
    if (a !== b) { F(`HoG #${no} kingdom buka ${s}: hogStartUTC=${a} ≠ hogStartDay=${b}`); bedaJalur++; }
    if (dow(a) !== 1) { F(`HoG #${no} kingdom buka ${s}: ${a} bukan hari Senin`); bedaJalur++; }
  }
  const cf = ev('castleFirstDay')();
  if (dow(isoHari(s, cf)) !== 6) { F(`Castle pertama kingdom buka ${s}: ${isoHari(s, cf)} bukan hari Sabtu`); bedaJalur++; }
  if (cf > 54) { F(`Castle pertama kingdom buka ${s}: hari ${cf} melewati batas 54`); bedaJalur++; }
  for (const umur of [cf, cf + 3, cf + 14, cf + 30]) {
    const nd = ev('nextCastleDay')(umur);
    if (dow(isoHari(s, nd)) !== 6) { F(`Castle berikutnya (umur ${umur}, buka ${s}): ${isoHari(s, nd)} bukan Sabtu`); bedaJalur++; }
  }
  for (const umur of [80, 140, 260]) {
    const sg = ev('predictedEvents')(start, umur).filter(e => e.type === 'sg')[0];
    if (!sg) { F(`SG hilang untuk kingdom buka ${s} pada umur ${umur}`); bedaJalur++; continue; }
    if (new Date(sg.date + 'T00:00:00Z').getUTCDate() !== 1) { F(`SG ${sg.date} (buka ${s}, umur ${umur}) bukan awal bulan`); bedaJalur++; }
    if (sg.day < 75) { F(`SG hari ${sg.day} (buka ${s}) melanggar gerbang H75`); bedaJalur++; }
  }
  const hog6 = ev('predictedEvents')(start, 80).filter(e => e.type === 'hog');
  if (hog6.length) { F(`kalender meramalkan HoG setelah #5 untuk kingdom buka ${s}`); bedaJalur++; }
}
if (!bedaJalur) O(`jangkar HoG/Castle/SG sepakat & jatuh di hari yang benar untuk ${SEMINGGU.length} hari buka kingdom`);

/* ── 4. Tiap tabel data besar harus menyebut sumbernya ──────────────────────── */
const ev0 = envKingdom('2026-05-27').evalIn;
const WAJIB_SUMBER = [
  ['HOG_SCORING', /kingshotdata|kingshot-data/i], ['EV_POIN', /kingshotguide/i],
  ['DT_FARM', /fandom|byewiki|kingshotwiki|heaven-guardian/i], ['STAMINA_EVENTS', /evUpcoming/],
];
for (const [nama, polaSumber] of WAJIB_SUMBER) {
  let ada = false; try { ada = ev0('typeof ' + nama) !== 'undefined'; } catch (e) {}
  if (!ada) { F(`tabel ${nama} hilang dari bundel`); continue; }
  const berkas = berkasSumber.find(f => new RegExp('const\\s+' + nama + '\\s*=').test(isi(f)));
  if (!berkas) { F(`tabel ${nama} tak ditemukan di berkas sumber`); continue; }
  const blok = isi(berkas).split(new RegExp('const\\s+' + nama + '\\s*='))[0].slice(-1200);
  if (!polaSumber.test(blok)) W(`tabel ${nama} (${berkas}) tidak menyebut sumber yang dikenali di komentar di atasnya`);
}
O(`${WAJIB_SUMBER.length} tabel data diperiksa keberadaan + sumbernya`);

/* ── 5. Kesegaran verifikasi ────────────────────────────────────────────────── */
const BULAN = { jan:0,feb:1,mar:2,apr:3,mei:4,may:4,jun:5,jul:6,agu:7,aug:7,sep:8,okt:9,oct:9,nov:10,des:11,dec:11 };
const capStamp = /(terverifikasi|diverifikasi|ditarik|silang-cek|riset)[^.\n]{0,80}?(\d{1,2})\s+([A-Za-z]{3})\s+(20\d{2})/gi;
const umurStamp = [];
for (const f of berkasSumber.concat(['tests/README.md'])) {
  const p = path.join(SRC, f); if (!fs.existsSync(p)) continue;
  const teks = fs.readFileSync(p, 'utf8');
  let m; const re = new RegExp(capStamp.source, capStamp.flags);
  while ((m = re.exec(teks))) {
    const bln = BULAN[m[3].toLowerCase()]; if (bln == null) continue;
    const d = new Date(Date.UTC(+m[4], bln, +m[2]));
    umurStamp.push({ f, hari: Math.round((HARI_INI - d) / 86400000), teks: m[0].slice(0, 70) });
  }
}
const basi = umurStamp.filter(s => s.hari > BATAS_BASI_HARI);
basi.forEach(s => W(`verifikasi berumur ${s.hari} hari (>${BATAS_BASI_HARI}) — ${s.f}: "${s.teks}…"`));
if (umurStamp.length) O(`${umurStamp.length} penanda verifikasi terbaca, ${basi.length} lewat ${BATAS_BASI_HARI} hari`);
else W('tak ada satu pun penanda tanggal verifikasi yang terbaca — sulit tahu data mana yang sudah basi');

/* ── laporan ────────────────────────────────────────────────────────────────── */
const tgl = HARI_INI.toISOString().slice(0, 10);

/* Mode --hook: dipanggil SessionStart, jadi keluarannya harus JSON amplop hook.
   Sengaja hanya meringkas — laporan panjang di awal sesi akan dilewati mata.
   TIDAK PERNAH exit bukan-nol: audit yang menghalangi sesi dimulai akan dimatikan
   orang dalam seminggu, dan audit yang dimatikan sama dengan tak ada. */
if (process.argv.includes('--hook')) {
  const ringkas = gagal.length
    ? '⚠ Audit akurasi Kingshot: ' + gagal.length + ' KONTRADIKSI.\n'
      + gagal.slice(0, 6).map(m => '· ' + m.split('\n')[0]).join('\n')
      + (gagal.length > 6 ? '\n· …dan ' + (gagal.length - 6) + ' lagi' : '')
      + '\nRincian: node companion_src/tests/audit_akurasi.js'
    : warn.length
      ? '✓ Audit akurasi bersih (' + oke.length + ' pemeriksaan) · ' + warn.length + ' peringatan kedaluwarsa:\n'
        + warn.map(m => '· ' + m).join('\n')
      : '✓ Audit akurasi bersih — ' + oke.length + ' pemeriksaan lulus, tak ada kontradiksi.';
  process.stdout.write(JSON.stringify({
    systemMessage: ringkas,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'Audit akurasi Kingshot (' + tgl + '): ' + ringkas },
  }));
  process.exit(0);
}

console.log('AUDIT AKURASI · ' + tgl + '\n');
oke.forEach(m => console.log('  ✓ ' + m));
warn.forEach(m => console.log('  ⚠ ' + m));
gagal.forEach(m => console.log('  ✗ ' + m));
console.log('\n' + oke.length + ' lulus · ' + warn.length + ' peringatan · ' + gagal.length + ' kontradiksi');
if (gagal.length) { console.log('\nKONTRADIKSI harus dibereskan: dua bagian app menyatakan hal yang berbeda.'); process.exit(1); }
if (warn.length) console.log('\nPeringatan tidak menggagalkan audit — fakta game boleh berubah, tapi umurnya wajib kelihatan.');
