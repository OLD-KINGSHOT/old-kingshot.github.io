/* ============================================================
   KINGSHOT COMPANION — DATA part 3 (tracker, effect_op, hero Gen3-5)
   ============================================================ */

/* ── Tracker progres pribadi (checklist, tersimpan) ── */
const TRACKER=[
  {g:'Hero \u2014 target bintang',items:[
    ['Chenko \u2192 4\u2605','Joiner lethality (Expedition #1 Lv5)'],
    ['Amane \u2192 4\u2605','Joiner attack (102) \u2014 stack dgn Chenko'],
    ['Yeonwoo \u2192 4\u2605','Joiner lethality (101)'],
    ['Gordon \u2192 4\u2605','Joiner health / garrison KvK'],
    ['Saul \u2192 4\u2605 (+spin 2\u2605 awal)','Joiner defensif + buff konstruksi'],
    ['Jabel \u2192 3\u2605','Garrison Gen 1 (lalu tahan)'],
    ['Zoe \u2192 4\u2605','INTI garrison \u2014 investasi utama'],
    ['Marlin \u2192 3\u2605+','Rally leader archer (Gen 2)'],
    ['Petra \u2192 3-4\u2605','Rally leader cavalry (Gen 3)'],
  ]},
  {g:'Pets',items:[
    ['Moose Lv15','Gate untuk menangkap Lion'],
    ['Lion (Wave 3 ~hari 113)','#1 F2P \u2014 hasilkan Truegold/Forgehammer harian'],
    ['Mighty Bison Lv30-gate','+15k squad capacity'],
  ]},
  {g:'Bangunan & sistem',items:[
    ['Wall = level TC (selalu)','Naikkan Wall dulu tiap mau naik TC'],
    ['TC30','Buka Truegold + troop T10'],
    ['War Academy + Truegold Lv5/TG5 (~hari 220)','Buka troop T11'],
    ['VIP6','+1 March Queue \u2014 unlock terbesar F2P'],
    ['Semua Governor Charm Lv10','TC25 \u2014 buff seluruh army'],
    ['Economy gear-set (Construction/Research)','Set kedua murah untuk dipakai saat bangun/riset'],
  ]},
];

/* ── effect_op: kode skill joiner (sumber: kingshothandbook rally guide) ── */
const EFFECT_OP=[
  ['101','Lethality','Chenko, Yeonwoo, (Amadeus)'],
  ['102','Attack','Amane, Margot, (Hilde)'],
  ['111','Defense','Howard, Quinn'],
  ['112','Defense','Saul (dual 112+113)'],
  ['113','Health','Gordon, Saul (dual)'],
  ['201','Kurangi dmg musuh','Fahd'],
];
const JOINER_COMBO={
  rule:'Saat JOIN rally kamu cuma bawa 1 hero (skill Expedition #1-nya). Kamu TIDAK merakit kombo sendiri \u2014 "kombo" terjadi otomatis ANTAR-PEMAIN: kalau para joiner kebetulan bawa kode effect_op berbeda, efeknya dikali. Tugasmu cukup: bawa 1 hero joiner TERBAIK.',
  off:['Bawa 1 dari: Chenko (101 Lethality), Yeonwoo (101), atau Amane (102 Attack).','Rally terkuat kalau di antara para joiner ada campuran kode 101 DAN 102 \u2014 tapi itu otomatis, di luar kendalimu.'],
  def:['Defensif: bawa 1 dari Gordon (113), Howard (111), Quinn (111), atau Saul (112+113 \u2014 satu hero dua kode).'],
  note:'Kode SAMA antar-joiner = dijumlah (diminishing). Kode BEDA = dikali. Jangan bawa hero skill-chance (Marlin/Petra/Diana) sbg joiner \u2014 efek "chance" tak menumpuk antar joiner.'
};

/* ── Skill yang di-MAX per hero (nama skill: kingshot.net; kode: handbook) ── */
const SKILL_MAX=[
 // [hero, kelas, skill di-MAX (nama), peran]
 ['Chenko','Cav','<b>Stand of Arms</b> (101 Lethality) → Lv5. SKIP Shield Wall.','Joiner offensif'],
 ['Yeonwoo','Arc','<b>On Guard</b> (101 Lethality) → Lv5. Bonus: Well-Traveled (+15% riset) boleh max.','Joiner offensif'],
 ['Amane','Arc','<b>Tri-Phalanx</b> (102 Attack) → Lv5. SKIP skill 2.','Joiner (Bear Hunt)'],
 ['Gordon','Cav','<b>Super Nutrients</b> (113 Health) → Lv5. SKIP skill 2.','Joiner defensif'],
 ['Howard','Inf','<b>Defenders’ Edge</b> (111, −20% dmg) → Lv5.','Joiner defensif'],
 ['Quinn','Arc','<b>Sixth Sense</b> (111, −20% dmg) → Lv5. Jangan barengi Howard (sama 111).','Joiner defensif'],
 ['Saul','Arc','<b>Taskforce Training</b> (dual 112+113, +10% Def +15% HP) → Lv5. Resourceful → Lv3 (potong biaya bangun).','Joiner def / garrison'],
 ['Zoe','Inf','MAX SEMUA: <b>Charisma</b> (+25% Atk) → <b>Sundering Wound</b> (DoT) → <b>Infinite Arsenal</b>. (Self-heal = skill CONQUEST, bukan garrison.)','Garrison INTI'],
 ['Jabel','Cav','MAX: <b>Rally Flag</b> (−50% dmg) → Hero’s Domain → Youthful Rage. Ganti ke Zoe di Gen 2.','Garrison awal'],
 ['Petra','Cav','MAX urutan: <b>Evil Eye</b> (+50% dmg musuh) → <b>The Favor</b> (+50% Atk) → <b>The Shield</b> (−50% dmg).','Rally leader'],
 ['Marlin','Arc','MAX: <b>Wild Card</b> → <b>Dynamo</b> → <b>Rumhead</b>. Leader/march SAJA, jangan joiner.','Rally leader'],
 ['Diana','Arc','<b>Iron Constitution</b> (stamina −20%) → <b>Quick Paced</b> (+100% march). Harus di march-MU. JANGAN Conquest.','Utility (gather/stamina)'],
];

/* ── Hero detail Gen 3-5 (lanjutan HERO_DETAIL) ── */
const HERO_DETAIL_ADV=[
  {n:'Petra',ty:'Cavalry',role:'Rally Leader (Gen 3)',gen:'Gen3 \u00b7 Hero Roulette',star:'3-4\u2605',f2p:true,
   skills:['Expedition: Evil Eye (+50% dmg musuh)','Expedition: The Favor (+50% Attack)','Expedition: The Shield (\u221250% dmg)'],
   gear:'"Fate\u2019s Writ" = Medium-High',note:'Rally leader cavalry F2P terbaik \u2014 ganti Jabel saat Petra 3\u2605.'},
  {n:'Eric',ty:'Infantry',role:'Garrison Defender (Gen 3)',gen:'Gen3 \u00b7 spender/gen-locked',star:'\u2014',f2p:false,
   skills:['Expedition defensif (garrison)','Punya self-heal seperti Zoe versi bayar'],
   gear:'Defensif',note:'Pengganti/penguat Zoe untuk SPENDER. F2P tetap andalkan Zoe (tak ada pengganti F2P s/d Gen5).'},
  {n:'Hilde',ty:'Cavalry',role:'Joiner dual (Gen 2)',gen:'Gen2 \u00b7 event-locked/spender',star:'\u2014',f2p:false,
   skills:['Expedition #1 dual effect_op (102 Attack + 112 Defense)','Joiner serba-bisa offense+defense'],
   gear:'Skip (joiner)',note:'Kalau kebetulan dapat: joiner bagus (mirip Saul tapi sisi attack). Jangan kejar berbayar.'},
  {n:'Jaeger',ty:'Archer',role:'Rally / utility (Gen 3)',gen:'Gen3 \u00b7 gen-locked',star:'\u2014',f2p:false,
   skills:['Expedition archer'],gear:'\u2014',note:'Gen-locked. Untuk F2P, Marlin tetap carry archer utama.'},
  {n:'Gen 4-5 (Alcar/Margot/Rosa, Long Fei/Thrud/Vivian)',ty:'Campuran',role:'Lanjutan',gen:'Gen4 ~hari 197 \u00b7 Gen5 ~hari 281',star:'\u2014',f2p:false,
   skills:['Kebanyakan gen-locked / spender','Margot = joiner 102 (Attack) yang berguna kalau dapat'],
   gear:'\u2014',note:'F2P: TIDAK perlu kejar. Zoe (garrison) + Petra/Marlin (rally) + joiner Epic 4\u2605 tetap kompetitif. Transisi hero hanya saat Mythic capai 3\u2605.'},
];
