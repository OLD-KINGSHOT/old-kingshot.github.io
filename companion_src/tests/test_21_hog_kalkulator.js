/* Kalkulator poin HoG + perkiraan farming Desert Trial.

   Yang dijaga berkas ini:
   1. HOG_SCORING (angka mesin) TIDAK BOLEH menyimpang dari _HT (angka tampilan). Keduanya
      sengaja ditulis dua kali — angka mesin tak di-parse dari string tampilan, karena parser
      yang diam-diam gagal lebih berbahaya daripada duplikasi yang dijaga test.
   2. Alokasi barang ke stage: Power ke stage 45 (bukan 30), seri → stage paling awal,
      dan barang yang task-nya tak ada di iterasi itu HARUS dilaporkan, bukan hilang.
   3. Nilai harapan pouch Desert Trial = 30 gem, cocok dengan catatan lama app
      ("rata-rata ~30 gem/pouch") — validasi silang model terhadap data yang sudah dipercaya.
   4. Pesan pasca-HoG #5 tak lagi beralasan "Gen 3" (generasi hero ke-3 baru hari ~105-120),
      jangkar bisa menafsirkan H76 sebagai #6 (beyondCap) TAPI kalender tetap tak meramalkannya.

   Satuan terverifikasi silang dua sumber (kingshotdata.com + kingshot-data.com, Jul 2026):
   power PER 1 POWER, charm/gear PER 1 POIN MAX SCORE, troop PER 1 TROOP. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

/* Profil disimpan per-pid (PROFILE_KEYS → ks_p_<pid>_profile); seed ks_profile global
   TIDAK akan terbaca. Ini pola yang sama dipakai test_08/test_20. */
const PID = '330300846', PID2 = '343522603';
const env = createEnv({ storage: {
  ks_activePid: JSON.stringify(PID),
  ks_profilesV: '1',
  ['ks_p_' + PID + '_profile']: JSON.stringify({ pid: PID, kingdom: '2114', start: '2026-05-27' }),
  ['ks_p_' + PID2 + '_profile']: JSON.stringify({ pid: PID2, kingdom: '2184', start: '2026-06-11' }),
} });
const ev = env.evalIn;
const HOG_SCORING = ev('HOG_SCORING'), _HT = ev('_HT'), HOG_DETAIL = ev('HOG_DETAIL');
const plan = ev('hogPlanScore'), stageScore = ev('hogStageScore'), roi = ev('hogRoi');
const gapEquiv = ev('hogGapEquiv'), farm = ev('dtFarmEstimate'), idxForNo = ev('hogIdxForNo');
const I45 = idxForNo(5);                 /* iterasi #4 & #5 — susunan 7 stage */
const stageOf = (r, nama) => r.stages.find(s => s.nama === nama);
const angka = s => parseInt(String(s).replace(/[^\d]/g, ''), 10);

console.log('Kalkulator poin HoG + farming Desert Trial');

t('HOG_SCORING tidak menyimpang dari _HT (setiap kunci)', () => {
  for (const k of Object.keys(HOG_SCORING)) {
    ok(_HT[k], 'kunci ' + k + ' harus ada di _HT juga');
    const teks = _HT[k][1];
    if (Array.isArray(HOG_SCORING[k].pts)) {
      const ujung = String(teks).split('→').map(angka);
      eq(HOG_SCORING[k].pts[0], ujung[0], k + ' poin level terendah');
      eq(HOG_SCORING[k].pts[HOG_SCORING[k].pts.length - 1], ujung[1], k + ' poin level tertinggi');
      eq(HOG_SCORING[k].pts.length, 10, 'troop harus 10 level');
    } else {
      eq(HOG_SCORING[k].pts, angka(teks), 'poin ' + k + ' (' + _HT[k][0] + ')');
    }
  }
  eq(Object.keys(HOG_SCORING).length, Object.keys(_HT).length, 'jumlah task sama di kedua tabel');
});

t('Power Research masuk stage 45, bukan stage 30', () => {
  const r = plan({ powR: 1000 }, I45);
  eq(stageOf(r, '4 · Charm Upgrade').pts, 45000, '1.000 power × 45 di stage Charm (ada task Research 45)');
  eq(stageOf(r, '1 · Power Boost').pts, 0, 'tidak ditaruh di stage 30');
  eq(stageOf(r, '5 · Power Boost').pts, 0);
  eq(r.total, 45000);
});

t('poin sama di dua stage → stage paling awal, alternatif dilaporkan', () => {
  const r = plan({ powC: 1000 }, I45);   /* pbC=30 ada di stage 1 dan stage 5 */
  eq(stageOf(r, '1 · Power Boost').pts, 30000, 'seri → stage paling awal (deterministik)');
  eq(stageOf(r, '5 · Power Boost').pts, 0);
  const alt = r.alternatif.find(a => /Construction/.test(a.lbl));
  ok(alt, 'harus melaporkan bahwa stage lain juga bisa');
  eq(alt.jugaBisa, ['5 · Power Boost']);
});

t('campuran troop dijumlah per level', () => {
  const r = plan({ troops: { 6: 900, 10: 10 } }, I45);
  eq(stageOf(r, '3 · Train Troops').pts, 900 * 595 + 10 * 1960, '900 T6 + 10 T10');
  eq(r.total, 555100);
});

t('barang yang task-nya tak ada di iterasi ini DILAPORKAN, bukan hilang', () => {
  const r = plan({ terror: 3, beast: 10, gxp: 5, wid: 1 }, I45);
  const sebab = r.takTerpakai.map(x => x.lbl).join(' | ');
  ok(/Terror/.test(sebab), 'Rally Terror hanya ada di HoG #1 → harus dilaporkan');
  ok(/Beast/.test(sebab), 'Beast hanya ada di HoG #1');
  ok(/Enhancement XP/.test(sebab), 'Enhancement XP hanya ada di HoG #2');
  eq(r.total, 100000, 'yang terpakai hanya Widget = 100.000');
  /* Di HoG #1 ketiganya sebaliknya: Terror & Beast terpakai. */
  const r1 = plan({ terror: 3, beast: 10 }, idxForNo(1));
  eq(stageOf(r1, '4 · Beast Slay').pts, 3 * 90000 + 10 * 30000);
});

t('charm & gear dihitung per POIN MAX SCORE, bukan per level', () => {
  const r = plan({ chr: 8750, ggr: 3000 }, I45);
  eq(stageOf(r, '4 · Charm Upgrade').pts, 8750 * 1000, 'charm: 1.000 poin per 1 score');
  eq(stageOf(r, '6 · Governor Gear').pts, 3000 * 500, 'gear: 500 poin per 1 score');
});

t('input kosong/negatif/omong-kosong → 0, tak pernah NaN', () => {
  for (const g of [{}, { spin: '' }, { spin: -5 }, { spin: 'abc' }, { chr: null }, null]) {
    const r = plan(g, I45);
    eq(r.total, 0, 'gudang ' + JSON.stringify(g));
    ok(!isNaN(r.total));
  }
  const r = plan({ spin: '2' }, I45);
  eq(r.total, 180000, 'string angka tetap dihitung');
});

t('subtotal per stage (mode timpaan manual)', () => {
  const s = stageScore({ roul: 2, sM: 1, sE: 2 }, '2 · Hero Development', I45);
  eq(s.pts, 2 * 90000 + 35000 + 2 * 14000);
  const kosong = stageScore({ roul: 5 }, '6 · Governor Gear', I45);
  eq(kosong.pts, 0, 'task yang bukan milik stage itu tidak dihitung');
});

t('tabel ROI urut turun dan memuat semua level troop', () => {
  const rows = roi();
  for (let i = 1; i < rows.length; i++) ok(rows[i - 1].pts >= rows[i].pts, 'harus urut turun');
  eq(rows[0].pts, 100000, 'tertinggi = Widget 100.000');
  eq(rows.filter(r => r.key === 'troop').length, 10);
});

t('sisa poin diterjemahkan ke tiap tuas yang ADA di iterasi itu', () => {
  const g = gapEquiv(500000, I45);
  eq(g.gap, 500000);
  const spin = g.setara.find(s => /Roulette/.test(s.lbl));
  eq(spin.butuh, 6, 'ceil(500.000 / 90.000)');
  const charm = g.setara.find(s => /Charm/.test(s.lbl));
  eq(charm.butuh, 500, '500 poin max score charm');
  ok(!g.setara.some(s => /Terror/.test(s.lbl)), 'jangan sarankan Terror di HoG #5 — tak ada task-nya');
  eq(gapEquiv(0, I45).setara.length, 0, 'tak ada sisa → tak ada saran');
});

/* KOREKSI 31 Jul 2026: ongkos hunt DASAR adalah 10, bukan 8. Angka 8 yang dulu dipakai
   sebagai dasar ternyata sudah termasuk diskon Diana (10x0,8), lalu app memotong Diana
   lagi di atasnya -> 6,4. Bukti internal: rally tercatat 25 -> 20 dengan Diana, dan
   20 = 25x0,8; pola yang sama menuntut 10 -> 8. Dikuatkan tabel kingshothandbook
   (solo march 10, rally 25, join gratis). */
t('Desert Trial: 100 stamina tanpa Diana', () => {
  const f = farm(100, {});
  eq(f.perHunt, 10, 'ongkos DASAR, belum didiskon Diana');
  eq(f.hunts, 10, '100 / 10');
  eq(f.claw, 5, '50% dari 10');
  eq(f.pouch, 5, '50% dari 10');
  eq(f.gemPerPouch, 30, 'harapan gem = 0,20×100 + 0,50×20 — cocok catatan lama app');
  eq(f.gem, 150, '5 pouch × 30');
  eq(f.speedupMnt, 37.5, '5 pouch × rata-rata 7,5 mnt');
  eq(f.heroXp, 5000);
  ok(Math.abs(f.staminaBalik - 0.75) < 1e-9, '15% × 5 pouch');
});

t('Diana memotong stamina hunt 20% dan rally 25→20', () => {
  const f = farm(100, { diana: true });
  eq(f.perHunt, 8, '10 × 0,8 — inilah angka 8 yang dulu keliru dipakai sebagai DASAR');
  eq(f.hunts, 12, 'floor(100 / 8) — 2 hunt lebih banyak daripada tanpa Diana');
  const r = farm(100, { diana: true, rally: 2 });
  eq(r.perRally, 20, '25 × 0,8');
  eq(r.rally, 2);
  eq(r.staminaRally, 40);
  eq(r.hunts, 7, 'sisa 60 stamina / 8');
  eq(r.dianaShard, [4, 8], '2 rally × 2-4 shard');
});

t('rally dibatasi stamina yang benar-benar ada', () => {
  const f = farm(30, { rally: 5 });
  eq(f.rally, 1, '30 stamina hanya cukup 1 rally 25');
  eq(f.hunts, 0, 'sisa 5 stamina < 10 per hunt');
});

t('stamina jadi poin HoG hanya kalau stage Beast Slay aktif', () => {
  eq(farm(100, { beastPts: true }).hogBeastPts, 10 * 30000, '10 hunt × 30.000 (HoG #1)');
  eq(farm(100, {}).hogBeastPts, 0, 'tanpa stage Beast Slay: 0');
});

t('rencana tersimpan per profil DAN per iterasi (tak bocor antar akun/server)', () => {
  const get = ev('hogPlanGet'), set = ev('hogPlanSet');
  set(5, { gudang: { spin: 2 }, timpaan: {}, aktual: {}, ambang: [] });
  eq(get(5).gudang.spin, 2);
  eq(get(4).gudang.spin, undefined, 'iterasi lain tidak ikut terisi');
  ok(env.storage.has('ks_p_' + PID + '_hogPlan'), 'harus tersimpan di slot per-profil, bukan kunci global');
  ok(!env.storage.has('ks_hogPlan'), 'jangan ada kunci global yang bocor lintas akun');
  env.localStorage.setItem('ks_activePid', JSON.stringify(PID2));   /* pindah akun/server */
  eq(get(5).gudang.spin, undefined, 'akun lain tidak melihat rencana akun pertama');
  set(5, { gudang: { spin: 9 }, timpaan: {}, aktual: {}, ambang: [] });
  env.localStorage.setItem('ks_activePid', JSON.stringify(PID));
  eq(get(5).gudang.spin, 2, 'kembali ke akun asal → rencananya utuh, tidak tertimpa');
});

t('pasca-#5: alasan diperbaiki, jangkar menafsirkan, kalender tetap tak meramal', () => {
  const status = ev('hogStatusLine')(69);
  ok(!/Gen 3/.test(status), 'jangan lagi beralasan "Gen 3" — itu hari ~105-120');
  ok(/KvK/.test(status) && /Strongest Governor/.test(status), 'sebut rotasi yang menggantikannya');
  const fit = ev('hogAnchorFit')(76);
  eq(fit.no, 6); eq(fit.fits, true, 'H76 memang duduk di jangkar 14-hari');
  eq(fit.beyondCap, true, 'tapi di luar #1-#5 → ditandai, bukan dianggap normal');
  eq(ev('hogAnchorFit')(62).beyondCap, false, '#5 masih di dalam cap');
  const pe = ev('predictedEvents')(new Date('2026-05-27T00:00:00Z'), 69);
  eq(pe.filter(e => e.type === 'hog').length, 0, 'tak ada HoG #6 karangan di kalender');
});

/* ── Render: tiga mode + kartu farming harus jadi HTML tanpa meledak, dan angka yang
   dipakai UI harus angka yang sama dari mesin (bukan hitungan kedua di lapisan tampilan). */
t('kartu kalkulator ikut terpasang di sub-tab HoG', () => {
  const h = ev('hogHTML')(65);
  ok(/Kalkulator Poin/.test(h), 'kartu kalkulator harus ada di hogHTML');
  ok(/hogcalc/.test(h), 'wadah body kalkulator harus ada');
  ok(/Poin per satuan/.test(h), 'tabel ROI harus ikut');
});

t('tiga mode kalkulator ter-render', () => {
  const body = ev('hogCalcBody');
  for (const m of ['gudang', 'stage', 'lacak']) {
    ev("_hcMode='" + m + "'");
    const b = body(I45);
    ok(b.length > 500, 'mode ' + m + ' menghasilkan HTML');
    ok(!/undefined|NaN/.test(b), 'mode ' + m + ' tidak boleh memuat undefined/NaN');
  }
  ev("_hcMode='gudang'");
});

t('angka di UI = angka dari mesin', () => {
  const set = ev('hogPlanSet');
  set(ev('hogCalcKey')(I45), { gudang: { spin: 2, troops: { 10: 5 } }, timpaan: {}, aktual: {}, ambang: [], target: 500000 });
  const out = ev('hogCalcOut')(I45, ev('hogPlanGet')(ev('hogCalcKey')(I45)));
  const total = 2 * 90000 + 5 * 1960;
  ok(out.indexOf(total.toLocaleString('id-ID')) >= 0, 'total ' + total + ' harus tampil apa adanya');
  ok(/Kurang/.test(out), 'sisa menuju target harus disebut');
  ok(!/termurah/.test(out) || /tidak ada di data terverifikasi/.test(out), 'jangan mengaku tahu yang termurah tanpa data harga');
});

t('kartu farming stamina ter-render dan angkanya cocok dengan mesin', () => {
  const html = ev('dtFarmHTML')();
  ok(/Desert Trial/.test(html));
  const out = ev('dtFarmOut')({ stamina: 100, diana: true, rally: 2 });
  const f = farm(100, { diana: true, rally: 2 });
  ok(out.indexOf(Math.round(f.gem).toLocaleString('id-ID')) >= 0, 'gem ' + Math.round(f.gem) + ' harus tampil');
  ok(/4-8 shard Diana/.test(out), '2 rally → 4-8 shard');
  ok(!/undefined|NaN/.test(out));
  eq(ev('dtFarmOut')({}).indexOf('Isi stamina') >= 0, true, 'tanpa input: minta isi, jangan tampilkan nol-nol');
});

/* ── Deteksi otomatis: stamina hari ini terbayar ke event apa saja.
   Sumber status HARUS evUpcoming() — daftar aktif yang sama dipakai tab Sekarang. Kalau
   deteksi ini punya daftar sendiri, ia akan menyimpang persis seperti bug jangkar jam-atas
   yang dijaga test_22. Umur dibuat relatif terhadap jam app supaya test tak basi. */
const envUmur = (umur, geserHari = 0) => {
  const bootstrap = createEnv({ storage: { ks_activePid: JSON.stringify('x'), ks_profilesV: '1' } });
  const geser = geserHari * 86400000;
  const hariIni = bootstrap.evalIn('ksClock').now().getTime() + geser;
  const start = new Date(hariIni - (umur - 1) * 86400000).toISOString().slice(0, 10);
  const en = createEnv({ storage: {
    ks_activePid: JSON.stringify('x'), ks_profilesV: '1',
    ks_p_x_profile: JSON.stringify({ pid: 'x', kingdom: '2114', start }),
  } });
  en.evalIn('ksClock').offset = geser;
  return en;
};

/* Umur TIDAK boleh dipatok. Jangkar HoG jatuh di hari SENIN (lihat b84aa3d), jadi stage
   yang berjalan hari ini ditentukan HARI DALAM MINGGU, bukan umur: Beast Slay (stage 4
   HoG #1) selalu jatuh KAMIS. Dulu test ini memakai "hari 9" dengan tanggal-buka yang
   diturunkan dari jam app — itu hanya benar kalau kingdom kebetulan buka Rabu, jadi ia
   lulus 1 hari dalam seminggu dan gagal 6 hari sisanya. Sekarang jam app digeser sampai
   stage yang dicari benar-benar berjalan. */
const envStage = cocok => {
  for (let geser = 0; geser < 7; geser++) {
    for (let umur = 2; umur <= 20; umur++) {
      const en = envUmur(umur, geser);
      const st = en.evalIn('hogStageNow')(umur);
      if (cocok(st)) return { e: en.evalIn, umur, geser, st };
    }
  }
  throw new Error('tak ada kombinasi hari/umur yang memenuhi syarat stage');
};

t('poin beast HoG hanya dihitung saat stage Beast Slay benar-benar berjalan', () => {
  const { e, umur, st } = envStage(s => s && s.base === 'Beast Slay');
  eq(st.base, 'Beast Slay', 'umur ' + umur + ' = stage Beast Slay (HoG #' + st.no + ')');
  const P = e('staminaPlan')(80, {});
  const hog = P.baris.find(b => /Beast Slay/.test(b.nama));
  eq(hog.aktif, true, 'stage-nya cocok → harus terdeteksi');
  eq(hog.poin, 8 * 30000, '80 stamina / 10 = 8 hunt × 30.000');
});

t('stage HoG yang salah → tidak dihitung, DAN alasannya disebut', () => {
  /* stage lain yang sedang berjalan — bukan "HoG mati", supaya yang diuji tetap
     "stage-nya salah", persis kasus yang dulu diam-diam menghitung poin. */
  const { e, umur } = envStage(s => s && s.base !== 'Beast Slay');
  const P = e('staminaPlan')(80, {});
  const hog = P.baris.find(b => /Beast Slay/.test(b.nama));
  eq(hog.aktif, false, 'umur ' + umur + ' bukan Beast Slay → tidak boleh dihitung');
  ok(hog.sebab.length > 0, 'app harus bilang KENAPA, bukan diam-diam menampilkan nol');
  eq(hog.poin, 0);
});

t('status event diambil dari evUpcoming, bukan daftar kedua', () => {
  const e = envUmur(9).evalIn;
  const aktifIds = new Set((e('evUpcoming')() || []).filter(x => x.active && !x.locked).map(x => x.id));
  for (const r of e('staminaEventsNow')()) {
    if (r.ev.stage) continue;                        /* HoG punya syarat stage tambahan */
    eq(r.aktif, aktifIds.has(r.ev.id), r.ev.nama + ' harus mengikuti daftar aktif bersama');
  }
});

t('event yang tak terukur dilaporkan apa adanya, tidak dikarang poinnya', () => {
  const e = envUmur(9).evalIn;
  const P = e('staminaPlan')(80, {});
  for (const b of P.baris) {
    if (b.takTerukur) eq(b.poin, 0, b.nama + ': tanpa angka terverifikasi, jangan mengarang poin');
    ok(!isNaN(b.poin));
  }
  ok(P.baris.some(b => /Defeat Nearby Beasts/.test(b.nama)), 'daftarnya harus memuat event pemakan stamina lain');
});

/* ── Tabel poin KvK & Strongest Governor (kingshotguide.org, 30 Jul 2026) ──
   Bahaya terbesar di sini adalah menyatukan tabel: skala KvK/SG jauh berbeda dari HoG
   (troop 1-60 vs 90-1.960; charm 36-70 vs 1.000). Test di bawah menjaga keduanya terpisah
   dan menjaga angka kunci yang terverifikasi. */
const EV_POIN = ev('EV_POIN');

t('struktur EV_POIN waras: tiap baris [label, poin>0, satuan]', () => {
  eq(Object.keys(EV_POIN).sort(), ['kvk', 'sg']);
  eq(EV_POIN.kvk.stages.length, 5, 'KvK: hanya fase Preparation 5 hari yang berpoin');
  eq(EV_POIN.sg.stages.length, 7, 'SG: 7 hari');
  for (const k of ['kvk', 'sg']) {
    ok(EV_POIN[k].sumber, k + ' harus menyebut sumbernya');
    for (const [nama, rows] of EV_POIN[k].stages) {
      ok(nama && rows.length, k + ' stage ' + nama + ' tak boleh kosong');
      for (const r of rows) {
        eq(typeof r[0], 'string'); ok(r[1] > 0, k + '/' + nama + ': ' + r[0] + ' poin harus > 0');
        eq(typeof r[2], 'string', 'satuan wajib ada supaya UI tak menebak');
      }
    }
  }
});

t('angka kunci yang terverifikasi tidak boleh bergeser', () => {
  const cari = (k, si, frag) => (EV_POIN[k].stages[si][1].find(r => r[0].includes(frag)) || [])[1];
  eq(cari('sg', 1, 'Mithril'), 40000, 'SG D2 Mithril');
  eq(cari('sg', 1, 'Roulette'), 8000, 'SG D2 Hero Roulette');
  eq(cari('sg', 1, 'Mythic'), 3040, 'SG D2 Mythic shard');
  eq(cari('kvk', 0, 'Intel'), 6000, 'KvK D1 Intel Mission');
  eq(cari('kvk', 0, 'Truegold'), 2000, 'KvK D1 Truegold');
  eq(cari('kvk', 3, 'Lv10'), 60, 'KvK D4 troop Lv10');
  eq(cari('sg', 3, 'Lv10'), 39, 'SG D4 troop Lv10');
  eq(cari('sg', 0, 'Charm'), 70, 'charm 70 di hari awal');
  eq(cari('sg', 5, 'Charm'), 36, 'charm turun jadi 36 di D6 — beda per stage, jangan disamakan');
});

t('tabel KvK/SG TIDAK memakai skala HoG', () => {
  const troopHoG = HOG_SCORING.troop.pts;
  for (const k of ['kvk', 'sg']) {
    for (const [nama, rows] of EV_POIN[k].stages) {
      for (const r of rows) {
        if (/Latih troop/.test(r[0])) ok(troopHoG.indexOf(r[1]) < 0,
          k + '/' + nama + ': ' + r[0] + ' = ' + r[1] + ' bertabrakan dengan skala HoG');
        if (/Charm/.test(r[0])) ok(r[1] !== 1000, 'charm HoG (1.000) bocor ke ' + k);
      }
    }
  }
});

t('hitungan per stage & total event', () => {
  const s = ev('evStagePoin')('sg', 1, { 0: 2 });          /* 2 Mithril di SG D2 */
  eq(s.pts, 80000);
  eq(s.baris[0].unit, 'mithril');
  eq(ev('evStagePoin')('sg', 1, {}).pts, 0, 'kosong → 0');
  eq(ev('evStagePoin')('sg', 99, { 0: 5 }).pts, 0, 'stage tak ada → 0, bukan meledak');
  const tot = ev('evTotalPoin')('sg', { 1: { 0: 2 }, 3: { 0: 1 } });
  eq(tot.total, 80000 + 40000, 'total = jumlah semua stage');
  eq(tot.per.length, 7);
});

t('rencana KvK/SG tersimpan per profil, terpisah antar event', () => {
  ev('evPlanSet')('kvk', { 0: { 0: 3 } });
  ev('evPlanSet')('sg', { 0: { 0: 9 } });
  eq(ev('evPlanGet')('kvk')[0][0], 3);
  eq(ev('evPlanGet')('sg')[0][0], 9, 'dua event tak boleh saling menimpa');
  ok(env.storage.has('ks_p_' + PID + '_evPlan'), 'harus di slot per-profil');
});

t('kartu KvK/SG ter-render tanpa undefined', () => {
  const h = ev('evCalcHTML')(), b = ev('evCalcBody')();
  ok(/Kalkulator Poin/.test(h) && /evcalc/.test(h));
  ok(b.length > 300 && !/undefined|NaN/.test(b));
});

done();
