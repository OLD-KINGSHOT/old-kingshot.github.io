/* Delapan event yang sebelumnya TIDAK punya apa pun untuk dibuka.
 *
 * Diukur 9 Agu 2026: dari 25 event rotasi non-PACK, delapan tak punya entri
 * ensiklopedia sama sekali — mengkliknya tak menuju ke mana pun. Sumbernya dicari
 * ke kingshotwiki.com/events/<slug> (sumber yang sama yang dipakai untuk koreksi
 * Castle Battle & Viking Vengeance sebelumnya), lalu dituliskan sebagai LANGKAH
 * konkret, bukan paragraf.
 *
 * Berkas ini menjaga tiga hal:
 *   1. kedelapan event itu benar-benar punya langkah,
 *   2. angka yang mudah salah tetap seperti di sumbernya,
 *   3. event yang MEMANG belum ada sumbernya tetap mengaku kosong — penambahan ini
 *      tidak boleh jadi pintu masuk untuk mengarang sisanya. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const e = createEnv({ storage: {} });
const L = e.evalIn('EV_LANGKAH');
const guide = item => e.evalIn('evGuideHTML')(item) || '';

const KOSONG_DULU = ['allianceMobilization','castleBattle','kingsCastle','defeatBeasts',
  'eternitysReach','kvkFieldTriage','kvkMatchmaking','vikingsVengeance'];

console.log('Task 1 — kedelapan event punya langkah, lengkap dengan sumbernya');

t('semua delapan event yang tadinya kosong kini punya langkah', () => {
  const hilang = KOSONG_DULU.filter(id => !L[id] || !(L[id].langkah || []).length);
  eq(hilang, [], 'masih kosong');
});

t('tiap entri menyebut sumber DAN tanggal verifikasi (dibaca audit kesegaran)', () => {
  const buruk = Object.keys(L).filter(id => {
    const x = L[id];
    return !x.sumber || !/kingshotwiki|kingshot\.net|kingshotdata/i.test(x.sumber)
      || !/\d{1,2}\s+\w{3}\s+20\d{2}/.test(x.verif || '');
  });
  eq(buruk, [], 'entri tanpa sumber/tanggal yang bisa diperiksa ulang');
});

t('langkah tampil saat baris event dibuka — bukan lagi "belum ada sumbernya"', () => {
  KOSONG_DULU.forEach(id => {
    const html = guide({ id: id, title: id });
    ok(!/belum ada sumbernya/i.test(html), id + ': masih memakai catatan kosong');
    ok(/<li/.test(html), id + ': langkahnya tidak dirender');
  });
});

console.log('\nTask 2 — angka yang mudah salah harus persis seperti sumbernya');

const teks = id => (L[id].langkah || []).join(' | ');

t('Defeat Beasts: beast 1 poin, Terror 3 poin, dan Terror lebih hemat stamina', () => {
  const s = teks('defeatBeasts');
  ok(/1 poin/i.test(s) && /3 poin/i.test(s), 'nilai poin tak disebut');
  ok(/25/.test(s) && /30/.test(s), 'perbandingan stamina 25 (Terror) vs 30 (3 beast) hilang');
});

t('Field Triage: 30% dasar + 10% gem + 50% bantuan = 90%', () => {
  const s = teks('kvkFieldTriage');
  ['30%','10%','50%','90%'].forEach(n => ok(s.indexOf(n) >= 0, 'angka ' + n + ' hilang'));
});

t("Eternity's Reach: Selasa, 30 menit, urutan skill RRLLR, dan ketujuh slot UTC", () => {
  const s = teks('eternitysReach');
  ok(/Selasa/i.test(s), 'harinya tak disebut');
  ok(/RRLLR|R-R-L-L-R/i.test(s), 'urutan skill hilang — itu keputusan terpenting di event ini');
  ['02','05','11','14','16','18','21'].forEach(j => ok(s.indexOf(j) >= 0, 'slot ' + j + ':00 UTC hilang'));
});

t('Viking Vengeance: 20 stage, 7/14/17 online, 10/20 HQ, jangan heal', () => {
  const s = teks('vikingsVengeance');
  ok(/20 stage/i.test(s), 'jumlah stage hilang');
  ['7','14','17','10','20'].forEach(n => ok(s.indexOf(n) >= 0, 'stage ' + n + ' tak disebut'));
  ok(/jangan.{0,20}heal/i.test(s), 'larangan heal di tengah event hilang');
});

t('Castle Battle: menang lewat 2,5 jam kuasai ATAU total waktu terbanyak dalam 5 jam', () => {
  const s = teks('castleBattle');
  ok(/2,5 jam|2\.5 jam/i.test(s), 'ambang 2,5 jam hilang');
  ok(/5 jam/i.test(s), 'durasi 5 jam hilang');
});

t('KvK Matchmaking: reset hero/gear/troop TIDAK menurunkan power matchmaking', () => {
  const s = teks('kvkMatchmaking');
  ok(/tidak menurunkan|tak menurunkan/i.test(s),
     'jebakan terbesarnya hilang — pemain membuang waktu mereset hero');
});

t('baris sumber tidak membocorkan kata Indonesia saat mode EN', () => {
  /* `verif` disimpan sebagai "terverifikasi 9 Agu 2026" karena audit kesegaran
     membaca pola itu dari berkas sumber — tapi yang DIRENDER tak boleh ikut
     berbahasa Indonesia. __TR cocok-persis tak bisa menolong: barisnya disusun. */
  /* Mode EN dikenali lewat window.__getLang — disuntik runtime i18n saat build,
     jadi di harness ia harus distub. Menyetel ks_lang saja tidak cukup: _calcEN()
     membaca fungsi itu, bukan localStorage. */
  const en = createEnv({ storage: {} });
  en.evalIn("window.__getLang=function(){return 'en';}");
  const html = en.evalIn('evGuideHTML')({ id:'defeatBeasts', title:'Defeat Beasts' }) || '';
  ok(!/terverifikasi/i.test(html), 'kata "terverifikasi" bocor ke tampilan Inggris');
  ok(/verified/i.test(html), 'penanda verifikasi hilang sama sekali di mode EN');
});

console.log('\nTask 3 — pagar anti-karangan tetap berdiri');

t('event yang memang belum ada sumbernya tetap mengaku kosong', () => {
  /* Sanctuary Battle: satu-satunya event rotasi yang kingshotwiki TIDAK punya
     halamannya (dicek 9 Agu 2026 terhadap indeks 52 slug event). Selama itu belum
     berubah, ia harus tetap mengaku kosong — penjaga ini yang mencegah "melengkapi
     cakupan" berubah jadi mengarang. */
  ok(!L['sanctuaryBattle'], 'prasyarat: sanctuaryBattle belum boleh punya langkah');
  const html = guide({ id:'sanctuaryBattle', title:'Sanctuary Battle' });
  ok(/belum ada sumbernya/i.test(html), 'pengakuan jujur itu hilang');
  ok(!/<li/.test(html), 'langkah muncul untuk event yang datanya tak ada');
});

done();
