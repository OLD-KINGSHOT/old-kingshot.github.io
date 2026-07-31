/* Rekomendasi hero JOINER dari effect_op — dari roster yang benar-benar dipunya.

   Mekanikanya sudah diverifikasi 31 Jul 2026 (kingshothandbook buff-stacking-guide,
   lihat komentar di 05_*.js dan commit c40b15a): effect_op SAMA menjumlah, effect_op
   BEDA mengali, dan sebagai joiner yang dihitung cuma skill Expedition #1 hero pertama
   (butuh 4★ untuk Lv5). Sampai sekarang pengetahuan itu cuma hidup sebagai KALIMAT di
   note hero — tak tahu hero mana yang kamu punya, tak tahu ★-nya, dan tak bisa
   memperingatkan kalau dua hero teratasmu ternyata satu pool.

   Yang TIDAK boleh dilakukan mesin ini, dan dijaga di sini: mengarang kenaikan damage
   dalam persen. Itu butuh Attack & Lethality dasarmu yang app tidak punya — persis
   kesalahan "unggul ~12%" yang baru dikoreksi hari ini. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const env = createEnv({ storage: {
  ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
  ks_p_1_profile: JSON.stringify({ pid: '1', kingdom: '2114', start: '2026-05-27' }),
} });
const ev = env.evalIn;
const pick = (sit, roster, terisi) => ev('joinerPick')(sit, roster, terisi || []);

t('HERO_EFFECT waras: tiap op angka, tiap hero benar-benar ada di HEROES', () => {
  const HE = ev('HERO_EFFECT'), HEROES = ev('HEROES');
  const nama = new Set(HEROES.map(h => h.n));
  const kunci = Object.keys(HE);
  ok(kunci.length >= 8, 'minimal 8 hero ber-effect_op terdaftar');
  kunci.forEach(n => {
    ok(nama.has(n), n + ' harus ada di HEROES — jangan mendaftar hero hantu');
    ok(Array.isArray(HE[n]) && HE[n].length > 0, n + ' harus punya minimal 1 effect');
    HE[n].forEach(e => {
      eq(typeof e.op, 'number', n + ': op harus angka');
      ok(e.stat && typeof e.stat === 'string', n + ': stat harus diisi');
      eq(e.pct, undefined, n + ': persen TIDAK boleh diisi — hanya 4 hero yang datanya terbit');
    });
  });
});

t('pool yang KOSONG menang atas ★ yang lebih tinggi', () => {
  /* Chenko 5★ (101) vs Amane 1★ (102). Rally sudah penuh 101 → Amane menang
     walau bintangnya jauh lebih rendah, karena 102 mengali dan 101 cuma menjumlah. */
  const r = pick('bear-trap', { Chenko: 5, Amane: 1 }, [101]);
  eq(r.hero, 'Amane', 'pool kosong dikedepankan');
  eq(r.op, 102);
});

t('tanpa info pool terisi: ★ tertinggi yang menang', () => {
  const r = pick('bear-trap', { Chenko: 5, Amane: 1 }, []);
  eq(r.hero, 'Chenko', 'tak ada alasan menghindari 101 → ambil yang skill-nya paling matang');
  eq(r.op, 101);
});

t('dua hero teratas satu pool → PERINGATAN, bukan diam-diam', () => {
  const r = pick('bear-trap', { Chenko: 5, Yeonwoo: 5 }, []);
  ok(r.peringatan.some(p => /101/.test(p)), 'harus menyebut pool yang bentrok: ' + JSON.stringify(r.peringatan));
});

t('hero <4★ ditandai — skill joiner belum Lv5', () => {
  const r = pick('bear-trap', { Amane: 2 }, []);
  eq(r.hero, 'Amane', 'tetap direkomendasikan kalau memang satu-satunya');
  ok(r.peringatan.some(p => /4★|4\*/.test(p)), 'harus bilang skillnya belum penuh: ' + JSON.stringify(r.peringatan));
});

t('4★ ke atas tidak memicu peringatan bintang', () => {
  const r = pick('bear-trap', { Amane: 4 }, []);
  ok(!r.peringatan.some(p => /4★|4\*/.test(p)), 'jangan memperingatkan yang sudah cukup');
});

t('roster kosong → tidak mengarang rekomendasi', () => {
  const r = pick('bear-trap', {}, []);
  eq(r.hero, null);
  ok(r.alasan.length > 0, 'harus menjelaskan kenapa kosong, bukan diam');
});

t('garrison memakai pool DEFENSIF, bukan 101/102', () => {
  /* kvk-garrison: yang berguna Health/Defense/kurangi-damage — bukan Attack/Lethality. */
  const r = pick('kvk-garrison', { Chenko: 5, Gordon: 3 }, []);
  eq(r.hero, 'Gordon', 'Gordon (113 Health) menang atas Chenko (101 Lethality) di garrison');
  eq(r.op, 113);
});

t('rally memakai pool OFENSIF — kebalikannya', () => {
  const r = pick('bear-trap', { Chenko: 5, Gordon: 5 }, []);
  eq(r.hero, 'Chenko', 'di rally serang, Lethality yang dipakai');
});

t('Viking ikut pool OFENSIF — skornya dari Viking yang dibunuh troop-mu', () => {
  const r = pick('viking', { Chenko: 5, Gordon: 5 }, []);
  eq(r.hero, 'Chenko');
});

t('situasi pvp tidak punya rekomendasi joiner — di sana kamu bukan joiner', () => {
  const r = pick('coliseum', { Chenko: 5, Amane: 5 }, []);
  eq(r.hero, null);
  ok(/joiner/i.test(r.alasan), 'alasannya harus menyebut soal joiner: ' + r.alasan);
});

t('alternatif disertakan dengan op-nya, dan tak mengulang hero terpilih', () => {
  const r = pick('bear-trap', { Chenko: 5, Amane: 4, Yeonwoo: 3 }, []);
  ok(r.alternatif.length > 0, 'harus ada alternatif');
  ok(!r.alternatif.some(a => a.hero === r.hero), 'hero terpilih jangan muncul lagi sebagai alternatif');
  r.alternatif.forEach(a => eq(typeof a.op, 'number', 'tiap alternatif menyebut op-nya'));
});

t('TIDAK PERNAH mengarang persen kenaikan damage', () => {
  const r = pick('bear-trap', { Chenko: 5, Amane: 4 }, [101]);
  const semua = JSON.stringify(r);
  ok(!/%/.test(semua), 'tak boleh ada tanda persen di mana pun: ' + semua);
});

t('hero yang tidak punya effect_op tidak pernah direkomendasikan sebagai joiner', () => {
  /* Diana = hero ekonomi/stamina, tak punya effect_op joiner. */
  const r = pick('bear-trap', { Diana: 5 }, []);
  eq(r.hero, null, 'punya hero bukan berarti dia berguna sebagai joiner');
});

t('hero dual-effect mengisi dua pool sekaligus', () => {
  /* Saul 112+113. Kalau 113 sudah terisi, dia MASIH menyumbang lewat 112. */
  const HE = ev('HERO_EFFECT');
  eq(HE.Saul.length, 2, 'Saul harus terdaftar dual-effect');
  const r = pick('kvk-garrison', { Saul: 4, Gordon: 5 }, [113]);
  eq(r.hero, 'Saul', '113 penuh → Saul menang karena masih membawa 112 yang kosong');
});

done();
