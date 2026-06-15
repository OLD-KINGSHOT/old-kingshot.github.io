/* ============================================================
   KINGSHOT COMPANION — DATA (single source of truth)
   Data komunitas (kingshot.net, kingshotmastery, kingshothandbook,
   kingshotoptimizer, kingshotguide) per 2026-06. Layar in-game = acuan final.
   ============================================================ */

/* ── Kalibrasi & API ── */
const KS_API='https://kingshot-giftcode.centurygame.com/api/player';
const KS_GIFT_API='https://kingshot-giftcode.centurygame.com/api/gift_code';
const KS_SALT='mN4!pQs6JrYwV9';
/* Seed tanggal buka. 2114: API kingdom-tracker = 2026-05-27T00:06Z; dengan konvensi
   1-based (buka = H1) tanggal 05-27 membuat HoG-2 jatuh H20 = 15 Jun, persis in-game.
   (Seed lama 05-26 adalah kalibrasi era konvensi 0-based — salah satu hari sekarang.) */
const KINGDOM_DATES={'2114':'2026-05-27'};

/* ── Milestone umur server (hari ± wave/kalender) ── */
const MILESTONES=[
  {d:0,  name:'Gen 1 Heroes', cat:'Hero', note:'Amadeus, Helga, Jabel, Saul + Wheel of Fortune'},
  {d:2,  name:'Beast Hunting / Hunting Trap', cat:'PvE', note:'Anchor kalibrasi umur (tanggal misi \u22122 = Hari 0)'},
  {d:4,  name:'Sanctuaries', cat:'PvE', note:'Sanctuary Battle terbuka'},
  {d:13, name:'Plains terbuka', cat:'Map', note:'Kabut Plains hilang (\u00b111-14)'},
  {d:22, name:'Fortress', cat:'PvP', note:'Fortress Battle (\u00b121-23)'},
  {d:36, name:'Fertile Land terbuka', cat:'Map', note:'(\u00b133-38)'},
  {d:45, name:'Alliance Resource Exchange', cat:'Alliance', note:''},
  {d:50, name:'Gen 2 Heroes', cat:'Hero', note:'Zoe, Hilde, Marlin (\u00b140-50). Zoe = prioritas F2P!'},
  {d:50, name:'King\u2019s Castle Battle pertama', cat:'PvP', note:'(\u00b148-54)'},
  {d:57, name:'Gen 1 Pets', cat:'Pet', note:'Gray Wolf, Lynx, Bison (\u00b155-60)'},
  {d:65, name:'Age of Truegold', cat:'Truegold', note:'Truegold Lv1-3. WAJIB sudah TC30! (\u00b159-70)', key:true},
  {d:70, name:'KvK (Kingdom of Power)', cat:'PvP', note:'Eligibel sesudah Age of Truegold, lalu ~bulanan (\u00b170-80)', key:true},
  {d:76, name:'Gen 2 Pets', cat:'Pet', note:'Cheetah, Moose (\u00b172-80)'},
  {d:113,name:'Gen 3 Heroes', cat:'Hero', note:'Eric, Petra, Jaeger + Master Academy (TC25) (\u00b1105-120)'},
  {d:152,name:'Truegold Lv5 + Crucible', cat:'Truegold', note:'Buka eligibilitas Transfer Window (\u00b1150-155)'},
  {d:197,name:'Gen 4 Heroes', cat:'Hero', note:'Alcar, Margot, Rosa (\u00b1190-200)'},
  {d:223,name:'War Academy (T11 + Truegold Dust)', cat:'Building', note:'Gate resource terbesar, butuh TC30 (\u00b1220-225)', key:true},
  {d:281,name:'Gen 5 Heroes', cat:'Hero', note:'Long Fei, Thrud, Vivian (\u00b1270-281)'},
  {d:365,name:'Gen 6 Heroes', cat:'Hero', note:'Triton, Sophia, Yang (Legendary)'},
  {d:449,name:'Gen 7 Heroes', cat:'Hero', note:'Charles, Ava, Wee & Woo'},
];
function genForAge(d){
  if(d>=449)return 'Gen 7'; if(d>=365)return 'Gen 6'; if(d>=281)return 'Gen 5'; if(d>=197)return 'Gen 4';
  if(d>=113)return 'Gen 3'; if(d>=50)return 'Gen 2'; return 'Gen 1';
}
const GEN_DAY={1:0,2:50,3:113,4:197,5:281,6:365,7:449};
const HERO_GEN={Amadeus:1,Helga:1,Jabel:1,Saul:1,Howard:1,Chenko:1,Quinn:1,Diana:1,Gordon:1,Fahd:1,Amane:1,Yeonwoo:1,Edwin:1,Seth:1,Olive:1,Zoe:2,Hilde:2,Marlin:2,Petra:3,Eric:3,Jaeger:3,Rosa:4,Alcar:4,Margot:4,'Long Fei':5,Thrud:5,Vivian:5,Sophia:6,Triton:6,Yang:6};

/* ============================================================
   COMBAT — SATU sumber: SITUATIONS + HERO_PRIORITY
   Model skill resmi Kingshot (sumber: kingshothandbook rally + build guides):
   Tiap hero punya 2 SET skill terpisah, dinaikkan pakai MANUAL BERBEDA
   (jadi bisa di-maks dua-duanya, tak rebutan):
   - EXPEDITION (3 skill): dipakai di rally, garrison, Bear Hunt, KvK, semua
     tempur lapangan. INI yang utama untuk F2P.
   - CONQUEST: HANYA dipakai di Arena & Campaign. Skill Conquest pertama =
     'Ultimate' (otomatis). Tak main Arena -> TABUNG manualnya.
   JOINER (ikut rally orang lain): hanya SKILL EXPEDITION PERTAMA (bendera
   hijau, bawa effect_op) yang dihitung -> maks itu ke Lv5 (butuh 4 bintang).
   Skill ke-2/3, gear, widget joiner = SIA-SIA (tak dihitung saat join).
   LEADER / GARRISON (hero deploy penuh): naikkan SEMUA 3 skill Expedition.
   ============================================================ */
const SITUATIONS=[
 {key:'bear-trap',name:'Bear Trap',sub:'Bear Hunt \u00b7 harian',icon:'\u25c8',kind:'rally',role:'Joiner',evType:'bear',minDay:0,daily:true,pick:1,
  heroes:[{n:'Chenko',note:'Cav'},{n:'Yeonwoo',note:'Arc'}],ratio:{inf:10,cav:30,arc:60},
  skillUp:'Max skill #1 (Lethality) \u2192 Lv5 (butuh 4\u2605).',
  do:'Bawa 1 hero ber-Lethality di slot-1: Chenko (Cav) atau Yeonwoo (Archer). Troop: ARCHER terkuat (beruang infantry \u2192 +10%). Forgehammer #1. \u26a0 Aliansi pasang 2 TRAP (jam beda) tapi kamu hanya bisa serang SATU KALI \u2014 pilih BT 1 ATAU BT 2 yang pas jam onlinemu; sudah ikut satu = BT berikutnya baru muncul lagi siklus depan.'},
 {key:'viking',name:'Viking Vengeance',sub:'reinforce = skor #1',icon:'\u2694',kind:'defense',role:'Reinforce',evType:'viking',minDay:0,pick:1,
  heroes:[{n:'Chenko',note:'Cav'},{n:'Amane',note:'Arc'},{n:'Yeonwoo',note:'Arc'}],ratio:{inf:70,cav:25,arc:5},
  table:[
   ['','\ud83d\udce4 KIRIM (reinforce ally)','\ud83c\udfe0 BASE (rumah)'],
   ['Hero','Chenko / Amane / Yeonwoo \u2014 DAMAGE/Lethality, slot-1 (Amadeus jika ada)','Jabel / Howard / Quinn \u2014 3 hero defensif di Guard Station'],
   ['Troop','Infantry dulu \u2192 Cavalry (T5+)','Archer saja (wave 1-15); kota DIKOSONGKAN'],
   ['Kenapa','MAX kill = kill point untukmu','Buff garrison ally + tetap dapat defense point'],
  ],
  skillUp:'KIRIM hero DAMAGE (skill-1) utk MAX kill \u00b7 BASE: 3 hero defensif buff garrison',
  do:'KOSONGKAN kota \u2192 reinforce ally yang ONLINE. Wave HQ 10/20: recall 1 march, garrison HQ (Howard, shield-inf). Wave 16+: ikutkan archer. Jangan heal/padamkan api saat event.'},
 {key:'sanctuary',name:'Sanctuary',icon:'\u25c9',kind:'rally',role:'Joiner',evType:'sanctuary',minDay:4,pick:1,
  heroes:[{n:'Chenko',note:'Cav'},{n:'Yeonwoo',note:'Arc'}],ratio:{inf:50,cav:20,arc:30},
  skillUp:'Joiner: Expedition skill #1 Lethality (Lv5)',
  do:'Rally kalahkan mercenary \u2192 tahan 30 mnt. Garrison nahan: Howard/Quinn/Gordon. RPS: Inf>Cav>Archer.'},
 {key:'fortress',name:'Fortress',icon:'\u25c8',kind:'rally',role:'Joiner',evType:'fortress',minDay:22,pick:1,
  heroes:[{n:'Chenko',note:'Cav'},{n:'Yeonwoo',note:'Arc'}],ratio:{inf:50,cav:20,arc:30},
  skillUp:'Joiner: Expedition skill #1 Lethality (Lv5)',
  do:'Seperti Sanctuary, target lebih besar (2 season point). Butuh koordinasi aliansi penuh.'},
 {key:'kvk-rally',name:'KvK Rally',sub:'nyerang',icon:'\u2620',kind:'rally',role:'Host/Joiner',evType:'kvk',minDay:70,pick:1,
  heroes:[{n:'Chenko',note:'Cav'},{n:'Yeonwoo',note:'Arc'},{n:'Amadeus',note:'Inf · P2W'}],ratio:{inf:50,cav:20,arc:30},
  skillUp:'Lead: semua 3 Expedition. Joiner: skill #1 Lethality',
  do:'Jatuhkan rally dalam window 1\u20135 detik biar lawan tak sempat heal. RPS: Inf>Cav>Archer>Inf.'},
 {key:'kvk-garrison',name:'KvK Garrison',sub:'bertahan',icon:'\u25a3',kind:'garrison',role:'Garrison',evType:'kvk',minDay:70,
  heroes:[{n:'Zoe',note:'Inf \u00b7 inti'},{n:'Gordon',note:'Cav'},{n:'Quinn',note:'Arc'}],ratio:{inf:60,cav:20,arc:20},
  skillUp:'Expedition defensif hero garrison (Gordon Super Nutrients)',
  do:'Garrison = 1 march: 1 Inf + 1 Cav + 1 Arc. Zoe (Inf, inti \u2014 HP tinggi + widget defensif) + Gordon atau Jabel (Cav) + Quinn (Arc). Batch-heal biar pasukan luka, bukan mati.'},
 {key:'arena',name:'Arena / Conquest',icon:'\u2727',kind:'pvp',role:'5 Hero',evType:null,minDay:0,
  heroes:[{n:'Howard'},{n:'Jabel'},{n:'Amane'},{n:'Yeonwoo'},{n:'Saul'}],ratio:{inf:40,cav:20,arc:40},free:1,
  skillUp:'CONQUEST: Ultimate tiap hero Lv5\u21928\u219210',
  do:'5 hero BEBAS kelas \u2014 khusus Arena (aturan 1-per-kelas hanya berlaku di march). Arena ABAIKAN skill Expedition \u2014 yang dipakai = skill CONQUEST (Ultimate otomatis).'},
 {key:'all-out',name:'All Out',sub:'Kill Event',icon:'\u25c6',kind:'pvp',role:'Farm aman',evType:'allout',minDay:0,
  heroes:[{n:'march terkuat',note:'lethality'}],ratio:{inf:30,cav:40,arc:30},
  skillUp:'\u2014 (fokus shield & farm aman)',
  do:'SHIELD tiap offline. Farm GATHERER lawan (injured=killed, tak ada hospital). Incar troop tier tinggi.'},
 {key:'coliseum',name:'Coliseum',sub:'Mystic Trial · Sen-Sel · gear-only',icon:'🏛',kind:'pvp',role:'Solo PvE',evType:null,minDay:0,
  heroes:[{n:'Inf tank',note:'mis. Zoe'},{n:'Archer DPS',note:'mis. Marlin'}],ratio:{inf:50,cav:10,arc:40},
  skillUp:'Hero Gear (per-hero) MAKS — Pet/Charm/Governor Gear/Academy DIABAIKAN di sini.',
  do:'Dungeon gear-only. Rotasi 1 set Hero Gear terbaik antar tim (gear-swap) > sebar gear lemah. Formasi 50/10/40 (sesuaikan lawan: 50/10/35 atau 50/20/30). Target F2P: tembus Stage 10. Reward: Crystal + Hero Gear material → danai Mithril.'},
 {key:'ac-lane',name:'Alliance Championship',sub:'pilih 1 lane · kamu LEAD',icon:'🛡',kind:'pvp',role:'Lane PvP',evType:null,minDay:0,
  heroes:[{n:'Howard',note:'Inf'},{n:'Jabel',note:'Cav · leader'},{n:'Saul / Yeonwoo',note:'Arc'}],ratio:{inf:50,cav:20,arc:30},
  skillUp:'LEAD = semua 3 skill Expedition. Leader Jabel: Rally Flag → Youthful Rage → Hero’s Domain. Upgrade: Zoe (Inf) · Marlin (Arc) · Petra (Cav).',
  do:'PILIH 1 LANE (1 player = 1 lane). KUAT (top-20 power aliansi) → masuk lane yang DITUMPUK (strategi 2-1: menang 2 dari 3 lane). LEMAH (di luar top-20) → bebas / lane korban; skor tak dihitung tapi TETAP hadir utk reward. Ikut arahan R4/R5. Deploy 3 hero (1 per kelas) + troop SEBELUM tanding (yg lagi march/heal tak ikut). Counter lawan (RPS): vs Inf → Archer 30/20/50 · vs Cav → Inf 60/10/30 · vs Archer → Cav 30/50/20. Aktifkan SEMUA buff sebelum registrasi (snapshot LOCK). Ambil 2 kill/ronde.'},
];

/* HERO_PRIORITY: exped = skill Expedition yang dinaikkan; conq = skill Conquest (Arena) */
const HERO_PRIORITY=[
 {rank:1,name:'Chenko',role:'Joiner',troop:'Cavalry',star:'4\u2605',exped:'Expedition #1: Stand of Arms (+25% Lethality). MAKS Lv5 \u2014 cuma ini yang dihitung saat join.',conq:'Lewati (skip) \u2014 cuma untuk Arena.',why:'Joiner damage terbaik \u2014 Bear Trap/Sanctuary/KvK'},
 {rank:2,name:'Yeonwoo',role:'Joiner',troop:'Archer',star:'4\u2605',exped:'Expedition #1: On Guard (+25% Lethality). MAKS Lv5.',conq:'Lewati.',why:'Joiner archer lethality (pool sama dgn Chenko \u2014 pakai SATU saja)'},
 {rank:3,name:'Amane',role:'Joiner',troop:'Archer',star:'4\u2605',exped:'Expedition #1: Tri-Phalanx (+25% Attack). MAKS Lv5.',conq:'Lewati.',why:'Stack dgn Chenko (effect_op beda = dikali = damage lebih besar)'},
 {rank:4,name:'Gordon',role:'Joiner / Garrison',troop:'Cavalry',star:'4\u2605',exped:'Expedition #1: Super Nutrients (+25% Health). MAKS Lv5.',conq:'Lewati.',why:'Joiner health + hero garrison KvK'},
 {rank:5,name:'Jabel',role:'Garrison / leader awal',troop:'Cavalry',star:'3\u2605 lalu TAHAN',exped:'Garrison: Rally Flag (\u221250% dmg) dulu. Kalau jadi LEADER, lanjut Youthful Rage \u2192 Hero\u2019s Domain.',conq:'Lewati (kecuali main Arena).',why:'Garrison & leader Gen 1 \u2014 stop di 3\u2605, peran diambil Petra (Gen3)'},
 {rank:6,name:'Saul',role:'Support / ekonomi',troop:'Archer',star:'4\u2605',exped:'Expedition #1: Taskforce Training (+10% Def & +15% HP, dual 112+113). MAKS Lv5. Spin 2\u2605 awal untuk buff konstruksi.',conq:'Lewati.',why:'Joiner defensif terbaik + kecepatan konstruksi'},
 {rank:7,name:'Zoe',role:'Garrison \u00b7 INTI (Gen 2)',troop:'Infantry',star:'4\u2605 \u2192 5\u2605',exped:'Garrison: Charisma (+25% Atk) Lv5 DULU \u2192 Sundering Wound \u2192 Infinite Arsenal. + gear Health & widget "The Unrighteous".',conq:'Agony Rush (heal 40% HP) = skill CONQUEST \u2192 cuma aktif di Arena/Campaign, BUKAN garrison. Naikkan kalau main Arena; kalau tidak, tabung.',why:'Hero inti F2P tanpa pengganti s/d Gen5 \u2014 investasi utama selamanya'},
 {rank:8,name:'Marlin',role:'Carry Archer \u00b7 LEADER (Gen 2)',troop:'Archer',star:'3\u2605+',exped:'Sebagai LEADER: Wild Card (Lv5) \u2192 Dynamo \u2192 Rumhead. Jangan dipakai joiner (skill chance, tanpa effect_op = sia-sia).',conq:'Lewati.',why:'Carry archer; Marlin 3\u2605 > Diana 5\u2605'},
];

/* ── Tier list & referensi hero ── */
const HEROES=[
  {n:'Amadeus',t:'S',ty:'Infantry',f2p:false,note:'\u274c P2W \u2014 shard hanya VIP 7+ pack & 3 HoG pertama. Leader infantry top, skip kalau F2P murni.'},
  {n:'Petra',t:'S',ty:'Cavalry',f2p:true,note:'Rally leader cavalry F2P terbaik (Gen 3). Prioritas #3 jangka panjang.'},
  {n:'Marlin',t:'S',ty:'Archer',f2p:true,note:'Rally leader archer F2P terbaik (Hall of Heroes).'},
  {n:'Zoe',t:'S',ty:'Infantry',f2p:true,note:'\u2605 Infantry/garrison F2P terbaik, TANPA pengganti F2P. Investasi tertinggi.'},
  {n:'Vivian',t:'S',ty:'Archer',f2p:false,note:'Gen 5 \u2014 sulit F2P.'},
  {n:'Jabel',t:'A',ty:'Cavalry',f2p:true,note:'Garrison awal, GRATIS login hari-2. Carry Gen 1-2.'},
  {n:'Hilde',t:'A',ty:'Cavalry',f2p:false,note:'Gen 2 \u2014 event-locked/spender. Joiner dual effect_op (102+112).'},
  {n:'Jaeger',t:'A',ty:'Archer',f2p:false,note:'Gen 3 \u2014 gen-locked.'},
  {n:'Helga',t:'A',ty:'Infantry',f2p:false,note:'\u274c P2W \u2014 first-purchase reward. Bukan F2P.'},
  {n:'Eric',t:'A',ty:'Infantry',f2p:false,note:'Gen 3 \u2014 gen-locked. Garrison defender spender (pengganti Zoe versi bayar).'},
  {n:'Thrud',t:'A',ty:'Cavalry',f2p:false,note:'Gen 5 \u2014 sulit F2P.'},
  {n:'Saul',t:'A',ty:'Archer',f2p:true,note:'\u2605 Joiner defensif dual 112+113. Spin ke 2\u2605 dulu: +6% konstruksi. Ekonomi F2P #1.'},
  {n:'Rosa',t:'A',ty:'Archer',f2p:true,note:'Gen 4 - hero Roulette F2P (archer); hero Gen-4 paling mudah utk F2P. (Margot = P2W/Hall of Heroes.)'},
  {n:'Alcar',t:'A',ty:'Infantry',f2p:false,note:'Gen 4 \u2014 gen-locked.'},
  {n:'Margot',t:'A',ty:'Cavalry',f2p:false,note:'Gen 4. Joiner effect 102 (Attack).'},
  {n:'Long Fei',t:'A',ty:'Infantry',f2p:false,note:'Gen 5 (sumber tak konsisten soal F2P).'},
  {n:'Howard',t:'B',ty:'Infantry',f2p:true,note:'Tank/placeholder awal (joiner def 111) \u2014 ganti saat Zoe siap.'},
  {n:'Chenko',t:'B',ty:'Cavalry',f2p:true,note:'\u2605 Joiner epic \u2192 4\u2605 (effect 101 Lethality). Pakai SATU dari Chenko/Yeonwoo.'},
  {n:'Quinn',t:'B',ty:'Archer',f2p:true,note:'Placeholder awal (joiner def 111).'},
  {n:'Diana',t:'B',ty:'Archer',f2p:true,note:'GRATIS. Hemat stamina Beast Hunt \u2014 bagus farming, bukan rally tempur.'},
  {n:'Gordon',t:'B',ty:'Cavalry',f2p:true,note:'Joiner defensif epic (effect 113 Health).'},
  {n:'Fahd',t:'B',ty:'Cavalry',f2p:true,note:'Joiner epic (effect 201 kurangi dmg musuh).'},
  {n:'Amane',t:'B',ty:'Archer',f2p:true,note:'\u2605 Joiner epic \u2192 4\u2605 (102 Attack). Dgn Chenko/Yeonwoo = 2,25\u00d7 DamageUp.'},
  {n:'Yeonwoo',t:'B',ty:'Archer',f2p:true,note:'\u2605 Joiner epic \u2192 4\u2605 (101 Lethality).'},
  {n:'Edwin',t:'C',ty:'Cavalry',f2p:false,note:'Rare ekonomi \u2014 early game saja, JANGAN invest tempur.'},
  {n:'Seth',t:'C',ty:'Infantry',f2p:false,note:'Rare ekonomi \u2014 early game saja.'},
  {n:'Olive',t:'C',ty:'Archer',f2p:false,note:'Rare ekonomi \u2014 early game saja.'},
  {n:'Sophia',t:'Gen6',ty:'Cavalry',f2p:false,note:'Legendary Gen 6.'},
  {n:'Triton',t:'Gen6',ty:'Infantry',f2p:false,note:'Legendary Gen 6.'},
  {n:'Yang',t:'Gen6',ty:'Archer',f2p:false,note:'Legendary Gen 6.'},
];
const F2P_ORDER=[
  ['1. Saul \u2192 2\u2605','Ekonomi: +6% konstruksi & potongan biaya. Spin ~35\u00d7.'],
  ['2. Zoe (Roulette)','Infantry/garrison terbaik F2P, tanpa pengganti. Target 4\u2605 \u2014 split di HoG Hari 2 & 3.'],
  ['3. Petra (Roulette)','Rally leader cavalry F2P terbaik.'],
  ['4. Marlin (Hall of Heroes)','Rally leader archer F2P terbaik. Lalu isi Mythic Shard.'],
  ['5. Jabel','Garrison awal gratis (login hari-2).'],
  ['6. Joiner \u2192 4\u2605: Chenko + Amane + Yeonwoo','Tulang punggung rally-stacking. Saat join bawa SATU: Chenko/Yeonwoo (101) atau Amane (102) \u2014 efeknya menumpuk antar joiner, bukan dalam satu lineup.'],
];
const STAR_SKILL_GATE=[['1\u2605','skill maks Lv2'],['2\u2605','Lv3'],['3\u2605','Lv4'],['4\u2605','Lv5 (MAKSIMAL)'],['5\u2605','\u2014 (cuma tambah stat)']];
const HERO_TARGETS=[
  {phase:'Fase 1 \u2014 Hari 0-50 (Gen 1)', maxDay:50, note:'Joiner: cukup MAKS skill EXPEDITION PERTAMA ke Lv5 \u2014 butuh 4\u2605. Skill ke-2/3 & gear joiner = sia-sia. SIMPAN gem untuk Zoe.', rows:[
    ['Chenko (Cav)','4\u2605','Expedition #1: Stand of Arms','Bangun \u2192 lalu TAHAN di 4\u2605'],
    ['Amane (Arc)','4\u2605','Expedition #1: Tri-Phalanx','Bangun \u2192 TAHAN 4\u2605'],
    ['Yeonwoo (Arc)','4\u2605','Expedition #1: On Guard','Bangun \u2192 TAHAN 4\u2605'],
    ['Gordon (Cav)','4\u2605','Expedition #1: Super Nutrients','Bangun \u2192 TAHAN 4\u2605 (rally defensif)'],
    ['Saul (Arc)','4\u2605','Expedition #1: Taskforce Training','Bangun \u2192 TAHAN. Spin 2\u2605 awal utk buff konstruksi'],
    ['Jabel (Cav)','3\u2605','Rally Flag \u2192 Youthful Rage','\u23f8 TAHAN di 3\u2605 (jembatan)'],
    ['Howard / Quinn','seadanya','\u2014','\u23f8 TAHAN rendah (placeholder)'],
  ]},
  {phase:'Fase 2 \u2014 Hari ~45-113 (Gen 2)', maxDay:113, note:'Spin Zoe di Hero Roulette saat hari skor (HoG D2-D3) \u2192 poin + bintang sekaligus.', rows:[
    ['\u2605 Zoe (Inf) INTI','4\u2605 (\u21925\u2605)','Expedition: Charisma (Lv5 dulu) \u2192 Sundering Wound \u2192 Infinite Arsenal','Bangun TERUS. Gear Health + widget "The Unrighteous".'],
    ['Marlin (Arc)','3-4\u2605','Expedition: Wild Card (Lv5) \u2192 Dynamo \u2192 Rumhead','Bangun (rally leader archer)'],
    ['Howard / Quinn','\u2014','\u2014','\ud83d\udeab PENSIUN \u2014 diganti Zoe/Marlin'],
  ]},
  {phase:'Fase 3 \u2014 Hari ~113+ (Gen 3+)', maxDay:9999, note:'Joiner Epic yang sudah 4\u2605 dipakai SELAMANYA (mix effect_op).', rows:[
    ['Petra (Cav)','3-4\u2605','Expedition: Evil Eye \u2192 The Favor \u2192 The Shield','Bangun (rally leader cavalry)'],
    ['\u2605 Zoe','4\u2605 \u2192 5\u2605','lanjut + Exclusive Gear/widget','Terus dorong (tanpa pengganti F2P)'],
    ['Jabel','\u2014','\u2014','\ud83d\udeab PENSIUN \u2014 peran diambil Petra'],
  ]},
];
const HERO_DETAIL=[
  {n:'Zoe',ty:'Infantry',role:'Garrison Defender',gen:'Gen2 \u00b7 Hero Roulette (~15-20k gem)',star:'4\u2605',
   skills:['Expedition: Charisma (+25% Attack) \u2014 MAX dulu','Expedition: Sundering Wound (DoT s/d 40%)','Expedition: Infinite Arsenal (amplify dmg musuh s/d 50%)','Conquest (Arena saja): Agony Rush = heal 40% HP'],
   gear:'"The Unrighteous" widget = HIGH (multiplikatif; +60% Inf Lethality & HP). Gear Health dulu (Chest/Gloves).',note:'Heal Zoe (Agony Rush) cuma jalan di Arena/Campaign \u2014 garrison-nya mengandalkan HP tinggi + widget. TANPA pengganti F2P s/d Gen5.'},
  {n:'Petra',ty:'Cavalry',role:'Rally Leader',gen:'Gen3 \u00b7 Hero Roulette',star:'3-4\u2605',
   skills:['Expedition: Evil Eye (+50% dmg musuh)','Expedition: The Favor (+50% Attack)','Expedition: The Shield (\u221250% dmg)'],
   gear:'"Fate\u2019s Writ" = Medium-High',note:'Rally leader cavalry F2P terbaik.'},
  {n:'Marlin',ty:'Archer',role:'Rally Leader',gen:'Gen2 \u00b7 Hall of Heroes (~15k gem)',star:'3-4\u2605',
   skills:['Expedition: Wild Card (+50% dmg) \u2014 MAX dulu','Expedition: Dynamo (+50% dmg)','Expedition: Rumhead (\u221250% lethality musuh)'],
   gear:'"Mistweaver" = High',note:'Khusus LEADER \u2014 skill chance tanpa effect_op = sia-sia kalau jadi joiner.'},
  {n:'Jabel',ty:'Cavalry',role:'Garrison (awal)',gen:'Gen1 \u00b7 GRATIS (login hari-2)',star:'3\u2605',
   skills:['Expedition: Rally Flag (\u221250% dmg) \u2014 garrison','Expedition: Youthful Rage (+25% lethality)','Expedition: Hero\u2019s Domain (+50% dmg) \u2014 kalau jadi leader'],
   gear:'"Greaves of Faith" \u2014 LOW prioritas (hero jembatan)',note:'Stop invest saat Petra 3\u2605.'},
  {n:'Saul',ty:'Archer',role:'Joiner defensif + Ekonomi',gen:'Gen1',star:'~3-4\u2605',
   skills:['Expedition #1: Taskforce Training (+10% Def & +15% HP, dual 112+113) \u2014 MAX Lv5 DULU','Expedition: Positional Battler (+25% lethality)','Expedition: Resourceful (build speed/cost)'],
   gear:'"Rabbitgear Cannon" \u2014 Skip kalau murni joiner',note:'Satu-satunya joiner dgn 2 effect_op sekaligus (4 Saul = 2,24\u00d7 DefenseUp). Spin 2\u2605 awal utk buff konstruksi.'},
  {n:'Chenko',ty:'Cavalry',role:'Joiner (Epic, GRATIS)',gen:'Gen1 \u00b7 Tavern/Shop',star:'4\u2605 (buka skill Lv5)',
   skills:['Expedition #1: Stand of Arms (+25% Lethality, effect 101) \u2014 MAX Lv5, selesai'],
   gear:'Skip (joiner)',note:'Pakai SATU dari Chenko/Yeonwoo (sama-sama 101).'},
  {n:'Amane',ty:'Archer',role:'Joiner (Epic, GRATIS)',gen:'Gen1 \u00b7 Tavern/Shop',star:'4\u2605 (buka skill Lv5)',
   skills:['Expedition #1: Tri-Phalanx (+25% Attack, effect 102) \u2014 MAX Lv5, selesai'],
   gear:'Skip (joiner)',note:'Mix 102\u00d7101 terjadi ANTAR joiner di rally yang sama \u2014 bukan satu lineup (Amane & Yeonwoo sama-sama Archer, tak bisa satu march).'},
  {n:'Yeonwoo',ty:'Archer',role:'Joiner (Epic, GRATIS)',gen:'Gen1 \u00b7 Tavern/Shop',star:'4\u2605 (buka skill Lv5)',
   skills:['Expedition #1: On Guard (+25% Lethality, effect 101) \u2014 MAX Lv5, selesai'],
   gear:'Skip (joiner)',note:'Sama pool dgn Chenko \u2014 jangan stack keduanya tanpa 102/113.'},
  {n:'Gordon',ty:'Cavalry',role:'Joiner defensif (Epic, GRATIS)',gen:'Gen1 \u00b7 Tavern/Shop',star:'4\u2605 (buka skill Lv5)',
   skills:['Expedition #1: Super Nutrients (+25% Health, effect 113) \u2014 MAX Lv5'],
   gear:'Skip (joiner)',note:'Untuk rally defensif + garrison KvK.'},
];
const EARLY_HEROES=[
  ['Jabel','Mythic','GRATIS \u2014 login hari ke-2','Garrison awal \u2192 3\u2605'],
  ['Saul','Mythic','GRATIS \u2014 Roulette/tutorial Gen 1','Joiner defensif + buff konstruksi'],
  ['Helga','Mythic','\u274c P2W (first-purchase)','BUKAN F2P \u2014 skip'],
  ['Amadeus','Mythic','\u274c P2W (VIP 7+ pack)','Leader infantry top TAPI bukan F2P. Skip.'],
  ['Chenko','Epic','GRATIS Tavern/Shop','\u2605 Joiner (101) \u2192 4\u2605'],
  ['Amane','Epic','GRATIS Tavern/Shop','\u2605 Joiner (102) \u2192 4\u2605'],
  ['Yeonwoo','Epic','GRATIS Tavern/Shop','\u2605 Joiner (101) \u2192 4\u2605'],
  ['Gordon','Epic','GRATIS Tavern/Shop','Joiner defensif (113)'],
  ['Howard / Quinn','Epic','GRATIS','Tank/placeholder (ganti saat Zoe/Marlin Gen2)'],
  ['Edwin / Seth / Olive','Rare','Awal','Early-game/ekonomi saja \u2014 JANGAN invest tempur'],
];
const FORMATIONS=[
  ['Rally / Bear Hunt \u2014 Gen 1','10 / 30 / 60'],
  ['Rally \u2014 Gen 2 (Marlin)','10 / 20 / 70'],
  ['Rally \u2014 Gen 3 (Petra)','10 / 10 / 80'],
  ['Rally \u2014 Gen 4+','1 / 10 / 89 (min 5.000 infantry!)'],
  ['Pertahanan Kota (standar)','60 / 15 / 25'],
  ['Pertahanan Berat (kalah power)','70 / 10 / 20'],
  ['PvP lawan Infantry-heavy','30 / 20 / 50 (archer)'],
  ['PvP lawan Cavalry-heavy','60 / 10 / 30 (infantry)'],
  ['PvP lawan Archer-heavy','30 / 50 / 20 (cavalry)'],
  ['Seimbang / musuh tak diketahui','50 / 20 / 30'],
];
