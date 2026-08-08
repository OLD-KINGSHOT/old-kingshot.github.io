/* "Di bagian event cuma beberapa yang bisa diklik dan menampilkan harus melakukan
 *  apa saja; SG tidak seperti HoG." (pemain, 9 Agu 2026)
 *
 * Diukur terhadap feed nyata: 25 event rotasi non-PACK, dan hanya SATU (Strongest
 * Governor) yang punya rencana per-hari — itupun terkubur di dalam <details> pada
 * sub-tab Ensiklopedia, sementara HoG punya sub-tab sendiri. Delapan event bahkan
 * tak punya entri ensiklopedia sama sekali, jadi tak ada yang bisa dibuka.
 *
 * Yang dikunci berkas ini:
 *   1. SETIAP baris event bisa dibuka dan menjawab "aku harus apa".
 *   2. Yang punya data per-hari TERVERIFIKASI (kvk/sg/hog/armament) menampilkannya,
 *      dengan hari yang sedang berjalan ditandai.
 *   3. Yang TIDAK punya, mengatakannya terus terang. Mengarang jadwal per-hari untuk
 *      24 event lain akan lebih buruk daripada diam — itu justru yang diburu
 *      audit_akurasi selama ini.
 *   4. SG punya sub-tab sendiri, sejajar HoG. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const REF = '2025-12-08T00:00:00.000Z';
const NOW = Date.UTC(2026, 7, 9, 3, 0, 0);
const START = '2026-05-27';
const DAY = 86400000;

const ev = (k, n, ty, s, e2) => ({ titleKey:k, title:n, type:ty, startDay:s, endDay:e2 });
const WEEKS = {
  1: [ev('champagneFair','Champagne Fair','SPECIAL','Monday','Tuesday')],
  2: [ev('strongestGovernor','Strongest Governor','COMPETITION','Monday','Sunday')],
  3: [ev('allianceMobilization','Alliance Mobilization','COMPETITION','Monday','Saturday'),
      ev('kvkMatchmaking','KvK Matchmaking','SPECIAL','Saturday','Sunday')],
  4: [ev('castleBattle','Castle Battle','BATTLE','Saturday','Saturday'),
      ev('armamentCompetition1','Armament Competition 1','COMPETITION','Monday','Tuesday')],
};

function env() {
  const prof = { pid:'1', nick:'A', kingdom:'2114', tc:'25', start:START };
  const e = createEnv({ storage: {
    ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
    ks_profiles: JSON.stringify([prof]),
    ks_p_1_profile: JSON.stringify(prof),
    ks_liveEvents: JSON.stringify({ t: NOW, d: {
      timestamp: new Date(NOW).toISOString(),
      calendar: { cycleReference: REF, currentWeek: 3, currentDay: 'Sunday', events: WEEKS[3] },
      weeks: WEEKS,
    }}),
  }});
  const c = e.evalIn('ksClock'); c.offset = NOW - Date.now(); c.nudge = 0;
  return e;
}
const guide = (e, item) => e.evalIn('evGuideHTML')(item) || '';

console.log('Task 1 — rencana per-hari untuk event yang datanya ADA');

t('SG membuka rencana 7 hari, bukan cuma satu kalimat', () => {
  const html = guide(env(), { id:'sg', title:'Strongest Governor' });
  ['D1','D7'].forEach(d => ok(html.indexOf(d) >= 0, 'hari ' + d + ' tak tampil'));
  ok(/Hero Dev/i.test(html), 'tema harian tak tampil');
  ok(/Tahan/i.test(html), 'daftar item yang harus DITAHAN tak tampil');
});

t('KvK membuka rencana 5 hari', () => {
  const html = guide(env(), { id:'kvk', title:'KvK' });
  ok(/D5/.test(html) && !/D6/.test(html), 'KvK harus 5 hari, bukan 7');
});

t('Armament: satu kalimat fokus milik VARIAN-nya, bukan tabel harian palsu', () => {
  /* days[] template armament berbunyi "Type 1 / Type 2" — itu dua varian event
     (Armament Competition 1 vs 2), bukan dua hari. Merendernya sebagai jadwal
     harian akan menyesatkan; tiap varian hanya boleh menampilkan barisnya sendiri. */
  const e = env();
  const a1 = guide(e, { id:'armamentCompetition1', title:'Armament Competition 1' });
  const a2 = guide(e, { id:'armamentCompetition2', title:'Armament Competition 2' });
  /* Assertion dipersempit ke BARIS FOKUS: daftar "Tahan" memang milik bersama kedua
     varian (Forgehammer ditahan untuk varian 2), jadi kehadirannya di varian 1 benar. */
  const fokus = h => (h.match(/<div class="alert ok small">[\s\S]*?<\/div>/) || [''])[0];
  ok(!/<table/.test(a1), 'varian 1 dirender sebagai tabel harian');
  ok(/Truegold/i.test(fokus(a1)), 'fokus varian 1 (shard + Truegold + gov gear) tak tampil');
  ok(/Forgehammer/i.test(fokus(a2)), 'fokus varian 2 (hero gear) tak tampil');
  ok(!/Forgehammer/i.test(fokus(a1)), 'baris fokus varian 1 memuat fokus milik varian 2');
});

t('hari yang SEDANG berjalan ditandai — bukan tabel datar', () => {
  const e = env();
  /* SG aktif, mulai 2 hari lalu -> hari ke-3 */
  const html = guide(e, { id:'sg', title:'Strongest Governor', active:true, startUTC: NOW - 2*DAY });
  ok(/HARI INI|TODAY/i.test(html), 'tak ada penanda hari berjalan');
  const i = html.indexOf('HARI INI') >= 0 ? html.indexOf('HARI INI') : html.indexOf('TODAY');
  const potongan = html.slice(Math.max(0, i - 400), i);
  ok(/D3/.test(potongan), 'penanda hari berjalan tidak menempel di D3');
});

console.log('\nTask 2 — yang datanya TIDAK ada tidak boleh dikarang');

t('Castle Battle: mengaku belum punya rencana per-hari, tanpa tabel karangan', () => {
  const html = guide(env(), { id:'castleBattle', title:'Castle Battle' });
  ok(!/<table/.test(html), 'tabel per-hari muncul untuk event yang datanya tak ada');
  ok(/belum|tidak ada|belum ada/i.test(html), 'tak ada pengakuan jujur bahwa datanya belum ada');
});

t('event tanpa data tetap memberi yang app PUNYA (panduan singkatnya)', () => {
  const e = env();
  const html = guide(e, { id:'castleBattle', srcKey:'castleBattle', title:'Castle Battle' });
  const g = e.evalIn("WEEKLY_GUIDE['castleBattle']") || '';
  ok(g, 'prasyarat test: WEEKLY_GUIDE castleBattle harus ada');
  ok(html.indexOf(g.slice(0, 25)) >= 0, 'panduan singkat yang sudah dipunya tidak ikut ditampilkan');
});

console.log('\nTask 3 — semua baris bisa dibuka, dan SG sejajar HoG');

t('sub-tab SG ada, sejajar HoG', () => {
  const e = env();
  e.evalIn('renderEvent()');
  const html = e.evalIn("$('[data-tab=event]').innerHTML") || '';
  ok(/data-s="sg"/.test(html), 'tak ada sub-tab SG — SG tetap terkubur di Ensiklopedia');
});

t('panel SG memuat tujuh tema hari + daftar tahan', () => {
  const html = env().evalIn('sgHTML(75)') || '';
  ok(/D1/.test(html) && /D7/.test(html), 'panel SG tak memuat tujuh harinya');
  ok(/Tahan/i.test(html), 'panel SG tak menyebut item yang ditahan');
});

(async () => {
  const e = env();
  await e.evalIn('fillLiveEvents()');
  const html = e.evalIn("$('#evlive').innerHTML") || '';
  const baris = (html.match(/class="check note"/g) || []).length;
  const bisaDibuka = (html.match(/class="evguide"/g) || []).length;
  t('setiap baris event punya panduan yang bisa dibuka', () => {
    ok(baris > 3, 'prasyarat: daftar harus terisi (baris=' + baris + ')');
    eq(bisaDibuka, baris, 'hanya ' + bisaDibuka + ' dari ' + baris + ' baris yang bisa dibuka');
  });
  done();
})();
