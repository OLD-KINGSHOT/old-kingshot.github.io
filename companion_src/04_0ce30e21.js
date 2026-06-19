/* ============================================================
   KINGSHOT COMPANION — DATA part 2 (build, pets, progres, event)
   ============================================================ */

/* ── Bangun / Upgrade ── */
const BUILD_ORDER=[
  {t:'Town Center (TC) \u2014 SELALU prioritas #1',d:'Begitu satu selesai, langsung mulai berikutnya. Rush ke TC30 (buka T10 + Truegold). Jangan biarkan antrian kosong.'},
  {t:'Wall = level TC',d:'Wall wajib sama dengan level TC tiap mau naik TC. Naikkan duluan.'},
  {t:'Academy (riset)',d:'Prasyarat TC + pengali pertumbuhan. Fokus Growth (kecepatan konstruksi/riset) > Economy.'},
  {t:'Bangunan militer (Barracks/Range/Stable)',d:'Naikkan sesuai prasyarat TC berikutnya.'},
  {t:'Hospital / Clinic',d:'Murah & penting \u2014 kapasitas penyembuhan. Cap Lv10.'},
  {t:'Kitchen & Houses',d:'Murah, kasih Gold gratis untuk riset & populasi. Worth dinaikkan.'},
  {t:'\u26d4 Produksi (Mill/Sawmill/Quarry/Iron Mine)',d:'SKIP! Gathering di map 10-100\u00d7 lebih untung. Naikkan HANYA jika jadi prasyarat TC.',warn:true},
  {t:'\u26d4 Embassy / Scout Camp / Command Center',d:'Prioritas rendah untuk solo. Command Center hanya jika kamu MEMIMPIN rally.',warn:true},
];
const DECREES=[
  ['Double Time','\u221220% waktu konstruksi (bertahan s/d build selesai)','\u2605 WAJIB tiap upgrade besar. ~800k Contentment, cd ~23 jam. Aktifkan SEBELUM mulai.'],
  ['Rush Job','Beri instan ~5 hari resource worksite','Cd ~1 hari'],
  ['Urgent Mobilization','Resident bekerja 48 jam, \u221210 mood','Cd ~8 jam'],
  ['Comprehensive Care','Sembuhkan semua Resident sakit','Cd ~4 jam'],
  ['Productivity Day','Produktivitas 100% selama 24 jam, \u221210 mood','Cd ~12 jam'],
  ['Festivities','+50 mood / +30 comfort','Cd ~1 hari'],
];
const TC_PREREQ=[
  ['TC10','Wall 10 + Academy 9 + Barracks 9'],
  ['TC15','Wall 15 + Academy 14 + Hospital 14'],
  ['TC20','Wall 20 + Academy 19 + semua militer 19'],
  ['TC25','Wall 25 + Academy 24 (buka Charms / Master Academy)'],
  ['TC30','Wall 30 + Academy 29 + bangunan inti 29 (buka Truegold & T10)'],
];
const RESEARCH_ORDER=[
  ['1. Tool Enhancement (Research Speed)','Compound ke SEMUA riset berikutnya \u2014 rush pertama'],
  ['2. Tooling Up (Construction Speed)','Compound ke semua bangunan'],
  ['3. Command Tactics (March Queue)','Tambah antrian march'],
  ['4. Regimental Expansion','Ukuran march & rally'],
  ['5. Gathering Speed (~TC20)','Skip riset OUTPUT bangunan'],
  ['6. Trainer Tools + Bandaging','Kecepatan/biaya training + healing'],
  ['7. Battle (terakhir untuk F2P)','Lethality>Attack, Health>Defense, Infantry+Archer dulu'],
];
const VIP_LEVELS=[
  ['VIP4','+10% Construction','Level pertama yang worth (~40-57 hari gratis)'],
  ['VIP6','+1 March Queue','\u2605 Unlock terbesar F2P \u2014 gather+rally+march bareng (~6-8 bln)'],
  ['VIP8','Formasi +2','Minor'],
  ['VIP9','+20% Construction, +Squad Def','Plafon realistis F2P (push hanya jika tak spend)'],
  ['VIP10+','\u2014','Whale territory, diminishing returns'],
];
const TROOP_INFO={
  tiers:[['T1-T9','Gate per level TC (angka pasti cek game)'],['T10','Town Center 30'],['T11 (Truegold)','War Academy + Truegold Lv5 (TG5): umur ~220 + TC30'],['T12 (Tempered Truegold)','TC27+ · ~hari 323 (Truegold Lv8). Semua tipe ke T11 DULU baru push 1 ke T12']],
  tips:[
    'Promote naik (T9\u2192T10\u2192T11) > train massal tier rendah \u2014 lebih banyak poin event per speedup.',
    'Stage troop T9 SEBELUM event, promote DI DALAM window skor (KvK D4, Strongest Governor combat day).',
    'Jaga queue training selalu jalan (durasi panjang sebelum tidur).',
    'JANGAN biarkan hospital penuh \u2192 pasukan mati permanen. Batch-heal pakai slider, bukan speedup.',
    'Floor 5.000 infantry di formasi rally (trigger skill hero infantry). Rasio default (seimbang / musuh tak diketahui) = 50/20/30 — rasio per situasi lihat tabel Formasi.',
  ]
};
const GEAR_INFO=[
  ['Hero Gear','Hanya untuk LEADER rally sendiri (joiner = sia-sia). XP level + Mastery(Forgehammer) + Red(Mithril 120-200). Prioritas: Inf Gloves\u2192Archer Helmet\u2192Cav Helmet.'],
  ['Governor/Chief Gear','Buff SELURUH army (joiner pun kepakai). Material Satin/Gilded/Artisan (BUKAN Forgehammer/Mithril). Urutan PIECE: Weapon \u2192 Chest(HP) \u2192 \u2026 \u2192 Helmet terakhir. Urutan TIPE: Inf\u2192Archer\u2192Cav. SET: samakan 6/6 ke tier sama dulu, baru naik 1.'],
  ['\u26a0 Forge \u2014 jangan judi','JANGAN gamble material. Tabung sampai cukup untuk jaminan 100% rarity, baru forge.'],
  ['\ud83d\udca1 Economy Set','Bikin set gear KEDUA murah khusus Construction + Research Speed \u2014 dipakai saat lagi bangun/riset.'],
];
/* Item/Gear HERO (unlock TC15). Sumber: kingshotguide.org. [hero, peran, 2-piece, target] */
const HERO_GEAR=[
  ['Zoe','Garrison \u00b7 INTI','Gloves + Belt (Defense/Health)','Lv20'],
  ['Petra','Rally leader Cav','Helmet + Boots (Attack/Lethality)','Lv20'],
  ['Marlin','Rally leader Archer','Helmet + Boots (Attack/Lethality)','Lv20'],
  ['Jabel','Garrison awal','Gloves + Belt','Secukupnya \u2192 ganti ke Zoe/Petra'],
];
const CHARM_INFO=[
  'Unlock TC25 (maks Lv22). Diatur per TIPE PASUKAN (Infantry/Cavalry/Archer), beberapa slot tiap tipe. Tiap charm naikkan LETHALITY + HEALTH saja — BUKAN Attack/Defense (itu Governor Gear).',
  '3 lapis: Level + Design (Basic\u2192Advanced) + Enhancement.',
  'F2P: prioritas tipe Infantry → Archer → Cavalry. Semua ke Lv10 dulu, baru Design. Biaya Charm Design MELONJAK setelah Lv10 → push 1 charm saja ke atas (maks Lv22).',
  'Skor di Officer Project Type 2 (Charm Designs, mulai Minggu) \u2014 spend Charm Design di situ.',
];

/* ── Pets ── */
const PETS=[
  {n:'Gray Wolf',w:1,day:'~55',role:'Ekonomi',skill:'Construction Aide: +5-15% kecepatan konstruksi (pakai SEBELUM upgrade besar)',f2p:'Lv15-20 saja, jangan over-invest',pri:'C'},
  {n:'Lynx',w:1,day:'~55',role:'Utility',skill:'Comforting Embrace: +60 stamina (instan)',f2p:'CAP Lv20 (pas 4 Pet Adventure/hari). Lebih = boros',pri:'B'},
  {n:'Bison',w:1,day:'~55',role:'Utility',skill:'Grip of the Titan: 1 gather tile selesai instan',f2p:'Lv15-20 (ROI primer Gen2 terbaik)',pri:'A'},
  {n:'Cheetah',w:2,day:'~72-80',role:'Ekonomi',skill:'Scent Mastery: cari 500 Pet Food',f2p:'Lv25-30 (mendanai pet food sendiri)',pri:'A'},
  {n:'Moose',w:2,day:'~72-80',role:'Combat',skill:'Horror Stare: \u22125% enemy squad HP',f2p:'WAJIB Lv15 \u2192 gate menangkap Lion',pri:'C'},
  {n:'Lion',w:3,day:'~113',role:'Ekonomi \u2605',skill:'Gift of the King: hasilkan item (Truegold/Forgehammer/gear mats) tiap ~1-2 hari',f2p:'#1 PRIORITAS F2P \u2014 ROI jangka panjang terbaik',pri:'S'},
  {n:'Grizzly Bear',w:3,day:'~113',role:'Combat',skill:'The Howler: +30% march speed, \u22125% enemy lethality',f2p:'Opsional',pri:'B'},
  {n:'Giant Rhino',w:4,day:'~190',role:'Combat',skill:'Wild Charge: +10% Attack semua squad',f2p:'\u2192Lv30 gate Mighty Bison',pri:'B'},
  {n:'Mighty Bison',w:4,day:'~190',role:'Combat \u2605',skill:'Fearless Roar: +15.000 Squad Capacity 2 jam',f2p:'Bantu bahkan saat JOIN rally \u2014 prioritas tinggi',pri:'S'},
  {n:'Great Moose',w:5,day:'~270',role:'Combat',skill:'Antler Impact: +150.000 Rally Capacity',f2p:'Late-game',pri:'A'},
  {n:'Alpha Black Panther',w:5,day:'~270',role:'Combat',skill:'Deadly Bite: +10% Troop Lethality',f2p:'Late-game',pri:'A'},
  {n:'Regal White Lion',w:6,day:'~350',role:'Combat',skill:'Territorial Power: +10% Squad Defense 2 jam',f2p:'Late-game (Gen6)',pri:'A'},
  {n:'Ironclad War Elephant',w:6,day:'~350',role:'Combat',skill:'Elephant’s Guard: +10% Squad Health 2 jam',f2p:'Late-game (Gen6)',pri:'A'},
];

/* ── Daily / Weekly ── */
const DAILY_TASKS=[
  ['Klaim VIP daily chest','Reward gratis sesuai level VIP'],
  ['Recruit/advance hero gratis','Kumpulkan shard hero'],
  ['Selesaikan 5 tier Daily Mission','Truegold + gem (loop resource utama F2P)'],
  ['Habiskan Governor Stamina (gathering/hunt)','Stamina overcap = boros'],
  ['Jaga march gathering tetap jalan','Income resource terus-menerus'],
  ['Jaga antrian Bangun & Riset tidak kosong','Queue nganggur = progres hilang'],
  ['Arena 5\u00d7 (trik: serang di menit terakhir)','Gem + medallion'],
  ['Mystic Trial 5\u00d7 (dungeon rotasi)','Crystal/chest, hangus kalau tak dipakai'],
  ['Spam "Help All" alliance','Speedup gratis timbal balik'],
  ['Donasi Alliance Tech','Buff riset alliance'],
  ['Klaim Alliance gift/chest','Resource & speedup gratis'],
  ['Bear Hunt rally (window ~30mnt)','Sumber Forgehammer UTAMA (harian) - juga dari pet Lion & event'],
  ['Jalankan Intel/Watchtower mission','Resource+shard, nilai event tinggi (6k/KvK)'],
  ['Aktifkan buff online/territory/decree','Buff gratis sementara'],
  ['Redeem gift code baru (tab Kode)','Resource/speedup gratis'],
];
const WEEKLY_TASKS=[
  ['Strongest Governor (7 hari)','Gem/speedup besar \u2014 align promosi troop ke combat day'],
  ['Tri-Alliance Clash (Sabtu ~60mnt)','Reward PvP alliance'],
  ['Swordland Showdown (2 minggu, Minggu)','Reward PvP lintas-server'],
  ['Alliance Championship/Mobilization','Reward poin alliance'],
  ['KvK \u2014 Kingdom of Power (~minggu ke-4)','Event reward terbesar (lihat KvK Prep)'],
  ['Simpan speedup untuk event Construction/Research','Ubah progres jadi poin event'],
];
/* Recurring events (hari-dalam-minggu WIB: 0=Min..6=Sab). Jam pasti per-kingdom — cek in-game. */
const RECURRING_WEEKLY=[
  {id:'viking',n:'Viking Vengeance',gi:'⚔',dows:[2,4],note:'Sel & Kam (~40mnt) · defense/reinforce · pekan aktif cek game',settable:true},
  {id:'triclash',n:'Tri-Alliance Clash',gi:'🛡',dows:[6],note:'Sabtu (~60mnt) · rebut titik',settable:true},
  {n:'Swordland Showdown',gi:'🗡',dows:[0],note:'Minggu (2-mingguan) · lintas-server'},
];
const RECURRING_DAILY=[
  {id:'bear',n:'Bear Hunt — Trap 1',gi:'🐻',note:'harian (~30mnt, jam diatur aliansi) — sumber Forgehammer',settable:true,daily:true},
  {id:'bear2',n:'Bear Hunt — Trap 2',gi:'🐻',note:'PILIH SATU: hanya bisa serang 1× — ikut Trap 1 ATAU Trap 2, bukan keduanya',settable:true,daily:true},
  {n:'Arena',gi:'🥊',note:'harian 5×, reset 07:00'},
  {n:'Mystic Trial',gi:'🔮',note:'Sen-Sel Coliseum · Rab-Kam Forest · Jum-Sab Nexus · Min semua'},
];

/* ── Item ROI (KvK) & speedup guide ── */
/* SUMBER KANONIK angka poin KvK. Angka 40k/15k/8k dst yang disebut di
   KVK_PREP & EVENT_TEMPLATES.spend harus cocok dengan tabel ini. */
const POINTS=[
  {item:'Mithril',kvk:'40.000',note:'\u2713 Item TERBAIK. Skor hari Gear (D4/D5)'},
  {item:'Tempered Truegold',kvk:'30.000',note:'(?) belum terverifikasi'},
  {item:'Advanced Taming Mark',kvk:'15.000',note:'\u2713 Skor hari Pet (D3/D5)'},
  {item:'Hero Roulette (1 spin)',kvk:'8.000',note:'\u2713 Skor hari Skill (D2)'},
  {item:'Mythic Widget',kvk:'8.000',note:'\u2713 Skor hari Gear. Jangan beli mahal'},
  {item:'Intel Mission',kvk:'6.000',note:'\u2713 GRATIS \u2014 simpan utk hari skor (D1/D3)'},
  {item:'Master Emblem',kvk:'6.000',note:'(?) belum terverifikasi'},
  {item:'Forgehammer',kvk:'4.000',note:'\u2713 Skor hari Gear (D4/D5)'},
  {item:'Mythic Shard',kvk:'3.040',note:'\u2713 Skor hari Skill (D2)'},
  {item:'Truegold',kvk:'2.000',note:'\u2713 upgrade bangunan (tiap hari)'},
  {item:'Epic Shard',kvk:'1.220',note:'\u2713 D2'},
  {item:'Common Taming Mark',kvk:'1.150',note:'\u2713 D3'},
  {item:'Truegold Dust',kvk:'1.000',note:'(?) belum terverifikasi'},
  {item:'Rare Shard',kvk:'350',note:'\u2713 D2'},
  {item:'Speedup (/menit)',kvk:'30',note:'\u2713 vs Armament cuma 1/menit'},
];
const ITEM_GUIDE=[
  ['\ud83c\udfd7\ufe0f Speedup Construction','TAHAN','Pakai di hari City Construction (KvK D1/D5, SG D1, HoG D1) untuk SELESAIKAN bangunan.'],
  ['\ud83d\udd2c Speedup Research','TAHAN','Pakai di hari Research/Skill (KvK D2, SG D3/D5).'],
  ['\u2694\ufe0f Speedup Training','TAHAN','Pakai di hari Combat/Troop (KvK D4, SG D4/D6, HoG D3). Stage T9 dulu, promote di window.'],
  ['\u2764\ufe0f Speedup Healing','BEBAS','BUKAN item skor. Pakai saat perang/KvK. Jangan ditahan.'],
  ['\ud83d\udc8e Gem','TAHAN','Untuk Hero Roulette \u2014 terutama HoG D2 (+90.000/spin!).'],
  ['\ud83d\udd11 Kunci (Gold/Epic Keys)','TAHAN','Recruit/roulette di hari Hero Dev (HoG D2).'],
  ['\ud83e\uddb8 Hero Shard','TAHAN','Hari Hero Dev (KvK D2, SG D2/D7, HoG D2/D7).'],
  ['\ud83d\udc3e Advanced Taming Mark','TAHAN','Hari Pet/Skill (KvK D3, SG D3) = 15.000 poin/buah.'],
  ['\ud83d\udd28 Forgehammer / Mithril','TAHAN','Hari Gear (KvK D4, Armament Type2, Officer). \u26d4 jangan Armament Type1.'],
];

/* ── KvK Prep ── */
const KVK_PREP={
  target:'Target 200.000 poin/hari = State Medal. Kejar threshold harian, BUKAN ranking.',
  stockpile:[
    'H-30\u2192H-21: identifikasi gap power, STOP spending casual item ber-skor KvK.',
    'H-20\u2192H-11: train troop (stage T9 utk promote), upgrade gear, atur rencana alliance.',
    'H-10\u2192H-4: hard-save item bernilai tinggi.',
    'H-3\u2192H-1: KOSONGKAN hospital, set preset formasi, cek jadwal battle (19:00 WIB), pasang shield akhir prep.',
  ],
  buffs:'Sebelum spend item Hari-1: aktifkan Gray Wolf (pet) + Double Time Decree + Chief Minister.',
  days:[
    ['D1','Construction + Intel (6k/misi) + Truegold building'],
    ['D2','Hero \u2014 Roulette (8k) + Mythic Shard + Master Emblem (6k)'],
    ['D3','Advanced Taming Mark (15k each) \u2014 hari terbesar non-whale'],
    ['D4','Gear & Troops \u2014 Mithril (40k!) + promote T10\u2192T11 (75/unit) + Widget (8k)'],
    ['D5','Cleanup \u2014 semua item skor lagi, buang sisa simpanan'],
    ['Battle','Kontrol castle 2,5 jam. Ikut min. 1 rally/garrison \u2192 State Medal ke-6.'],
  ],
  revive:'Revive: 30% base + 10% Medical Satchel + Rescue Orders (s/d 50) \u2192 cap 90%. Castle: Enlistment ~70%.'
};

/* ── Ensiklopedia event (condensed, refer ke SITUATIONS) ── */
const EVENTS_INFO=[
 {g:'Rutin (harian / mingguan)', items:[
   {n:'Bear Hunt (Bear Trap)',cat:'PvE \u00b7 harian \u00b7 PENTING',freq:'Per siklus (aliansi pasang 2 trap, jam beda)',what:'Rally beruang bareng aliansi pakai stamina. Beruang = INFANTRY \u2192 ARCHER +10%. Sumber utama Forgehammer. \u26a0 Hanya bisa serang SATU KALI per siklus \u2014 pilih Trap 1 ATAU Trap 2 sesuai jam onlinemu; sudah ikut satu, BT berikutnya muncul siklus depan.',sit:'bear-trap'},
   {n:'Mystic Trial',cat:'PvE \u00b7 mingguan',freq:'Rotasi harian: Sen-Sel Coliseum \u00b7 Rab-Kam Forest+Crystal \u00b7 Jum-Sab Nexus+Molten \u00b7 Min Radiant Spire',what:'\u2192 Detail 6 zona + kalkulator formasi: tab Event \u2192 sub-tab \ud83d\udd2e Mystic Trial. Dungeon solo. Sumber Misty Crystal \u2192 Mithril (bottleneck crafting gear). Kerjakan tiap buka. \u2694 COLISEUM (Sen-Sel) = "gear-only": Pet/Charm/Governor Gear/Academy DIABAIKAN \u2014 cuma Hero Gear (per-hero) + troop + skill yang dihitung. Formasi 50/10/40; rotasi 1 set Hero Gear terbaik antar tim (gear-swap) > sebar gear lemah. F2P: tembus Stage 10. Reward Crystal + Hero Gear material. CATATAN: Coliseum = satu-satunya tempat Hero Gear-mu kepakai PENUH (di rally kamu joiner \u2192 Hero Gear sia-sia), jadi 1 set Hero Gear rapi terbayar di sini.',sit:'coliseum'},
   {n:'Hall of Heroes',cat:'PvE \u00b7 hero',freq:'~3 hari',what:'Pertarungan hero bertahap. Sumber shard Marlin (F2P) + mat progres hero.'},
 ]},
 {g:'Aliansi & PvP besar', items:[
   {n:'Viking Vengeance',cat:'Aliansi \u00b7 defense \u00b7 PENTING',freq:'Tiap 2 minggu \u00b7 Sel & Kam (~40mnt)',what:'20 wave Viking AI. Reinforce = cara skor #1 F2P: KOSONGKAN kota, kirim semua Inf+Cav reinforce ally ONLINE \u2014 kill point dihitung per-Viking yg dibunuh troop-MU. Hero DIKIRIM = DAMAGE/Lethality (Chenko/Amane/Yeonwoo), BUKAN defensif; 3 hero defensif (Jabel/Howard/Quinn) + Archer tinggal di rumah (archer baru ikut wave 16+). Wave online-only 7/14/17; wave HQ 10/20 (recall 1 march, Howard shield-inf). Jangan heal/padamkan api saat event. Reward: Governor Gear (Satin+Gilded Thread).',sit:'viking'},
   {n:'Sanctuary Battle',cat:'Aliansi \u00b7 season',freq:'Per season (8 fase)',what:'Rebut & tahan Sanctuary. F2P = JOINER rally. RPS combat.',sit:'sanctuary'},
   {n:'Fortress Battle',cat:'Aliansi \u00b7 season',freq:'Per season',what:'Rebut Fortress \u2014 bernilai 2 season point. Koordinasi aliansi penuh.',sit:'fortress'},
   {n:'Kingdom of Power (KvK)',cat:'Aliansi \u00b7 musiman \u00b7 PENTING',freq:'~hari 70+ \u00b7 tiap 4 minggu',what:'2 kerajaan berperang + Castle Battle (19:00 WIB). Combat = RPS. Jatuhkan rally dalam 1-5 detik.',sit:'kvk-rally'},
   {n:'All Out (Kill Event)',cat:'PvP \u00b7 server \u00b7 PENTING',freq:'~2 hari',what:'Seluruh server saling serang. F2P: SHIELD + farm gatherer + incar troop tier tinggi.',sit:'all-out'},
   {n:'Strongest Governor',cat:'Solo \u00b7 poin',freq:'7 hari',what:'Kompetisi poin harian per tema. TAHAN speedup \u2192 ledakkan di hari temanya.',tpl:'sg'},
   {n:'Hall of Governors (HoG)',cat:'Solo \u00b7 poin',freq:'~tiap 14 hari (mulai ~hari 6)',what:'Poin dari spending per tema. Tahan item \u2192 selesai di hari tema.',tpl:'hog'},
 ]},
 {g:'Server-age (sekali, ikut umur)', items:[
   {n:'Burst of Life',cat:'Server baru \u00b7 milestone',freq:'Hari 0-6 (sekali)',what:'SELESAIKAN upgrade/riset/troop SEKARANG (kebalikan "tahan") \u2192 kejar 4M power. Reward: City Skin + gem.'},
   {n:'Milestone umur server',cat:'Pembukaan fitur',freq:'Hari tertentu',what:'Pembukaan Sanctuary, Plains, Fortress, Truegold dll \u2014 lihat Kalender Server.'},
   {n:'Dawn Expedition',cat:'Server baru \u00b7 battle-pass',freq:'7 hari (early kingdom)',what:'Misi harian \u2192 Dawn Point \u2192 reward track. F2P: kerjakan misi GRATIS tiap hari (boost early-game terkuat, tanpa spend). Trap: jangan beli pass level pakai gem \u2014 track gratis sudah kasih reward utama.'},
   {n:'War Preparation',cat:'build \u00b7 Gen 1',freq:'2 hari (early kingdom)',what:'Event Gen 1 SAJA, 2 task \u2014 kenalkan Forgehammer (800 poin=1 hammer) + speedup training (1 poin/mnt). F2P: selesaikan 2 task utk hammer gratis. Trap: naikkan TC ke 20 SEBELUM event (TC20 = syarat pakai Forgehammer).'},
 ]},
 {g:'Aliansi mingguan & PvP rutin', items:[
   {n:'Alliance Brawl',cat:'Aliansi \u00b7 PvP',freq:'~6,5 hari',what:'Rally aliansi terkoordinasi. Ikut rally yang dipanggil; sumbang poin & speedup di dalam window.'},
   {n:'Tri-Alliance Clash',cat:'Aliansi \u00b7 PvP',freq:'Sabtu (~60 mnt)',what:'3 aliansi bentrok rebut titik. Hadir tepat waktu, ikut rally/garrison; reward PvP aliansi.'},
   {n:'Swordland Showdown',cat:'Lintas-server \u00b7 PvP',freq:'2-mingguan \u00b7 battle Minggu (1 jam)',what:'PvP 2-Legion lintas-server. Pasukan cuma LUKA \u2192 auto-heal penuh setelah keluar, jadi main agresif. Fase: Voting 2h \u2192 Registrasi 2h \u2192 Matchmaking 2h \u2192 Battle 1 jam (eligible top-20 aliansi). F2P (support/joiner): farm Undercellar & Baggage Train (sering diabaikan = poin aman), reinforce, join rally. Rank PRIBADI bayar lebih besar dari menang aliansi \u2192 fokus Relic Point-mu. \u26a0 WAJIB kosongkan infirmary sebelum battle (pasukan luka = tak bisa masuk).'},
   {n:'Alliance Championship / Mobilization',cat:'Aliansi \u00b7 misi',freq:'Berkala',what:'Kumpul poin aliansi dari misi (gather/help/train/spend). Mobilization: ambil refresh GRATIS tiap hari, beli attempt 50 & 200 gem (sering net-profit ~100 gem balik/200 poin), HINDARI attempt 1.000 gem. Championship: snapshot stat LOCK saat registrasi \u2192 nyalakan SEMUA buff sebelum confirm (butuh TC10). Struktur: 6 aliansi/bracket, 5 ronde, 3 LANE; hanya TOP 20 (by power) yang dihitung; menang 2 dari 3 lane = menang ronde; maks 2 kill/member/ronde. Reset Senin (UTC): registrasi 2h + matchmaking 1h + tanding ~3h (11 jam atur lane antar ronde; Ronde 1 buta, lawan terlihat R2+). STRATEGI 2-1: tumpuk pemain terkuat di 2 lane, korbankan 1 (margin kalah tak penting \u2014 yang penting menang 2 lane). Deploy troop SEBELUM tanding (troop yang lagi march/heal/reinforce tak ikut). Tier: Stone\u2192Iron\u2192Bronze\u2192Silver\u2192Gold\u2192Diamond (reward Charm Stone/Forgehammer/Gem/Hero Shard); Championship Badge \u2192 Championship shop. PILIH 1 LANE (1 player = 1 lane): kuat (top-20 power) \u2192 masuk lane yang ditumpuk aliansi; lemah \u2192 bebas/lane korban, tetap hadir utk reward. Ikut arahan R4/R5.',sit:'ac-lane'},
   {n:'Hero Rally',cat:'Aliansi \u00b7 PvE',freq:'Berkala',what:'Rally bareng kalahkan bos hero. Joiner bawa hero ber-Lethality, kirim troop terkuat.'},
   {n:'Flamedragon Tyrant',cat:'Aliansi \u00b7 zona besar',freq:'~10+ hari (5 fase)',what:'Perang multi-aliansi rebut Palace + 4 Aerie; pemenang jadi "Tyrant" 30 hari (bisa beri title buff). F2P: jadi anggota dispatch biasa \u2014 farm Pyrocrystal/escort + milestone poin pribadi. Trap: cuma waktu okupasi RALLY CAPTAIN yang dihitung menang \u2192 F2P fokus milestone pribadi, bukan title.'},
 ]},
 {g:'Event rotasi "spend -> hadiah" (kebanyakan 2 hari)', items:[
   {n:'\u2699 Aturan rotasi (F2P) \u2014 BACA DULU',cat:'panduan',freq:'-',what:'Event-event ini = "lakukan X dapat poin/hadiah". JANGAN boros tiap hari. TAHAN speedup/resource/shard, lalu SELESAIKAN pas event-nya AKTIF -> dobel untung (hadiah event + ranking Strongest Governor/HoG). Cek tab Events dalam game untuk yang sedang aktif.'},
   {n:'Armament Competition',cat:'gear',freq:'2 hari',what:'Poin dari forge/upgrade gear. Type 1: shard/Truegold/Governor Gear. Type 2: Forgehammer/Mithril. JANGAN buang speedup (1 poin/mnt).'},
   {n:'Steel Edge',cat:'poin luas',freq:'2 hari',what:'Event poin LUAS (beda dari Armament yg khusus gear/Truegold) — skor dari bangun/riset/training/gear/beast sekaligus, & buka lebih awal. F2P: tahan speedup + 1 upgrade hampir selesai, lalu selesaikan di window 2 hari → kejar milestone 4 (Gem + Mythic Skill Book). Speedup ~1 poin/menit. Trap: jangan habiskan speedup/material sehari SEBELUM mulai.'},
   {n:'Officer Project',cat:'aliansi',freq:'2 hari',what:'Kembangkan officer aliansi -> poin. Type 2 = Charm Design (mulai Minggu).'},
   {n:'Stand of Arms',cat:'combat',freq:'2 hari',what:'Poin partisipasi tempur / training troop.'},
   {n:'Grow Your Heroes',cat:'hero',freq:'2 hari',what:'Naikkan level/EXP/skill hero -> poin. Pakai EXP & manual di sini.'},
   {n:'City Development',cat:'build',freq:'2 hari',what:'Poin dari konstruksi & power bangunan. Pakai speedup construction.'},
   {n:'Plan your City',cat:'build · Gen 1',freq:'2 hari (early kingdom)',what:'Event Gen 1 SAJA (tak muncul lagi di gen lebih tua). Cuma 2 task: 1 poin per power dari Research/Construction. F2P: antri 1 upgrade/riset besar, selesaikan power-nya di window; pakai Double Time + Saul (potong waktu bangun), tumpuk speedup. Trap: jadwalnya tak pasti → jangan habiskan speedup sehari sebelum.'},
   {n:'Power Up',cat:'power',freq:'2 hari',what:'Poin dari kenaikan power apa pun (bangun/riset/troop/hero). Hari fleksibel.'},
   {n:'Develop New Tech',cat:'research',freq:'rotasi',what:'Poin dari research. Tahan speedup research -> pakai di sini.'},
   {n:'Working Overtime',cat:'produksi',freq:'rotasi',what:'Poin dari produksi/aktivitas. Selesaikan tugas produksi di window.'},
   {n:'Path of Growth',cat:'progres',freq:'~7 hari',what:'Misi progres bertahap -> hadiah growth. Selesaikan tier-nya.'},
   {n:'Champion\u2019s Way',cat:'progres',freq:'~3 hari',what:'Tantangan progres -> hero shard & gear.'},
   {n:'Merchant Empire',cat:'gather/dagang',freq:'7 hari',what:'Trading/gathering -> resource. Jalankan gather & tukar.'},
   {n:'Buccaneer Bounty',cat:'gather',freq:'7 hari',what:'Sumber Widget & skin terbaik F2P. ATURAN: Corsair Keys PERSIST antar event, Pearls TIDAK → tabung key, habiskan pearl sebelum tutup. Pakai 3 free refresh/hari. Hindari pack "Harbor Tome" 499 coin.'},
   {n:'Golden Glaives',cat:'combat',freq:'3 hari',what:'Tantangan tempur -> gear/shard.'},
   {n:'Desert Trial',cat:'PvE \u00b7 tantangan',freq:'3 hari',what:'Tantangan bertahap di gurun -> hadiah trial (shard/gear/resource). Selesaikan stage sebanyak mungkin di window.'},
   {n:'Cesares Fury',cat:'aliansi · rebel hunt',freq:'bulanan',what:'Buru rebel di peta (level 1→50, pilih 1 kesulitan/run). Stamina: scout 15 · solo 10 · rally 25 (hemat ~2 pakai Diana); full clear ~1.150 stamina. F2P: SELALU bawa Diana (hemat stamina); simpan 5 "Help" untuk rebel level 10/20/30/40/50; ke Captain kirim 1 troop TANPA hero dulu biar semua anggota dapat reward, baru all-in. Reward: shard Mythic + Gem + speedup. Trap: jangan pilih kesulitan di atas power (terkunci, 1 run/event).'},
   {n:'Beast Whisperer',cat:'PvE',freq:'7 hari',what:'Buru beast -> material & EXP. Pakai stamina/Diana (hemat stamina).'},
   {n:'Defeat Nearby Beasts',cat:'PvE',freq:'2 hari',what:'Bunuh beast di sekitar -> poin. Align dgn stamina harian.'},
   {n:'Hero Roulette',cat:'hero gacha',freq:'~3 hari',what:'Spin shard hero pakai GEM/KUNCI. F2P: simpan gem -> spin di HoG D2 (+90.000 poin/spin) untuk Zoe/Petra.'},
   {n:'Mystic Divination',cat:'chance',freq:'berkala',what:'Undian/chance -> hadiah acak. Murah, ambil yang gratis.'},
   {n:'Champagne Fair',cat:'belanja',freq:'berkala',what:'"Unlock F2P sesungguhnya" (muncul ~setelah HoG ke-3, ~bulanan). Tukar shard hero yang SUDAH max-level + skill book surplus → Voucher → Widget/Mithril/Forgehammer/gear. Shard cuma bisa di-scrap kalau heronya max → hoard shard hero yang belum jadi. Tabung Platinum/Gold Key untuk fair ini.'},
   {n:'Call of the Sovereign',cat:'engagement',freq:'~3 hari',what:'Misi engagement -> reward sovereign. Selesaikan tugas harian.'},
   {n:'Arcane Trove / Emporium of Enigma',cat:'chest/toko',freq:'berkala',what:'Peti/toko spesial -> item langka. Beli hanya yang bernilai (hindari judi).'},
   {n:'Fishing',cat:'mini-game · worth',freq:'berkala (muncul ~hari 15)',what:'Mancing — Bait mulai 5, +1 tiap 3 jam, cap 10. Low-effort tapi reward bagus: Gem, shard Mythic, Governor Gear, mat charm, dan Conquest Manual di reward level milestone (tabung kalau tak main Arena). F2P: upgrade gear SEGERA urutan Line → Hook → Sinker (reset tiap musim); pakai "Ocean Prospector Map" gratis di lemparan PERTAMA (gear auto-max = skor besar). Jangan biarkan Bait mentok 10 (regen terbuang). Token sisa auto-convert ke resource di akhir. Jangan beli pass berbayar.'},
   {n:'Eternity\u2019s Reach',cat:'solo',freq:'berkala',what:'Event progres solo -> hadiah bertahap.'},
   {n:'Treasure Raiders',cat:'mining',freq:'3 hari',what:'Tambang tile cari Ultimate Treasure; tiap lantai ke-5 = reward DOBEL. F2P: daily gratis ~26 pickaxe/hari, CARRY-OVER antar event \u2192 tabung. Tip: tile ke-14 di lantai biasa dijamin Ultimate Treasure (\u226414 pickaxe/lantai). Trap: kalau <14 pickaxe, jangan buka \u2014 simpan untuk event berikutnya.'},
   {n:'Truegold Refinement',cat:'Truegold \u00b7 Deals',freq:'barengan All-Out',what:'Kumpul Lesser Truegold \u2192 tukar pack Truegold (tab DEALS, selalu barengan All-Out; butuh Age of Truegold). F2P: Lesser Truegold gratis dari gather 25M (\u00d75) + 50 stamina (\u00d75), CARRY-OVER \u2192 tabung ke pack besar. Trap: gather tak peduli rasio \u2192 pakai gather-boost di bread/wood.'},
   {n:'Windward Voyage',cat:'kapal/voyage',freq:'5 hari dispatch + 1 koleksi',what:'Kirim kapal (8 jam) \u2192 Tidal Treasure Chest (mat governor gear). F2P: 1 Voyager Team gratis + 5 Compass gratis (1/hari, percepat 1 jam); kejar milestone 60 chest. Trap: JANGAN over-merge \u2014 3 Common > 1 Premium; merge sebelum auto-buka di hari koleksi.'},
   {n:'Imperial Consortium',cat:'pack BERBAYAR',freq:'2 hari',what:'Tangga pack berbayar ($0.99-99.99) \u2014 beli tier rendah buka tier atas. F2P: SKIP (spend-only); paling banter pack termurah kalau routenya kasih mat charm/gear yang kamu butuh. Trap: didesain merantai pembelian, gampang boros.'},
   {n:'Truegold Wonders',cat:'Truegold \u00b7 komisi',freq:'mingguan (Age of Truegold)',what:'Komisi mingguan di War Academy \u2192 True Gold dust & gold untuk riset Truegold. F2P: kerjakan komisi GRATIS tiap minggu. (Muncul di kingshot.net; detail tahap verifikasi in-game.)'},
   {n:'Charm Craftsman',cat:'charm \u00b7 poin',freq:'rotasi',what:'Event poin seputar charm / Charm Design. F2P: pakai material charm yang sudah direncanakan, jangan beli khusus event. (Muncul di kingshot.net; verifikasi in-game.)'},
   {n:'Treasure Cove',cat:'chest/spend',freq:'berkala',what:'Event chest + daily task (mirip Buccaneer/Treasure Raiders). F2P: kerjakan daily efisien, BERHENTI sebelum milestone mahal; hanya push kalau overlap event yang memang sudah direncanakan. Bandingkan reward vs biaya tiap tier sebelum lanjut.'},
 ]},
 {g:'Berkala / khusus', items:[
   {n:'Alliance Tech (riset aliansi)',cat:'fitur · aliansi',freq:'permanen (bukan rotasi event)',what:'Riset aliansi dari donasi: Regimentation (naikkan cap member) · Cooperative Protocols (potong waktu tiap Alliance Help) · Adaptive Tools (speed konstruksi aliansi) · Treaties (naikkan cap assist help). F2P: spam Help All harian + donasi ke tech ber-flag "preferred" R4 (+20% reward). Growth dulu, lalu Battle (rally cap), lalu Territory.'},
   {n:'Anniversary Event',cat:'tahunan',freq:'~hari server 365',what:'Perayaan ulang tahun server — milestone & task berhadiah besar. F2P: kejar reward milestone GRATIS, jangan kejar leaderboard berbayar. (Kingdom baru: masih jauh.)'},
   {n:'Update Des 2026 (catatan QoL)',cat:'changelog',freq:'-',what:'Fitur baru relevan: daily mission khusus Mystic Trial; Rebel Invasion quick-battle (unlock TC25); 2 slot formasi tambahan (TC26 & TC30) + bisa menamai formasi (3 huruf); tukar (exchange) material gear/charm berlebih di interface gear.'},
   {n:'Kingdom Transfer',cat:'pindah server',freq:'~tiap 40-60 hari',what:'Kesempatan pindah ke Kingdom lain (gate: ~hari 152 / Truegold Lv5 + Crucible). Ada batas power & biaya. Pikirkan matang \u2014 cek aturan in-game.'},
   {n:'War Preparation',cat:'aliansi \u00b7 jelang KvK',freq:'2 hari (sebelum KvK)',what:'Persiapan perang menjelang KvK. Stage troop, isi formasi, kosongkan hospital, koordinasi aliansi.'},
   {n:'Fight Club',cat:'event tema \u00b7 PvE',freq:'berkala (event tema)',what:'Ring tinju bawah tanah bertema animatronik \u2014 kalahkan lawan demi kesempatan melawan Bear King. Event tema ringan: ikuti attempt gratis harian, kejar milestone, jangan beli attempt berbayar.'},
   {n:'Master System (Master Academy)',cat:'progresi \u00b7 update Apr 2026',freq:'permanen (gate Kingdom Progress \u00b7 TC25 / ~Hari 113)',what:'Quinn berpetualang ke Badlands \u2014 terima komisi Governor, selesaikan tantangan untuk merekrut MASTER yang pindah ke Master Academy di kotamu. Unlock per-kingdom (cek layar Kingdom Progress). Bonus patch: opsi tukar Truegold diskon 50% (limit mingguan). PRIORITAS master F2P (Gen 1): Valora (wajib unlock pertama \u2014 Weapon Obsession = +Forgehammer) \u2192 Pan (ekonomi harian, compound & tak perlu jadi rally lead = ROI F2P terbaik) \u2192 Cassia atau Roman. Fokus 1 master tuntas dulu, jangan sebar.'},
   {n:'Hero Rally',cat:'hero \u00b7 sub-event',freq:'berkala (cek in-game)',what:'Poin dari rekrut/naikkan hero. F2P: klaim recruitment gratis; pakai shard yang memang sudah direncanakan. JANGAN spend gem khusus event ini \u2014 gem paling bernilai di Hero Roulette saat HoG D2 (90.000/spin).'},
   {n:'Arcane Trove',cat:'undian \u00b7 sub-event',freq:'berkala (cek in-game)',what:'Buka peti undian pakai kunci. F2P: pakai kunci GRATIS dari task saja \u2014 odds item top rendah, jangan beli kunci. Klaim milestone gratisnya.'},
   {n:'Develop New Tech',cat:'harian \u00b7 setelah reset',freq:'harian (reset 07:00 WIB)',what:'Sub-event harian: poin dari mulai/selesaikan riset. Mulai riset SETELAH reset biar kehitung; barengkan riset besar dengan hari riset HoG/SG/KvK biar poinnya dobel.'},
   {n:'Power Up',cat:'milestone power',freq:'berkala (obs. pertama ~H18, Kingdom #2114)',what:'Event milestone kenaikan POWER dalam window event \u2014 mirip Burst of Life: power dari upgrade/riset/training/hero dihitung, tiap ambang = chest. F2P: TAHAN penyelesaian upgrade & riset besar untuk diselesaikan DI DALAM window-nya (idealnya barengan hari konstruksi HoG/SG = poin dobel). Tidak perlu spend khusus.'},
 ]},
];

/* ── Mystic Trial: 6 zona (terverifikasi: kingshotguide, kingshotmastery, lootbar,
   Strat Game Sloth, Echo). ratio=[Inf,Cav,Arc]. ── */
const MYSTIC_TRIAL={
  unlockTC:19,
  common:{
    counter:'Inf > Cav > Arc > Inf (archer counter infantry).',
    aiNormal:'~33/33/33 (seimbang)', aiBoss:'~53/27/20 infantry-heavy di boss X-10',
    attempts:'5 attempt/hari per zona — hanya terpakai kalau KALAH (menang = lanjut gratis).',
    raid:'Clear Stage X-10 → unlock Raid → 10 Misty Crystal per stage tiap reset (~7 hari).',
    deploy:'Jangan Quick Deploy (default 33/33/33). Atur via Edit Formation, keluar pakai BACK — JANGAN klik Deploy (buang attempt).',
    rng:'Expedition battle variansinya besar — habiskan semua attempt, pakai tombol Skip.'
  },
  zones:[
   {key:'coliseum',name:'Coliseum',days:'Sen-Sel',stat:'Hero + Hero Gear + Widget',ratio:[50,10,40],unlock:'Langsung',heroes:true,teams:'≤3 team',ownTroops:false,
    tips:['Bawa hero SKILL TEMPUR (hero ekonomi spt Diana/Fahd jadi dead weight).','Pastikan semua hero punya gear minimal; fokus 1 set utama.','Makin dalam butuh 2–3 team → pakai bait-march & swap cavalry.']},
   {key:'forest',name:'Forest of Life',days:'Rab-Kam',stat:'Pet (level + taming marks + combat skill)',ratio:[50,15,35],unlock:'~54 hari (Pet Gen-1)',heroes:false,teams:'tanpa hero',ownTroops:false,
    tips:['Tidak bawa hero — troop hanya menerima stat dari pet.','Combat pet ability AKTIF otomatis (tak perlu trigger manual).','Naikkan level pet & taming marks untuk stat dasar.']},
   {key:'crystal',name:'Crystal Cave',days:'Rab-Kam',stat:'Governor Charm (Lethality + Health)',ratio:[60,20,20],unlock:'TC 25',heroes:false,teams:'tanpa hero',ownTroops:false,
    tips:['Hanya stat Governor Charm yang dihitung — paling "lurus".','Charm beri Lethality & Health (scaling lebih baik dari Atk/Def).','Charm Design = bottleneck utama; prioritas Inf→Arc→Cav, lompat L3→L5 efisien.']},
   {key:'nexus',name:'Knowledge Nexus',days:'Jum-Sab',stat:'Academy + War Academy (riset)',ratio:[50,20,30],unlock:'Langsung',heroes:false,teams:'tanpa hero',ownTroops:false,
    tips:['Tidak bawa hero — andalan Battle Research.','Riset beri squad capacity; jika War Academy terbuka, troop T11 bisa terpakai.','Salah satu zona di mana tier troop dari riset benar-benar membantu.']},
   {key:'molten',name:'Molten Fort',days:'Jum-Sab',stat:'Governor Gear (Attack + Defense)',ratio:[60,15,25],unlock:'TC 22',heroes:false,teams:'tanpa hero',ownTroops:false,
    tips:['Hanya Governor Gear — hero/charm/pet/riset DIABAIKAN (bait-march tidak relevan).','Prioritas upgrade Inf→Arc→Cav; bottleneck material = Artisan Vision.','Set bonus di 3 & 6 piece se-rarity. Gear beri Atk/Def; Lethality/Health dari Charm.']},
   {key:'spire',name:'Radiant Spire',days:'Minggu',stat:'SEMUA stat + VIP + Skin + Oasis',ratio:[50,15,35],unlock:'Langsung',heroes:true,teams:'≤3 team',ownTroops:true,
    tips:['Ujian pamungkas: semua sumber stat berlaku.','Pakai TROOP SENDIRI (bukan T10) → tier tinggi (True Gold+) unggul besar.','Butuh 3 team kuat → bait-march & swap cavalry sangat berguna.']}
  ],
  tactics:[
   ['Bait-march (HANYA Coliseum & Radiant Spire)','Korbankan march pertama (hero lemah, formasi 2-jenis 60/40 Inf/Cav) → AI buang army terkuatnya di situ. Tumpuk hero terbaik di march 2 & 3 (50/20/30) → menang 2 pertarungan berikutnya. Tidak relevan di zona gear/charm/pet/tech.'],
   ['Swap Cavalry (Coliseum & Spire)','Pindahkan hero cavalry terbaik ke march lain & balik formasi DPS jadi 50/40/10 (Inf/Cav/Arc) agar hero cavalry meng-cover 4× lebih banyak troop.'],
   ['Mentok = naikkan stat, bukan formasi','Kalau rasio sudah benar tapi tetap kalah, itu batas investasi. Tingkatkan sumber stat zona tsb (gear/charm/pet/riset).']
  ],
  shop:'Mithril & Charm Design dulu (Charm Design = bottleneck F2P) → Mythic Hero Shard / Dev TP → True Gold Dust → speed-up paling akhir. Court of Knowledge (1–3% dari Trial Chest) = +20% Squad Attack permanen.',
  note:'Komposisi musuh persis per nomor stage & threshold gear belum terdokumentasi (teori). Stage format Chapter-Stage (mis. 14-7), berlanjut ke ratusan level.'
};

/* ── Event templates (scheduler / advisory) ── */
const EVENT_TEMPLATES={
  kvk:{name:'Kingdom of Power (KvK)',len:5,battleWIB:'19:00 WIB',minDay:70,
    days:['D1 City Construction','D2 Basic Skills','D3 Pet Training','D4 Gear & Troops','D5 Combined + Battle'],
    spend:['Pakai construction+research speedup; SELESAIKAN upgrade sekarang','Hero Roulette + Mythic shard','Advanced Taming Mark + pet','Mithril + promote troop T10\u2192T11','Buang SISA semua item (rate penuh)'],
    hold:'speedup (semua), gem, Mythic shard, Truegold, Mithril, Forgehammer, Advanced Taming Mark, troop T9 utk promote'},
  sg:{name:'Strongest Governor',len:7,battleWIB:null,minDay:75,
    days:['D1 City Construction','D2 Hero Dev','D3 Skill Up','D4 Combat','D5 Power Boost','D6 Combat','D7 Hero Dev'],
    spend:['Buang SEMUA speedup (30/mnt) + selesaikan bangunan','Mithril 40k + Roulette + shard','Advanced Taming Mark (15k)','Promote troop (T11 49/unit)','Mithril + buang speedup','Governor Gear + promote troop','Tempered Truegold + Taming Mark + speedup'],
    hold:'speedup (utk D1/D5/D7), Mithril (D2/D4/D5), Advanced Taming Mark (D3), troop T9 (D4/D6), gem'},
  hog:{name:'Hall of Governors',len:7,battleWIB:null,
    days:['D1 Construction/Power','D2 Hero Dev','D3 Train Troops','D4 Beast/Gather','D5 Power Boost','D6 Governor Gear/Charm','D7 Hero Dev'],
    spend:['Pakai SPEEDUP CONSTRUCTION (+research) \u2192 selesaikan bangunan. TAHAN speedup training utk D3.','\u2605 SPIN Hero Roulette (+90.000/spin!) pakai GEM/KUNCI + hero shard','Pakai SPEEDUP TRAINING \u2192 train/promote troop','Rally Terror (+90.000) / bunuh Beast','Forgehammer + Gear Widget','Naikkan Governor Gear','Hero shard + speedup'],
    hold:'gem (utk Roulette D2 = 90k/spin!), troop T9 (D3), Forgehammer/Widget (D5)'},
  armament:{name:'Armament Competition',len:2,battleWIB:null,minDay:65,
    days:['Type 1: shard + Truegold + gov gear','Type 2: hero gear (Forgehammer/Mithril)'],
    spend:['Shard + Truegold + Governor Gear score','Forgehammer + Mithril + Widget'],
    hold:'Forgehammer, Mithril, shard, Truegold. \u26d4 JANGAN buang speedup di sini (1 poin/mnt)!'},
  burst:{name:'Burst of Life',len:7,milestone:true,battleWIB:null,oneTime:true,startDay:0,
    goal:'Kumpulkan POWER (upgrade + riset + train troop + hero) untuk 8 tier milestone: 50rb \u2192 4 juta power. Reward puncak: City Skin + 2\u00d71.000 gem.',
    days:[],spend:[],hold:''},
};
/* SUMBER KANONIK ROI speedup per event (dipakai render encyclopedia + roi card). */
const SPEED_NOTE={kvk:'\u2705 PAKAI speedup (30/mnt) sesuai tema hari',sg:'\u2705 PAKAI speedup (30/mnt) di D1/D5/D7 \u2014 buang bank speedup di sini',hog:'\u26d4 Speedup nyaris tak ber-poin di HoG \u2014 pakai hanya untuk selesaikan upgrade (naik power)',armament:'\u26d4 JANGAN buang speedup di Armament (1 poin/menit)',burst:'\u2705 PAKAI speedup untuk selesaikan upgrade (naik power)'};
/* "Harus ngapain" per event mingguan kingdom (key = titleKey API kingshot.net) */
const WEEKLY_GUIDE={
  sanctuaryBattle:'Join rally aliansi \u2014 bawa SATU joiner di slot-1 (Chenko/Yeonwoo). Menang \u2192 tahan 30 menit.',
  allianceChampionship:'Tim didaftarkan R4/R5 (snapshot buff saat registrasi — aktifkan SEMUA buff dulu!). F2P: daftar kalau diminta, deploy troop SEBELUM tanding, hadir saat jam tanding, klaim reward. Strategi aliansi: 2-1 (tumpuk 2 lane, korbankan 1). Hanya top-20 power yang dihitung.',
  allianceMobilization:'Penuhi kuota poin pribadi: pilih quest \u00d72.5+ yang sesuai rutinitas (train/gather/stamina). Jangan refresh pakai gem.',
  allianceBrawl:'Seperti Mobilization: kerjakan task harian, penuhi kuota poin pribadi untuk reward aliansi.',
  swordlandShowdown:'Match rebut menara \u2014 pasukan PULIH setelah match (tanpa korban permanen). Ikut rombongan besar, jangan solo.',
  triAllianceClash:'3 aliansi rebut wilayah \u2014 ikuti panggilan rally R4/R5. Di luar jam perang: shield.',
  kvkMatchmaking:'Hanya pencocokan lawan KvK \u2014 tak ada aksi. Siapkan stok item & rencana shield untuk KvK.',
  desertTrial:'Kerjakan tantangan harian di tab Events \u2014 reward tiap tahap gratis. Jangan beli attempt.',
  armamentCompetition1:'Skor dari Forgehammer/Mithril/shard/Truegold. \u26d4 JANGAN buang speedup di sini (1 poin/menit).',
  armamentCompetition2:'Skor dari hero gear (Forgehammer/Mithril). \u26d4 JANGAN buang speedup di sini.',
  officerProject1:'Task ringan berhadiah (login, stamina, dsb.) \u2014 selesaikan yang gratis saja.',
  officerProject2:'Task ringan berhadiah \u2014 selesaikan yang gratis saja.',
  mysticDivination:'Undian \u2014 pakai tiket/attempt GRATIS harian saja, jangan beli.',
  fishing:'Bait gratis +1/3 jam (cap 10 — jangan biarkan penuh). Upgrade gear SEGERA: Line → Hook → Sinker (reset tiap musim). Kejar reward level milestone — termasuk Conquest Manual (tabung kalau tak main Arena). Abaikan leaderboard (P2W).',
  champagneFair:'Event tema ringan \u2014 ambil reward gratis, skip pembelian.',
  goldenGlaives:'Event poin kombat ringan \u2014 ikut dari aktivitas normal, jangan spend khusus.',
  eternitysReach:'Progres solo \u2014 reward bertahap dari aktivitas normal, tak perlu spend.',
  defeatBeasts:'Bunuh beast di map \u2014 habiskan semua stamina di hari ini (hemat: hero Diana).',
  vikingsVengeance:'Kosongkan kota, reinforce ally ONLINE. Lineup: tab Hero \u2192 Viking Vengeance.',
  strongestGovernor:'Event skor 7 hari \u2014 ikuti tema harian (lihat Advisory & Ensiklopedia SG).',
  kingsCastle:'Castle Battle: serang TURRET (bukan castle), masuk Forbidden Zone <1 jam sebelum mulai.',
  castleBattle:'Serang TURRET (bukan castle); TP masuk <1 jam sebelum mulai; batch-heal.',
  allOut:'Kill event: SHIELD tiap offline; farm gatherer lawan (injured = killed, tanpa hospital).',
  kvkPrepPhase:'War Preparation: stage troop, isi formasi, kosongkan hospital, koordinasi aliansi.',
  kvkFieldTriage:'Fase pemulihan KvK \u2014 heal pasukan (batch + help aliansi), klaim reward.',
  truegoldWonders:'Komisi mingguan \u2192 True Gold dust & gold. Kerjakan komisi GRATIS di War Academy.',
  charmCraftsman:'Poin dari charm / Charm Design. Pakai material terencana \u2014 jangan beli khusus event.',
  treasureCove:'Event chest + daily task. Kerjakan daily efisien, berhenti sebelum milestone mahal.'
};
const WEEKLY_GUIDE_DEFAULT='Cek detail di tab Events in-game. Aturan F2P: pakai attempt/reward gratis, jangan beli pack.';
/* Jangkar tanggal buka kingdom — sampel tiap 25 ID dari kingshot.net kingdom-tracker
   (88 titik, diambil 2026-06-11, monotonik). Dipakai INTERPOLASI offline (±2-3 hari)
   kalau API/proxy tidak terjangkau; kalau online, tanggal persis tetap dari API. */
const KINGDOM_ANCHORS=[[1,'2025-02-24'],[26,'2025-03-17'],[51,'2025-03-25'],[76,'2025-04-03'],[101,'2025-04-10'],[126,'2025-04-16'],[151,'2025-04-22'],[176,'2025-04-28'],[201,'2025-05-04'],[226,'2025-05-10'],[251,'2025-05-15'],[276,'2025-05-20'],[301,'2025-05-24'],[326,'2025-05-28'],[351,'2025-05-31'],[376,'2025-06-03'],[401,'2025-06-06'],[426,'2025-06-10'],[451,'2025-06-14'],[476,'2025-06-18'],[501,'2025-06-22'],[526,'2025-06-26'],[551,'2025-06-30'],[576,'2025-07-05'],[601,'2025-07-09'],[626,'2025-07-13'],[651,'2025-07-17'],[676,'2025-07-21'],[701,'2025-07-25'],[726,'2025-07-29'],[751,'2025-08-02'],[776,'2025-08-06'],[801,'2025-08-10'],[826,'2025-08-14'],[851,'2025-08-18'],[876,'2025-08-23'],[901,'2025-08-27'],[926,'2025-08-31'],[951,'2025-09-05'],[976,'2025-09-09'],[1001,'2025-09-14'],[1026,'2025-09-18'],[1051,'2025-09-22'],[1076,'2025-09-27'],[1101,'2025-10-02'],[1126,'2025-10-06'],[1151,'2025-10-11'],[1176,'2025-10-17'],[1201,'2025-10-22'],[1226,'2025-10-28'],[1251,'2025-11-03'],[1276,'2025-11-09'],[1301,'2025-11-16'],[1326,'2025-11-22'],[1351,'2025-11-29'],[1376,'2025-12-06'],[1401,'2025-12-14'],[1426,'2025-12-21'],[1451,'2025-12-27'],[1476,'2025-12-31'],[1501,'2026-01-04'],[1526,'2026-01-10'],[1551,'2026-01-17'],[1576,'2026-01-23'],[1601,'2026-01-27'],[1626,'2026-02-01'],[1651,'2026-02-07'],[1676,'2026-02-13'],[1701,'2026-02-18'],[1726,'2026-02-22'],[1751,'2026-02-26'],[1776,'2026-03-04'],[1801,'2026-03-09'],[1826,'2026-03-15'],[1851,'2026-03-22'],[1876,'2026-03-28'],[1901,'2026-04-03'],[1926,'2026-04-11'],[1951,'2026-04-17'],[1976,'2026-04-23'],[2001,'2026-04-28'],[2026,'2026-05-04'],[2051,'2026-05-11'],[2076,'2026-05-17'],[2101,'2026-05-23'],[2126,'2026-05-30'],[2151,'2026-06-04'],[2160,'2026-06-06']];
/* Hari server minimum sebelum event tersedia.
   Sumber: timeline kingshot.net + OBSERVASI in-game (angka observasi = batas atas:
   event terbukti SUDAH ada di hari itu, bisa saja unlock lebih awal).
   Konvensi: hari server 1-based (buka = H1), sama dengan game.
   - swordlandShowdown & fishing: terobservasi aktif di Kingdom #2114 pada
     game-day 15 (10-11 Jun 2026) = batas atas; bisa unlock lebih awal.
   Event tanpa entri = gerbang tak diketahui. */
const WEEKLY_MIN={kvkMatchmaking:70,kvkPrepPhase:70,kvkFieldTriage:70,strongestGovernor:75,
  castleBattle:54,kingsCastle:54,armamentCompetition1:65,armamentCompetition2:65,
  swordlandShowdown:15,fishing:15};
const EV_EMOJI={burst:'\u25c8',hog:'\u25c9',kvk:'\u2620',sg:'\u25a3',armament:'\u25c6'};

/* ── Gift codes cadangan (volatile \u2014 live fetch utama) ── */
/* Community island chest template — re-extracted 2026-06-11 from the reference map image:
   red-cell centroids → iso lattice least-squares snap (mean residual 0.32px, max 0.85px),
   anchored to the printed axis labels (1,10..60 on both lower edges). The grid IS 60×60
   (chest extremes hit x+y=118 exactly = the 60-grid corner); the old 70×70 assumption made
   every point drift and missed 17 chests (42 vs the real 59).
   Coordinates: x along the BLUE (lower-right) axis, y along the GREEN (lower-left) axis,
   y from BOTTOM, 0-based vs the "1" origin (display adds +1 to match the printed labels). */
const ISLAND_N=60;
const ISLAND_SEED=[[59,59],[56,55],[47,57],[51,49],[56,42],[44,50],[38,55],[53,36],[30,58],[47,40],[33,50],[25,53],[40,37],[18,58],[34,40],[55,18],[48,25],[29,44],[39,31],[58,10],[21,47],[23,42],[13,52],[7,56],[48,14],[38,21],[28,31],[1,58],[57,1],[17,38],[49,4],[12,41],[41,11],[22,29],[4,47],[27,23],[29,17],[7,38],[42,1],[12,29],[32,8],[18,19],[23,13],[4,32],[1,35],[6,27],[10,22],[27,2],[16,11],[2,24],[12,13],[7,17],[10,10],[4,16],[18,1],[6,13],[3,11],[8,5],[5,8]];
/* Community terrain template — same extraction run as ISLAND_SEED (per-cell median
   color at every lattice center; 0 ambiguous cells; the 59 'chest' cells matched
   ISLAND_SEED exactly). One string per row, y=0 = BOTTOM row, charAt(x):
   '1' = cleared path on the community route (incl. chest cells), '0' = cactus. */
const ISLAND_TERRAIN=[
'111111100000000000000000000000000000000000000000000000000000',
'111111100000000011100000000000000000000011100000111111111100',
'111111100000000011100000000111000000000011111111111111111110',
'111111111000000011100000000111000000000011111111111111111110',
'111111111000000011100000000111000000000011111111110000001110',
'111111111000000011100000000111000000000011100000000000001110',
'111111100000000011100000000111000000000011100000000000001110',
'001111000000000011100000000111110000000011100000000000001110',
'001111000000000111100000000111111000000011100000000000001110',
'001111111111111111100000000111111111111111100000000000011110',
'001111111111111111100000000000111111111111100000000000011110',
'001111111111111110000000000000111111111111000000000000011100',
'000111100111100000000000000000111000000000000000111111111100',
'000111100011100000000111000000111000000000000000111111111100',
'000111000000000000000111000011111000000000000000111111111100',
'000111110000000000000111111111111111111000000000111000011100',
'000111111110000001111111111111111111111000000000111000011100',
'000011111111111111111111111111011111111000000000111000011100',
'000001111111111111111111011100000000111000000000111000011100',
'000000001111111111100000011100000000111000000000111000000000',
'000000001110000000000000011100000000111000000000111000000000',
'000000111110000000000000011100000000111000000000111000000000',
'001111111110000000000011111100000000000000000000111000000000',
'001111111100000000000011111100000000000000000000111000000000',
'001111111000000000000011111000000000000000000000111000000000',
'000000111000000000000011100000000000000000000000111000000000',
'000000111111100000000011100000000000000000000000000000000000',
'000011111111100000000011100000000000000000000000000000000000',
'000011111111100000000011111110000000000000000000000000000000',
'000011111011100000000011111110000000000000000000000000000000',
'011111100000000000000001111110000000000000000000000000000000',
'011111100000000000000000001110000000011100000000000000000000',
'011111100000000000000000000000000000011100000000000000000000',
'011100000000000000000000000000000000011100000000000000000000',
'011111110000000000000000000000000000011100000000000000000000',
'011111110000000000000000000000000000011100000000000000000000',
'001111110001111111000000000000000000011100000000000111000000',
'000001111111111111111111000000000000011110000011111111000000',
'000011111111111111111111000000000000011111111111111111111000',
'000011111111100111111111000000001111111111111111111111111000',
'000011100011100000000111000000001111111111111111000011111000',
'000011100011100000001111000011111111111110000000000000111000',
'000011100000000000001111111111111110000000000000000000111000',
'000011100000000000001111111111111110000000000000000000000000',
'000011100000000000001111111111011100000000000000000000000000',
'000011100000000000001110000000011100000000000000000000000000',
'000011110000000000001111110000011100000000000000000000000000',
'000011110000000000001111110000011100000000000000000000000000',
'000001110000000000000111110000011100000000000000000000000000',
'000001110000000000000001110000111100000000000000011100000000',
'000001111111110000000001110000111100000000111000011100000000',
'000001111111110000000001110000111000000000111000011100000000',
'000001111111110000111111110000111000011111111011111100000000',
'000001110000000000111111110000111111111111111111111111111000',
'000001110000000000111111100000111111111111111111111111111111',
'011111110000000000111000000000111111111000011111001111111111',
'011111110000000000111000000000111000000000000111000000111111',
'011111100000000000111000000000111000000000000111000000000111',
'011100000000000000111000000000111000000000000000000000000111',
'000000000000000000000000000000000000000000000000000000000111'
];

/* fallback list — refreshed 2026-06-10 from kingshot.net live API */
const GIFT_CODES=[
  ['Kingshot888','aktif per 2026-06-10'],
  ['VIP777','s/d 31-12-2026'],
];

/* ── Kesalahan F2P / Anti-P2W ── */
const MISTAKES=[
  'Pakai gem untuk SELAIN Hero Roulette \u2014 kesalahan F2P #1.',
  'Kejar leaderboard, bukan reward milestone \u2014 stok habis & lumpuh di event berikutnya.',
  'Pakai item langka begitu didapat \u2014 harusnya disimpan untuk hari skornya.',
  'Sebar upgrade ke banyak hero \u2014 fokus 3 hero, bintang > rarity.',
  'Taruh resource di inventory utama, bukan backpack \u2192 dijarah.',
  'Formasi salah / tidak scout sebelum PvP.',
  'Biarkan hospital penuh saat KvK \u2192 pasukan mati permanen.',
  'March sendirian / di luar \u00b13 level TC saat perang \u2014 kill gratis ke whale.',
  'Lewatkan partisipasi alliance (speedup, tech, territory, revive).',
  'Lewatkan Bear Trap \u2014 sumber Forgehammer.',
  'Lupa buff sebelum KvK D1 (Gray Wolf, Double Time, Chief Minister).',
  'Coba jadi rally leader F2P \u2014 Attack Widget itu mahal P2W. Jadilah joiner/defender.',
];
