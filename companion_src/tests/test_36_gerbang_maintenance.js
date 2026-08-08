/* Gerbang maintenance tidak boleh bisa hilang karena rebuild.
 *
 * Ketahuan 9 Agu 2026, sesudah enam rebuild dalam satu sesi: blok gerbang hanya ada
 * di index.html YANG SUDAH TERBIT, sementara companion_repack.js membangun ulang
 * index.html dari cangkang KINGSHOT13.html yang tak pernah memuatnya. Jadi tiap
 * rebuild menghapus gerbang itu diam-diam, dan push berikutnya akan MEMBUKA situs
 * tanpa seorang pun memutuskan begitu.
 *
 * Berkas ini menjadikan kejadian itu mustahil terulang tanpa ketahuan. */
const fs = require('fs'), path = require('path');
const { t, eq, ok, done } = require('./harness.js');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(__dirname, '..');
const gate = fs.readFileSync(path.join(SRC, '_maintenance.html'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

console.log('Gerbang maintenance — sumbernya versi-terkontrol, dan ikut ke hasil build');

t('berkas gerbang ada di sumber, bukan cuma di hasil build', () => {
  ok(gate.length > 500, '_maintenance.html terlalu pendek / hilang');
  ok(/__MAINTENANCE__/.test(gate), 'penanda blokir tak ada di berkas gerbang');
});

t('index.html hasil build MEMUAT gerbang itu', () => {
  ok(/__MAINTENANCE__/.test(index),
     'index.html tanpa gerbang — push akan membuka situs diam-diam, persis bug 9 Agu 2026');
  ok(/GERBANG MAINTENANCE/.test(index), 'komentar penanda gerbang hilang dari hasil build');
});

t('loader menghormati gerbang (bukan cuma memasangnya)', () => {
  ok(/if\s*\(\s*window\.__MAINTENANCE__\s*\)\s*return/.test(index),
     'gerbang dipasang tapi loader tetap jalan — app tetap terbuka');
});

t('sakelarnya eksplisit: membuka situs harus satu baris yang terlihat di git', () => {
  ok(/var TUTUP\s*=\s*(true|false)/.test(gate), 'tak ada sakelar TUTUP yang bisa dibaca manusia');
  const nilai = (gate.match(/var TUTUP\s*=\s*(true|false)/) || [])[1];
  eq(nilai, 'true', 'situs sedang DIBUKA — kalau ini disengaja, perbarui test ini bersama keputusannya');
});

console.log('\nSalinan offline & localhost tidak boleh ikut terblokir');

/* Jalankan logika hostname-nya APA ADANYA, bukan menebak dari teks — dijalankan di
   vm seperti harness repo ini, dengan DOM secukupnya supaya render() tak meledak. */
const vm = require('vm');
const kodeGerbang = gate.replace(/^[\s\S]*?<script>/, '').replace(/<\/script>[\s\S]*$/, '');
function terblokir(hostname) {
  const el = { innerHTML: '', appendChild(){}, addEventListener(){}, style:{} };
  const sandbox = {
    location: { hostname: hostname },
    document: { readyState: 'loading', addEventListener(){}, documentElement: el,
      head: el, body: el, title: '', getElementById(){ return el; },
      querySelector(){ return el; }, createElement(){ return el; } },
    setTimeout(){}, console,
  };
  sandbox.window = sandbox;
  try { vm.runInNewContext(kodeGerbang, sandbox, { timeout: 2000 }); }
  catch (e) { /* render() menyentuh DOM; yang diuji cuma keputusan blokirnya */ }
  return !!sandbox.__MAINTENANCE__;
}

t('file:// (hostname kosong) lolos — salinan offline harus tetap jalan', () => {
  eq(terblokir(''), false);
});

t('localhost & 127.0.0.1 lolos — pengujian lokal tidak boleh terhalang', () => {
  eq(terblokir('localhost'), false);
  eq(terblokir('127.0.0.1'), false);
});

t('jaringan rumah (192.168.x, 10.x) lolos', () => {
  eq(terblokir('192.168.1.7'), false);
  eq(terblokir('10.0.0.5'), false);
});

t('hostname ONLINE diblokir', () => {
  eq(terblokir('old-kingshot.github.io'), true);
  eq(terblokir('example.com'), true);
});

done();
