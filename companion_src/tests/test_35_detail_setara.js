/* "Kenapa SG dan HoG berbeda? SG tidak sedetail HoG." (pemain, 9 Agu 2026)
 *
 * Benar, dan sebabnya bukan datanya tidak ada: EV_POIN.sg SUDAH menyimpan tabel poin
 * 7 stage — tapi ia cuma dipakai diam-diam oleh kalkulator dan tak pernah
 * DITAMPILKAN. HoG menampilkan tabel per-stage-nya (HOG_DETAIL.iters[].stages), SG
 * tidak. Yang hilang tampilan, bukan pengetahuan.
 *
 * Sekalian memeriksa event lain: Officer Project muncul DUA KALI tiap rotasi
 * (Rabu = Type 1, Minggu = Type 2) dan selama ini tanpa satu angka pun. kingshotdata
 * punya nilai per-task-nya.
 *
 * Yang dijaga:
 *   1. SG & KvK menampilkan tabel poinnya, sedalam HoG.
 *   2. Officer Project punya angka per-task, terpisah per tipe, dengan sumbernya.
 *   3. Skala troop TIDAK PERNAH tercampur antar event — nilainya beda jauh, dan
 *      mencampurnya membuat satu event dihitung memakai angka event lain. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const e = createEnv({ storage: {} });
const P = e.evalIn('EV_POIN');
const T = e.evalIn('EV_TUGAS');
const guide = item => e.evalIn('evGuideHTML')(item) || '';

console.log('Task 1 — SG sedalam HoG: tabel poin ikut ditampilkan');

t('panel SG memuat tabel poin per hari, bukan cuma tema harinya', () => {
  const html = e.evalIn('sgHTML(90)') || '';
  ok(/Truegold/i.test(html), 'baris poin (mis. Truegold 2.000) tak tampil di panel SG');
  ok(/40\.000|40,000/.test(html), 'nilai Mithril SG tak tampil');
  const tabel = (html.match(/<table/g) || []).length;
  ok(tabel >= 2, 'panel SG cuma punya ' + tabel + ' tabel — tema hari saja, tanpa tabel poin');
});

t('panel KvK ikut menampilkan tabel poinnya (konsisten, bukan cuma SG)', () => {
  const html = e.evalIn('evPoinTabelHTML("kvk")') || '';
  ok(/Intel Mission/i.test(html), 'baris khas KvK (Intel Mission 6.000) tak tampil');
  ok(/D1/.test(html) && /D5/.test(html), 'kelima harinya tak lengkap');
});

t('tabel poin menyebut sumbernya', () => {
  const html = e.evalIn('evPoinTabelHTML("sg")') || '';
  ok(/kingshotguide|kingshotdata|kingshotwiki/i.test(html), 'tabel poin tampil tanpa sumber');
});

t('nama hari SG sama antara template dan tabel poin (dua tabel, satu kebenaran)', () => {
  /* EVENT_TEMPLATES.sg.days menyebut "D5 Power Boost" sementara EV_POIN.sg (dan
     kingshotdata) menyebut Stage 5 = Basic Skill Up. Panel SG menampilkan KEDUANYA
     bertumpuk, jadi kontradiksinya terlihat langsung oleh pemain. */
  const T = e.evalIn('EVENT_TEMPLATES').sg;
  const nama = s => String(s).replace(/^D\d+\s*/, '').toLowerCase().replace(/s\b/g, '');
  P.sg.stages.forEach((st, i) => {
    const a = nama(st[0]), b = nama(T.days[i]);
    ok(a.indexOf(b.split(' ')[0]) >= 0 || b.indexOf(a.split(' ')[0]) >= 0,
       'D' + (i + 1) + ': tabel poin bilang "' + st[0] + '", template bilang "' + T.days[i] + '"');
  });
});

t('SG D6/D7: 36 poin itu Governor GEAR, bukan Charm (dua barang berbeda)', () => {
  /* kingshotdata memisahkan tegas: "Governor Gear Charm +1" = 70 (D1/D3/D4) dan
     "Governor Gear +1" = 36 (D6/D7). App melabeli yang 36 sebagai Charm, sehingga
     kalkulator inventaris menghitung barang yang salah. KvK sudah benar. */
  [5, 6].forEach(i => {
    const baris = P.sg.stages[i][1].filter(r => r[1] === 36);
    ok(baris.length, 'D' + (i + 1) + ': baris 36 poin hilang');
    baris.forEach(r => ok(/Gear/i.test(r[0]) && !/Charm/i.test(r[0]),
      'D' + (i + 1) + ': "' + r[0] + '" — 36 poin milik Governor Gear, bukan Charm'));
  });
});

t('SG memuat baris lengkap dari kingshotdata: Tempered Truegold, Dust, Master, troop Lv11', () => {
  const semua = JSON.stringify(P.sg.stages);
  ok(/30000/.test(semua), 'Tempered Truegold (30.000) belum ada');
  ok(/1000,/.test(semua), 'Truegold Dust (1.000) belum ada');
  ok(/6000/.test(semua), 'Master Emblem (6.000) belum ada');
  ok(/49/.test(semua), 'troop Lv11 (49) belum ada');
  ok(/kingshotdata/i.test(P.sg.sumber), 'sumber belum menyebut kingshotdata');
});

console.log('\nTask 2 — Officer Project: dua tipe, angka dari sumber');

t('kedua tipe Officer Project ada dan membawa sumber + tanggal verifikasi', () => {
  ['officerProject1','officerProject2'].forEach(id => {
    ok(T[id], id + ' tak ada');
    ok(/kingshotdata/i.test(T[id].sumber || ''), id + ': sumber tak dikenali');
    ok(/\d{1,2}\s+\w{3}\s+20\d{2}/.test(T[id].verif || ''), id + ': tanpa tanggal verifikasi');
  });
});

t('Type 1 (Rabu) — Forgehammer 6.000, Mithril 60.000, Widget 12.000', () => {
  const s = JSON.stringify(T.officerProject1);
  ['6.000','60.000','12.000','70'].forEach(n => ok(s.indexOf(n) >= 0, 'nilai ' + n + ' hilang'));
  ok(/Rabu/i.test(s), 'hari mulai (Rabu) tak disebut — itu yang membedakan tipenya');
});

t('Type 2 (Minggu) — shard Rare 350 / Epic 1.220 / Mythic 3.040', () => {
  const s = JSON.stringify(T.officerProject2);
  ['350','1.220','3.040'].forEach(n => ok(s.indexOf(n) >= 0, 'nilai ' + n + ' hilang'));
  ok(/Minggu/i.test(s), 'hari mulai (Minggu) tak disebut');
});

t('membuka baris Officer Project menampilkan tabel tugasnya', () => {
  const html = guide({ id:'officerProject1', title:'Officer Project 1' });
  ok(/<table/.test(html), 'tabel tugas tak dirender');
  ok(/60\.000/.test(html), 'nilai Mithril tak sampai ke tampilan');
});

t('All Out: skala poin MEMBUNUH troop Lv1-10 = 1,1,2,3,4,5,7,9,11,13', () => {
  const s = JSON.stringify(T.allOut);
  ok(/1 · 1 · 2 · 3 · 4 · 5 · 7 · 9 · 11 · 13/.test(s), 'skala kill tak lengkap/berbeda dari sumber');
  ok(/bertahan|defense|defend/i.test(s), 'poin dari BERTAHAN tak disebut — padahal itu jalan aman untuk F2P');
});

t('Develop New Tech: 1 menit speedup riset = 1 poin, tier akhir 1.170', () => {
  const s = JSON.stringify(T.developNewTech);
  ok(/1\.170/.test(s), 'ambang tier akhir (1.170 poin) hilang');
  ok(/1 menit|per menit/i.test(s), 'kurs 1 menit = 1 poin hilang');
});

t('event yang sumbernya TIDAK punya angka tetap tidak dikarang', () => {
  ['mysticDivination','champagneFair'].forEach(id =>
    ok(!T[id], id + ' dapat tabel poin padahal sumbernya tak memuat angka'));
});

t('fase KvK: langkah khas fase-nya terjangkau lewat srcKey, bukan tertelan alias', () => {
  /* evUpcoming meng-alias kvkMatchmaking/kvkPrepPhase/kvkFieldTriage menjadi SATU
     baris ber-id 'kvk'. Kalau panduan cuma dicari pakai id, langkah khusus fase yang
     sudah ditulis (mis. "reset hero tidak menurunkan power matchmaking") tak akan
     pernah sampai ke pemain. */
  const html = guide({ id:'kvk', srcKey:'kvkMatchmaking', title:'KvK Matchmaking' });
  ok(/tidak menurunkan|tak menurunkan/i.test(html), 'langkah khas Matchmaking tak muncul');
  ok(/<table/.test(html), 'tabel poin KvK ikut hilang — dua-duanya harus tampil');
});

console.log('\nTask 3 — skala troop tak boleh tercampur antar event');

t('Officer Project, KvK, SG, dan HoG memakai skala troop yang BERBEDA', () => {
  const op = JSON.stringify(T.officerProject1.tugas);
  /* OP Lv1-11: 1,2,3,4,6,9,12,17,22,30,37 — beda dari KvK (…60), SG (…39), HoG (…1.960) */
  ok(/37/.test(op), 'nilai troop Lv11 Officer Project (37) hilang');
  const kvkT = JSON.stringify(P.kvk.stages), sgT = JSON.stringify(P.sg.stages);
  ok(kvkT !== sgT, 'tabel KvK dan SG identik — salah satunya pasti disalin');
  const hog = JSON.stringify(e.evalIn('HOG_DETAIL').troop);
  ok(/1\.960|1,960/.test(hog), 'prasyarat: skala HoG memuncak di 1.960');
  ok(!/1\.960|1,960/.test(op), 'skala HoG bocor ke Officer Project');
});

done();
