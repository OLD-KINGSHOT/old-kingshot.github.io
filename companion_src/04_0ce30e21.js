/* ============================================================
   KINGSHOT COMPANION — DATA part 2 (build, pets, progres, event)
   ============================================================ */

/* ── Bangun / Upgrade ── */
const BUILD_ORDER=[
  {t:'Town Center (TC) \u2014 selalu prioritas #1',d:'Begitu satu selesai, langsung mulai berikutnya. Rush ke TC30 (buka T10 + Truegold). Jangan biarkan antrian kosong.'},
  {t:'Embassy = level TC − 1',d:'Prasyarat SETIAP upgrade TC dari 9 ke atas, tanpa kecuali. Ini yang paling sering menyendat progres. Naikkan duluan, jangan tunggu terhalang.'},
  {t:'Academy (riset)',d:'Prasyarat TC di Lv10/16/20/24/28 + pengali pertumbuhan. Fokus Growth (kecepatan konstruksi/riset) > Economy.'},
  {t:'Bangunan militer (Barracks/Range/Stable)',d:'Berputar jadi prasyarat TC: Barracks → Range → Stable → Academy, satu tiap level. Cek prasyarat TC berikutnya sebelum menaikkan.'},
  {t:'Infirmary',d:'Murah & penting \u2014 kapasitas wounded. Prasyarat TC hanya sekali (Infirmary 1 untuk TC9); selebihnya murni buat menampung korban. Jangan cap Lv10.'},
  {t:'Kitchen & Houses',d:'Murah, kasih Gold gratis untuk riset & populasi. Worth dinaikkan.'},
  {t:'\u26d4 Produksi (Mill/Sawmill/Quarry/Iron Mine)',d:'SKIP! Gathering di map 10-100\u00d7 lebih untung. Naikkan hanya jika jadi prasyarat TC.',warn:true},
  {t:'\u26d4 Command Center',d:'Prioritas rendah untuk solo \u2014 hanya jika kamu MEMIMPIN rally. Catatan: Command Center 1 tetap prasyarat TC12, jadi naikkan sekali lalu tinggalkan.',warn:true},
];
const DECREES=[
  ['Double Time','\u221220% waktu konstruksi (bertahan s/d build selesai)','\u2605 Wajib tiap upgrade besar. ~800k Contentment, cd ~23 jam. Aktifkan SEBELUM mulai.'],
  ['Rush Job','Beri instan ~5 hari resource worksite','Cd ~1 hari'],
  ['Urgent Mobilization','Resident bekerja 48 jam, \u221210 mood','Cd ~8 jam'],
  ['Comprehensive Care','Sembuhkan semua Resident sakit','Cd ~4 jam'],
  ['Productivity Day','Produktivitas 100% selama 24 jam, \u221210 mood','Cd ~12 jam'],
  ['Festivities','+50 mood / +30 comfort','Cd ~1 hari'],
];
/* Prasyarat upgrade Town Center, TC2-30.

   Data LAMA di sini salah dan menyesatkan: menyuruh menaikkan "Wall" dan
   "Hospital", padahal Kingshot tidak punya bangunan bernama Wall maupun
   Hospital (yang ada Infirmary). Dua database bangunan lengkap (kingshot.net,
   kingshotguide.org) tak memuat keduanya — hampir pasti tersalin dari game
   lain. Dikonfirmasi user dari dalam game bahwa tabel lama itu ngaco.

   Pengganti disilang-cek di dua sumber untuk SETIAP level (21-22 Jul 2026):
   TC2-15 & TC16-24 = kingshotdata.kr + kingshotdata.com (+ kingshot.net utk 16-24),
   TC25-30 = kingshotdata.kr + kingshotguide.org.

   Dari TC13 ke atas polanya tetap: Embassy (level-1) + satu bangunan yang
   berputar Barracks -> Range -> Stable -> Academy. Dijaga oleh test. */
const TC_PREREQ=[
  ['TC2','Sawmill 1'],
  ['TC3','House 2'],
  ['TC4','Quarry 3'],
  ['TC5','Hero Hall + House 3'],
  ['TC6','Iron Mine 5'],
  ['TC7','Mill 6'],
  ['TC8','Barracks 7'],
  ['TC9','Embassy 8 + Infirmary 1'],
  ['TC10','Range 9 + Academy'],
  ['TC11','Embassy 10 + Stable 10'],
  ['TC12','Embassy 11 + Command Center 1'],
  ['TC13','Embassy 12 + Barracks 12'],
  ['TC14','Embassy 13 + Range 13'],
  ['TC15','Embassy 14 + Stable 14'],
  ['TC16','Embassy 15 + Academy 15'],
  ['TC17','Embassy 16 + Barracks 16'],
  ['TC18','Embassy 17 + Range 17'],
  ['TC19','Embassy 18 + Stable 18'],
  ['TC20','Embassy 19 + Academy 19'],
  ['TC21','Embassy 20 + Barracks 20'],
  ['TC22','Embassy 21 + Range 21'],
  ['TC23','Embassy 22 + Stable 22'],
  ['TC24','Embassy 23 + Academy 23'],
  ['TC25','Embassy 24 + Barracks 24'],
  ['TC26','Embassy 25 + Range 25'],
  ['TC27','Embassy 26 + Stable 26'],
  ['TC28','Embassy 27 + Academy 27'],
  ['TC29','Embassy 28 + Barracks 28'],
  ['TC30','Embassy 29 + Range 29'],
];
const RESEARCH_ORDER=[
  ['1. Tool Enhancement (Research Speed)','Compound ke semua riset berikutnya \u2014 rush pertama'],
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
  tiers:[['T1-T9','Gate per level TC (angka pasti cek game)'],['T10','Town Center 30'],['T11 (Truegold)','War Academy (buka Age of Truegold ~hari 70); riset T11 di umur ~220 + TC30'],['T12 (Tempered Truegold)','TC27+ (Truegold lanjutan; timing pasti verif in-game). Semua tipe ke T11 DULU baru push 1 ke T12']],
  tips:[
    'Promote naik (T9\u2192T10\u2192T11) > train massal tier rendah \u2014 lebih banyak poin event per speedup. TAPI di tier rendah VOLUME menang (banyak T9 > sedikit T10) — bangun volume dulu, promote saat event skor.',
    'Stage troop T9 SEBELUM event, promote DI DALAM window skor (KvK D4, Strongest Governor combat day).',
    'Jaga queue training selalu jalan (durasi panjang sebelum tidur).',
    'JANGAN biarkan hospital penuh \u2192 pasukan mati permanen. Batch-heal pakai slider, bukan speedup.',
    'Floor 5.000 infantry di formasi rally (trigger skill hero infantry). Rasio default (seimbang / musuh tak diketahui) = 50/20/30 — rasio per situasi lihat tabel Formasi.',
  ]
};
const GEAR_INFO=[
  ['Hero Gear (gear hero/char)','Kepakai saat hero-mu MEMIMPIN: rally leader, garrison, DAN expedition (Mystic Trial/Arena) — SIA-SIA hanya saat JOIN rally orang lain. Bangun HANYA 3 hero march utama (1 Inf + 1 Archer + 1 Cav); gear SISA (bukan Forgehammer) boleh ditaruh di hero ke-4/5 untuk team tambahan Mystic Trial. URUTAN PIECE F2P: 1) Infantry Gloves (Health) 2) Archer Helmet (Lethality) 3) Cavalry Helmet (Lethality) 4) Infantry Chest (Health) 5) Archer Boots 6) Cavalry Boots → sisanya stat sekunder. URUTAN TIPE: Infantry → Archer → Cavalry. Slot: Helmet/Boots = Lethality, Gloves/Chest = Health. Tier: abu→hijau→biru→ungu→Mythic(Lv100)→Red(Lv200). Mastery (Forgehammer) buka di Mythic Lv20; Red butuh Lv100+Mastery10 + 2 Mythic korban + TC30/~40 hari, lalu Mithril tiap 20 level. ⚠ reforge Forgehammer rugi 50% — anggap permanen, fokus piece prioritas. Widget/Exclusive Gear = boleh SKIP untuk F2P.'],
  ['Governor/Chief Gear','Buff SELURUH army (joiner pun kepakai). Material Satin/Gilded/Artisan (BUKAN Forgehammer/Mithril). Urutan PIECE: Weapon \u2192 Chest(HP) \u2192 \u2026 \u2192 Helmet terakhir. Urutan TIPE: Inf\u2192Archer\u2192Cav. SET: samakan 6/6 ke tier sama dulu, baru naik 1.'],
  ['\u26a0 Forge \u2014 jangan judi','JANGAN gamble material. Tabung sampai cukup untuk jaminan 100% rarity, baru forge.'],
  ['\ud83d\udca1 Economy Set','Bikin set gear KEDUA murah khusus Construction + Research Speed \u2014 dipakai saat lagi bangun/riset.'],
];
/* Item/Gear HERO (unlock TC15). Sumber: kingshotguide.org. [hero, peran, 2-piece, target] */
const HERO_GEAR=[
  ['Zoe','Garrison \u00b7 INTI (Infantry)','Gloves + Chest (Health)','Lv20'],
  ['Petra','Rally leader (Cavalry)','Helmet + Boots (Attack/Lethality)','Lv20'],
  ['Marlin','Rally leader (Archer)','Helmet + Boots (Attack/Lethality)','Lv20'],
  ['Jabel','Garrison awal (Cavalry)','Gloves + Chest','Secukupnya \u2192 pindahkan gear ke PETRA (sama-sama Cavalry). BUKAN ke Zoe (Infantry \u2014 set beda).'],
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
  {n:'Lynx',w:1,day:'~55',role:'Utility',skill:'Comforting Embrace: pulihkan stamina (~40 di Lv20 cap, 60 di skill maks)',f2p:'CAP Lv20 (pas 4 Pet Adventure/hari). Lebih = boros',pri:'B'},
  {n:'Bison',w:1,day:'~55',role:'Utility',skill:'Grip of the Titan: 1 gather tile selesai instan',f2p:'Lv15-20 (ROI primer Gen2 terbaik)',pri:'A'},
  {n:'Cheetah',w:2,day:'~72-80',role:'Ekonomi',skill:'Scent Mastery: cari 500 Pet Food',f2p:'Lv25-30 (mendanai pet food sendiri)',pri:'A'},
  {n:'Moose',w:2,day:'~72-80',role:'Combat',skill:'Horror Stare: \u22125% enemy squad HP',f2p:'Wajib Lv15 \u2192 gate menangkap Lion',pri:'C'},
  {n:'Lion',w:3,day:'~113',role:'Ekonomi \u2605',skill:'Gift of the King: hasilkan item (Truegold/Forgehammer/gear mats) tiap ~1-2 hari',f2p:'#1 PRIORITAS F2P \u2014 ROI jangka panjang terbaik',pri:'S'},
  {n:'Grizzly Bear',w:3,day:'~113',role:'Combat',skill:'The Howler: +30% march speed, \u22125% enemy lethality',f2p:'Opsional',pri:'B'},
  {n:'Giant Rhino',w:4,day:'~190',role:'Combat',skill:'Wild Charge: +10% Attack semua squad',f2p:'\u2192Lv30 gate Mighty Bison',pri:'B'},
  {n:'Mighty Bison',w:4,day:'~190',role:'Combat \u2605',skill:'Fearless Roar: +15.000 Squad Capacity 2 jam',f2p:'Bantu bahkan saat JOIN rally \u2014 prioritas tinggi',pri:'S'},
  {n:'Great Moose',w:5,day:'~270',role:'Combat',skill:'Antler Impact: +150.000 Rally Capacity',f2p:'Late-game',pri:'A'},
  {n:'Alpha Black Panther',w:5,day:'~270',role:'Combat',skill:'Deadly Bite: +10% Troop Lethality',f2p:'Late-game',pri:'A'},
  {n:'Regal White Lion',w:6,day:'~350',role:'Combat',skill:'Territorial Power: +10% Squad Defense 2 jam',f2p:'Late-game (Gen6)',pri:'A'},
  {n:'Ironclad War Elephant',w:6,day:'~350',role:'Combat',skill:'Elephant’s Guard: +10% Squad Health 2 jam',f2p:'Late-game (Gen6)',pri:'A'},
  {n:'Ironclad War Bear',w:7,day:'~440',role:'Combat',skill:'Ursa’s Rage: kurangi Squad Defense musuh (% verif in-game)',f2p:'Late-game (Gen7)',pri:'A'},
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
  {id:'viking',n:'Viking Vengeance',gi:'⚔',dows:[2,4],note:'Tiap 2 minggu (~30mnt; jam diatur aliansi) · kosongkan rumah + support anggota ONLINE · pekan aktif cek game',settable:true},
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
  {item:'Intel Mission',kvk:'6.000',note:'\u2713 Gratis \u2014 simpan utk hari skor (D1/D3)'},
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
  ['\ud83c\udfd7\ufe0f Speedup Construction','Tahan','Pakai di hari City Construction (KvK D1/D5, SG D1, HoG D1) untuk SELESAIKAN bangunan.'],
  ['\ud83d\udd2c Speedup Research','Tahan','Pakai di hari Research/Skill (KvK D2, SG D3/D5).'],
  ['\u2694\ufe0f Speedup Training','Tahan','Pakai di hari Combat/Troop (KvK D4, SG D4/D6, HoG D3). Stage T9 dulu, promote di window.'],
  ['🪖 Training Capacity Boost','Tahan','Aktifkan SEBELUM antri latih di hari Train Troops (HoG D3, SG D4/D6, KvK D4) → batch lebih besar = lebih banyak troop & poin. Barengkan Speedup Training biar batch SELESAI di dalam window (tepat waktu). ⛔ Jangan aktifkan di hari biasa — durasi terbuang. [verifikasi in-game]'],
  ['\u2764\ufe0f Speedup Healing','BEBAS','BUKAN item skor. Pakai saat perang/KvK. Jangan ditahan.'],
  ['\ud83d\udc8e Gem','Tahan','Untuk Hero Roulette \u2014 terutama HoG D2 (+90.000/spin!).'],
  ['\ud83d\udd11 Kunci (Gold/Epic Keys)','Tahan','Recruit/roulette di hari Hero Dev (HoG D2).'],
  ['\ud83e\uddb8 Hero Shard','Tahan','Hari Hero Dev (KvK D2, SG D2/D7, HoG D2/D7).'],
  ['\ud83d\udc3e Advanced Taming Mark','Tahan','Hari Pet/Skill (KvK D3, SG D3) = 15.000 poin/buah.'],
  ['\ud83d\udd28 Forgehammer / Mithril','Tahan','Hari Gear (KvK D4, Armament Type2, Officer). \u26d4 jangan Armament Type1.'],
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
   {n:'Bear Hunt (Bear Trap)',cat:'PvE \u00b7 harian \u00b7 penting',freq:'Per siklus (aliansi pasang 2 trap, jam beda)',what:'Rally beruang bareng aliansi (TANPA stamina \u2014 rally Bear Trap tidak makan stamina, bisa join sebanyak mungkin). Beruang = INFANTRY \u2192 ARCHER +10%. Sumber utama Forgehammer. \u26a0 Hanya bisa serang SATU KALI per siklus \u2014 pilih Trap 1 ATAU Trap 2 sesuai jam onlinemu; sudah ikut satu, BT berikutnya muncul siklus depan.',sit:'bear-trap'},
   {n:'Mystic Trial',cat:'PvE \u00b7 mingguan',freq:'Rotasi harian: Sen-Sel Coliseum \u00b7 Rab-Kam Forest+Crystal \u00b7 Jum-Sab Nexus+Molten \u00b7 Min Radiant Spire',what:'\u2192 Detail 6 zona + kalkulator formasi: tab Event \u2192 sub-tab \ud83d\udd2e Mystic Trial. Dungeon solo. Sumber Misty Crystal \u2192 Mithril (bottleneck crafting gear). Kerjakan tiap buka. \u2694 COLISEUM (Sen-Sel) = "gear-only": Pet/Charm/Governor Gear/Academy DIABAIKAN \u2014 cuma Hero Gear (per-hero) + troop + skill yang dihitung. Formasi 50/10/40; rotasi 1 set Hero Gear terbaik antar tim (gear-swap) > sebar gear lemah. F2P: tembus Stage 10. Reward Crystal + Hero Gear material. CATATAN: Coliseum = satu-satunya tempat Hero Gear-mu kepakai PENUH (di rally kamu joiner \u2192 Hero Gear sia-sia), jadi 1 set Hero Gear rapi terbayar di sini.',sit:'coliseum'},
   {n:'Hall of Heroes',cat:'PvE \u00b7 hero',freq:'~3 hari',what:'Pertarungan hero bertahap. Sumber shard Marlin (F2P) + mat progres hero.'},
 ]},
 {g:'Aliansi & PvP besar', items:[
   {n:'Viking Vengeance',cat:'Aliansi · defense · penting',freq:'Tiap 2 minggu (~30mnt; jam diatur aliansi)',what:'20 stage Viking AI menyerang semua anggota aliansi. Skor = Viking yang dibunuh troop-MU di rumah anggota lain + Viking yang dibunuh di rumah-MU oleh anggota. Cara F2P: KOSONGKAN rumahmu (3 hero terkuat di Guard Station, keluarkan/tukar sisa troop) biar supporter dapat skor penuh, lalu SUPPORT anggota lain. Stage 7/14/17 = cuma anggota ONLINE diserang (skor besar); stage 10/20 = serang HQ (shield infantry + cavalry tier tinggi, diatur R4/R5). Gagal bertahan 2x → Viking berhenti serang rumah itu. ⛔ Jangan heal troop saat event. Reward: Alliance Coin + material Governor Gear.',sit:'viking'},
   {n:'Sanctuary Battle',cat:'Aliansi \u00b7 season',freq:'Per season (8 fase)',what:'Rebut & tahan Sanctuary. F2P = JOINER rally. RPS combat.',sit:'sanctuary'},
   {n:'Fortress Battle',cat:'Aliansi \u00b7 season',freq:'Per season',what:'Rebut Fortress \u2014 bernilai 2 season point. Koordinasi aliansi penuh.',sit:'fortress'},
   {n:'Kingdom of Power (KvK)',cat:'Aliansi \u00b7 antar-kingdom \u00b7 penting',freq:'Eligible ~hari 70 (umur kingdom), lalu siklus ~4 minggu (matchmaking Sabtu)',what:'Perang ANTAR-kingdom (bukan internal). 4 fase: Matchmaking (2h) \u2192 Preparation (5h, adu poin) \u2192 Battle (serang King\u2019s Castle kingdom LAWAN, 19:00 WIB) \u2192 Field Triage. \u26a0 TIDAK dijamin: kalau matchmaking tak dapat lawan sepadan, KvK batal bulan itu \u2192 dapat "Matchmaking Bye Rewards" (100 Kingdom Coin dll). Menang Preparation = castle-mu aman & kamu yang menyerang. Combat = RPS (counter unit); jatuhkan rally lawan cepat. \u26a1 BEDA dari King\u2019s Castle Battle INTERNAL (~hari 54, biweekly) yang menunjuk King kingdom-mu SENDIRI \u2014 lihat tab Castle.',sit:'kvk-rally'},
   {n:'All Out (Kill Event)',cat:'PvP \u00b7 server \u00b7 penting',freq:'~2 hari',what:'Seluruh server saling serang. F2P: SHIELD + farm gatherer + incar troop tier tinggi.',sit:'all-out'},
   {n:'Strongest Governor',cat:'Solo \u00b7 poin',freq:'7 hari',what:'Kompetisi poin harian per tema. Tahan speedup \u2192 ledakkan di hari temanya.',tpl:'sg'},
   {n:'Hall of Governors (HoG)',cat:'Solo \u00b7 poin',freq:'~tiap 14 hari (mulai ~hari 6)',what:'Poin dari spending per tema. Tahan item \u2192 selesai di hari tema.',tpl:'hog'},
 ]},
 {g:'Server-age (sekali, ikut umur)', items:[
   {n:'Burst of Life',cat:'Server baru \u00b7 milestone',freq:'Hari 0-6 (sekali)',what:'SELESAIKAN upgrade/riset/troop sekarang (kebalikan "tahan") \u2192 kejar 4M power. Reward: City Skin + gem.'},
   {n:'Milestone umur server',cat:'Pembukaan fitur',freq:'Hari tertentu',what:'Pembukaan Sanctuary, Plains, Fortress, Truegold dll \u2014 lihat Kalender Server.'},
   {n:'Dawn Expedition',cat:'Server baru \u00b7 battle-pass',freq:'7 hari (early kingdom)',what:'Misi harian \u2192 Dawn Point \u2192 reward track. F2P: kerjakan misi Gratis tiap hari (boost early-game terkuat, tanpa spend). Trap: jangan beli pass level pakai gem \u2014 track gratis sudah kasih reward utama.'},
   {n:'Oasis & Beyond',cat:'login · beginner',freq:'30 hari (sekali, mulai dari buat akun)',what:'Event login harian 30 hari untuk pemain baru — tiap login buka reward (shard hero, gem, dll). F2P: LOGIN tiap hari & klaim track Gratis; jangan beli track Epic berbayar. Beda dari Path of Growth (task 7 hari) & Dawn Expedition.'},
   {n:'War Preparation',cat:'build \u00b7 Gen 1',freq:'2 hari (early kingdom)',what:'Event Gen 1 SAJA, 2 task \u2014 kenalkan Forgehammer (800 poin=1 hammer) + speedup training (1 poin/mnt). F2P: selesaikan 2 task utk hammer gratis. Trap: naikkan TC ke 20 SEBELUM event (TC20 = syarat pakai Forgehammer).'},
 ]},
 {g:'Aliansi mingguan & PvP rutin', items:[
   {n:'Alliance Brawl',cat:'Aliansi \u00b7 PvP',freq:'~6,5 hari',what:'Rally aliansi terkoordinasi. Ikut rally yang dipanggil; sumbang poin & speedup di dalam window.'},
   {n:'Tri-Alliance Clash',cat:'Aliansi \u00b7 PvP',freq:'Sabtu (~60 mnt)',what:'3 aliansi bentrok rebut titik. Hadir tepat waktu, ikut rally/garrison; reward PvP aliansi.'},
   {n:'Swordland Showdown',cat:'Lintas-server \u00b7 PvP',freq:'2-mingguan \u00b7 battle Minggu (1 jam)',what:'PvP 2-Legion lintas-server. Pasukan cuma LUKA \u2192 auto-heal penuh setelah keluar, jadi main agresif. Fase: Voting 2 hari \u2192 Registrasi 2 hari \u2192 Matchmaking 2 hari \u2192 Battle 1 jam (eligible top-20 aliansi). F2P (support/joiner): farm Undercellar & Baggage Train (sering diabaikan = poin aman), reinforce, join rally. Rank PRIBADI bayar lebih besar dari menang aliansi \u2192 fokus Relic Point-mu. \u26a0 WAJIB kosongkan infirmary sebelum battle (pasukan luka = tak bisa masuk).'},
   {n:'Alliance Championship / Mobilization',cat:'Aliansi \u00b7 misi',freq:'Berkala',what:'Kumpul poin aliansi dari misi (gather/help/train/spend). Mobilization: ambil refresh Gratis tiap hari, beli attempt 50 & 200 gem (sering net-profit ~100 gem balik/200 poin), HINDARI attempt 1.000 gem. Championship: snapshot stat LOCK saat registrasi \u2192 nyalakan SEMUA buff sebelum confirm (butuh TC10). Struktur: 6 aliansi/bracket, 5 ronde, 3 LANE; hanya TOP 20 (by power) yang dihitung; menang 2 dari 3 lane = menang ronde; maks 2 kill/member/ronde. Reset Senin (UTC): registrasi 2h + matchmaking 1h + tanding ~3h (11 jam atur lane antar ronde; Ronde 1 buta, lawan terlihat R2+). STRATEGI 2-1: tumpuk pemain terkuat di 2 lane, korbankan 1 (margin kalah tak penting \u2014 yang penting menang 2 lane). Deploy troop SEBELUM tanding (troop yang lagi march/heal/reinforce tak ikut). Tier: Stone\u2192Iron\u2192Bronze\u2192Silver\u2192Gold\u2192Diamond (reward Charm Stone/Forgehammer/Gem/Hero Shard); Championship Badge \u2192 Championship shop. PILIH 1 LANE (1 player = 1 lane): kuat (top-20 power) \u2192 masuk lane yang ditumpuk aliansi; lemah \u2192 bebas/lane korban, tetap hadir utk reward. Ikut arahan R4/R5.',sit:'ac-lane'},
   {n:'Hero Rally',cat:'Aliansi \u00b7 PvE',freq:'Berkala',what:'Rally bareng kalahkan bos hero. Joiner bawa hero ber-Lethality, kirim troop terkuat.'},
   {n:'Flamedragon Tyrant',cat:'Aliansi \u00b7 zona besar',freq:'~10+ hari (5 fase)',what:'Perang multi-aliansi rebut Palace + 4 Aerie; pemenang jadi "Tyrant" 30 hari (bisa beri title buff). F2P: jadi anggota dispatch biasa \u2014 farm Pyrocrystal/escort + milestone poin pribadi. Trap: cuma waktu okupasi RALLY CAPTAIN yang dihitung menang \u2192 F2P fokus milestone pribadi, bukan title.'},
 ]},
 {g:'Event rotasi "spend -> hadiah" (kebanyakan 2 hari)', items:[
   {n:'\u2699 Aturan rotasi (F2P) \u2014 BACA DULU',cat:'panduan',freq:'-',what:'Event-event ini = "lakukan X dapat poin/hadiah". JANGAN boros tiap hari. Tahan speedup/resource/shard, lalu SELESAIKAN pas event-nya AKTIF -> dobel untung (hadiah event + ranking Strongest Governor/HoG). Cek tab Events dalam game untuk yang sedang aktif.'},
   {n:'Armament Competition',cat:'gear',freq:'2 hari',what:'Poin dari forge/upgrade gear. Type 1: shard/Truegold/Governor Gear. Type 2: Forgehammer/Mithril. JANGAN buang speedup (1 poin/mnt).'},
   {n:'Steel Edge',cat:'poin luas',freq:'2 hari',what:'Event poin LUAS (beda dari Armament yg khusus gear/Truegold) — skor dari bangun/riset/training/gear/beast sekaligus, & buka lebih awal. F2P: tahan speedup + 1 upgrade hampir selesai, lalu selesaikan di window 2 hari → kejar milestone 4 (Gem + Mythic Skill Book). Speedup ~1 poin/menit. Trap: jangan habiskan speedup/material sehari SEBELUM mulai.'},
   {n:'Officer Project',cat:'aliansi',freq:'2 hari',what:'Kembangkan officer aliansi -> poin. Type 2 = Charm Design (mulai Minggu).'},
   {n:'Stand of Arms',cat:'combat',freq:'2 hari',what:'Poin partisipasi tempur / training troop.'},
   {n:'Grow Your Heroes',cat:'hero',freq:'2 hari',what:'Naikkan level/EXP/skill hero -> poin. Pakai EXP & manual di sini.'},
   {n:'City Development',cat:'build',freq:'2 hari',what:'Poin dari konstruksi & power bangunan. Pakai speedup construction.'},
   {n:'Plan your City',cat:'build · Gen 1',freq:'2 hari (early kingdom)',what:'Event Gen 1 SAJA (tak muncul lagi di gen lebih tua). Cuma 2 task: 1 poin per power dari Research/Construction. F2P: antri 1 upgrade/riset besar, selesaikan power-nya di window; pakai Double Time + Saul (potong waktu bangun), tumpuk speedup. Trap: jadwalnya tak pasti → jangan habiskan speedup sehari sebelum.'},
   {n:'Power Up',cat:'power · Gen 1',freq:'2 hari (irregular, early kingdom)',what:'Event Gen 1 SAJA (tak muncul di Gen 2+). Poin dari MENIT speedup konstruksi/riset (1 poin/menit) — bukan dari kenaikan power. Irregular: jadwalnya tak bisa diprediksi. F2P: tahan speedup, selesaikan di window.'},
   {n:'Develop New Tech',cat:'research',freq:'rotasi',what:'Poin dari research. Tahan speedup research -> pakai di sini.'},
   {n:'Working Overtime',cat:'produksi',freq:'rotasi',what:'Poin dari produksi/aktivitas. Selesaikan tugas produksi di window.'},
   {n:'Path of Growth',cat:'progres',freq:'~7 hari',what:'Misi progres bertahap -> hadiah growth. Selesaikan tier-nya.'},
   {n:'Champion\u2019s Way',cat:'progres',freq:'~3 hari',what:'Tantangan progres -> hero shard & gear.'},
   {n:'Merchant Empire',cat:'gather/dagang',freq:'7 hari',what:'Trading/gathering -> resource. Jalankan gather & tukar.'},
   {n:'Buccaneer Bounty',cat:'gather',freq:'7 hari',what:'Sumber Widget & skin terbaik F2P. ATURAN: Corsair Keys PERSIST antar event, Pearls TIDAK → tabung key, habiskan pearl sebelum tutup. Pakai 3 free refresh/hari. Hindari pack "Harbor Tome" 499 coin.'},
   {n:'Golden Glaives',cat:'combat',freq:'3 hari',what:'Tantangan tempur -> gear/shard.'},
   {n:'Desert Trial',cat:'PvE \u00b7 hero Diana \u00b7 sink stamina',freq:'event 3 hari \u00b7 ~biweekly (hilang di Gen 4, diganti Champion\u2019s Way)',what:'Buru beast di MAP pakai stamina (~8/hunt) \u2192 drop Clawshard & Challenger Pouch. MISI UTAMA: Hunt 10 Dreadwolves \u2014 kamu harus INISIASI 10 rally sendiri, JOIN tidak dihitung! \u2192 10 shard Diana (maks 500 shard/event). Diana = hero unggulannya: hemat stamina utk hunt & MULAI rally + march lebih cepat \u2014 selalu bawa dia. Clawshard dipakai untuk hunt; baru bisa ditukar jadi Challenger Pouch SETELAH Diana 5\u2605. Isi 1 pouch: PASTI 5-10 mnt General Speedup + PASTI 1.000 Hero XP; 20% \u2192 100 gem, 50% \u2192 10-30 gem (rata-rata ~30 gem/pouch), 15% \u2192 1 stamina. F2P: sebelum Diana 5\u2605 Tahan claw untuk shard dulu; sesudah 5\u2605, claw\u2192pouch = tempat bagus membuang stamina sisa (gem + speedup + Hero XP), dan shard Diana berlebih bisa di-scrap di Champagne Fair. Tahan speedup hasilnya untuk hari City Construction (SG D1 / KvK D1 / stage Construction HoG) biar dobel jadi poin event. Dahulukan Cesare\u2019s Fury / Defeat Nearby Beasts kalau lagi aktif (poin ranking + shard Mythic). Ini beast MAP \u2014 beda dari Bear Hunt yang TANPA stamina.'},
   {n:'Cesares Fury',cat:'aliansi · rebel hunt',freq:'bulanan',what:'Buru rebel di peta (level 1→50, pilih 1 kesulitan/run). Stamina: scout 15 · solo 10 · rally 25 (hemat ~2 pakai Diana); full clear ~1.150 stamina. F2P: SELALU bawa Diana (hemat stamina); simpan 5 "Cesare’s Accord" (tip: pakai di stage kelipatan-10 utk bonus shard — bukan aturan keras, bisa di stage mana pun yg tak bisa di-clear); ke Captain kirim 1 troop TANPA hero dulu biar semua anggota dapat reward, baru all-in. Reward: shard Mythic + Gem + speedup. Trap: jangan pilih kesulitan di atas power (terkunci, 1 run/event).'},
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
   {n:'Truegold Wonders',cat:'Truegold · milestone',freq:'rotasi (Age of Truegold)',what:'Event milestone bertema Truegold. F2P: TABUNG Truegold (refine Crucible ~10/hari + intel + reward), lalu selesaikan SATU langkah upgrade gedung Truegold (TC dulu) DI DALAM window untuk poin milestone. Trap: jangan sebar Truegold tipis ke banyak gedung. [tahap event verifikasi in-game]'},
   {n:'Charm Craftsman',cat:'charm · poin',freq:'rotasi',what:'Poin dari menaikkan Governor Charm (Charm Guide + Charm Design — keluarga Stand of Arms ~5 poin/Charm Score). F2P: tabung design/guide dari daily, naikkan charm HANYA saat event ini — konsentrasi (level awal lompatan stat besar, L1=+9%). Trap: jangan ratakan 6 slot; jangan habiskan design sehari sebelum. [verifikasi]'},
   {n:'Treasure Cove',cat:'PACK berbayar',freq:'5 hari',what:'⚠ BUKAN grind poin gratis — event peta 5 hari, fragmennya dibuka dengan BELI "Treasure Cove Pack" (spender). F2P: klaim HANYA chest login harian Gratis (ikon terpisah, ada titik merah), selain itu SKIP. Trap: jangan kejar progress bar (butuh pack); grand prize via mail bisa hadiah default, bukan pilihanmu.'},
   {n:'Top Governor — Governor Gear',cat:'poin · gear · ranking',freq:'rotasi (live)',what:'Varian Top/Strongest Governor bertema Governor Gear (ranking 7-hari). F2P: jadwalkan SATU upgrade Governor Gear/charm yang DITahan agar selesai DI window → poin ranking + milestone. Hold mat gear (Satin/Gilded/Artisan), spend breakpoint di window. Trap: jangan buang mat premium ke upgrade marginal. [tema/hari verifikasi]'},
   {n:'Governor Gear Enhancement / Enhance Gear',cat:'poin · hero gear',freq:'rotasi (live)',what:'Poin dari pakai Forgehammer/mat enhance ke Hero Gear (keluarga Stand of Arms ~800 poin/Forgehammer). F2P: TABUNG Forgehammer, pakai HANYA saat event; fokus 1 hero rally utama; kejar Tier 6+ (Tier 1-5 = sia-sia). ⛔ jangan buang speedup. [verifikasi]'},
   {n:'Custom Arms Set',cat:'PACK berbayar',freq:'~2 hari',what:'PACK uang asli (di-tag PACK di kingshot.net) untuk material HERO GEAR — pilih mat dari menu. F2P: SKIP. Kalau low-spender: pilih Enhancement XP vs Lucky Hero Gear Chest sesuai yang kurang. Trap: terlihat "custom/F2P-friendly" tapi pack uang asli; jangan beli mat yang salah.'},
   {n:'Tech Storm',cat:'PACK berbayar',freq:'buka ~hari 3-4',what:'PACK uang asli berisi research speedup/resource — BUKAN kompetisi poin riset. F2P: SKIP pack; tahan riset & dump di hari scoring riset (HoG/SG D5) untuk poin event yang SEBENARNYA. Trap: mengira "Tech Storm" itu event scoring lalu riset di waktu salah.'},
   {n:'Conqueror',cat:'PACK berbayar',freq:'Kam-Sab',what:'PACK uang asli bertema tempur/troop (di-tag PACK di kingshot.net) — BUKAN event kill/training berpoin. F2P: SKIP. Lakukan training/kill untuk event scoring lain (SG/Swordland/KvK), bukan "untuk Conqueror". Trap: namanya seperti kompetisi PvP — padahal cuma bundle toko.'},
   {n:'World Traveler',cat:'PACK berbayar',freq:'saat migrasi/All-Out',what:'PACK uang asli berisi Advanced Teleporter + healing speedup (muncul saat event migrasi/relokasi). F2P: SKIP kecuali kamu memang sedang relokasi state & butuh Advanced Teleporter. Trap: di-drop pas event bikin "butuh teleporter sekarang" = FOMO rekayasa.'},
   {n:'Wishful Emporium',cat:'PACK berbayar',freq:'24 jam (setelah event besar)',what:'PACK bundle uang asli yang bisa dikustom (3 slot pilih item + bonus tetap), muncul ~24 jam setelah event besar. F2P: SKIP (uang asli). Low-spender: salah satu pack terbaik — tumpuk slot ke 1 bottleneck (Forgehammer/Charm Design/gear chest). Trap: JANGAN keliru dgn "Emporium of Enigma" (toko key Gratis) — ini beda & berbayar.'},
 ]},
 {g:'Berkala / khusus', items:[
   {n:'Alliance Tech (riset aliansi)',cat:'fitur · aliansi',freq:'permanen (bukan rotasi event)',what:'Riset aliansi dari donasi: Regimentation (naikkan cap member) · Cooperative Protocols (potong waktu tiap Alliance Help) · Adaptive Tools (speed konstruksi aliansi) · Treaties (naikkan cap assist help). F2P: spam Help All harian + donasi ke tech ber-flag "preferred" R4 (+20% reward). Growth dulu, lalu Battle (rally cap), lalu Territory.'},
   {n:'Anniversary Event',cat:'tahunan',freq:'~hari server 365',what:'Perayaan ulang tahun server — milestone & task berhadiah besar. F2P: kejar reward milestone Gratis, jangan kejar leaderboard berbayar. (Kingdom baru: masih jauh.)'},
   {n:'Moonlit Promise (Ramadan)',cat:'musiman · PvE',freq:'bulanan (event Ramadan, terbatas)',what:'Event musiman Ramadan: (1) Radiant Wishes — nyalakan lentera (gratis) untuk Crescent Emblem → shard hero Mythic; (2) Crescent Bazaar — tukar Emblem untuk Custom Mythic Gear / Forgehammer / Charm Design. F2P: kerjakan task gratis, tukar Emblem ke mat paling langka (Forgehammer/Charm Design). Trap: terbatas waktu — habiskan Emblem sebelum tutup.'},
   {n:'Update Des 2026 (catatan QoL)',cat:'changelog',freq:'-',what:'Fitur baru relevan: daily mission khusus Mystic Trial; Rebel Invasion quick-battle (unlock TC25); 2 slot formasi tambahan (TC26 & TC30) + bisa menamai formasi (3 huruf); tukar (exchange) material gear/charm berlebih di interface gear.'},
   {n:'Kingdom Transfer',cat:'pindah server',freq:'~tiap 40-60 hari',what:'Kesempatan pindah ke Kingdom lain (gate: ~hari 152 / Truegold Lv5 + Crucible). Ada batas power & biaya. Pikirkan matang \u2014 cek aturan in-game.'},
   {n:'KvK Prep Phase',cat:'aliansi \u00b7 jelang KvK',freq:'2 hari (sebelum KvK)',what:'Fase persiapan KvK (terprediksi lewat countdown KvK) \u2014 stage troop, isi formasi, kosongkan hospital, koordinasi aliansi. Beda dari event "War Preparation" Gen-1 (Forgehammer).'},
   {n:'Fight Club',cat:'event tema \u00b7 PvE',freq:'berkala (event tema)',what:'Ring tinju bawah tanah bertema animatronik \u2014 kalahkan lawan demi kesempatan melawan Bear King. Event tema ringan: ikuti attempt gratis harian, kejar milestone, jangan beli attempt berbayar.'},
   {n:'Master System (Master Academy)',cat:'progresi \u00b7 update Apr 2026',freq:'permanen (gate Kingdom Progress \u00b7 TC25 / ~Hari 113)',what:'Quinn berpetualang ke Badlands \u2014 terima komisi Governor, selesaikan tantangan untuk merekrut MASTER yang pindah ke Master Academy di kotamu. Unlock per-kingdom (cek layar Kingdom Progress). Bonus patch: opsi tukar Truegold diskon 50% (limit mingguan). PRIORITAS master F2P (Gen 1): Valora (wajib unlock pertama \u2014 Weapon Obsession = +Forgehammer) \u2192 Pan (ekonomi harian, compound & tak perlu jadi rally lead = ROI F2P terbaik) \u2192 Cassia atau Roman. Fokus 1 master tuntas dulu, jangan sebar.'},
   {n:'Hero Rally',cat:'hero \u00b7 sub-event',freq:'berkala (cek in-game)',what:'Poin dari rekrut/naikkan hero. F2P: klaim recruitment gratis; pakai shard yang memang sudah direncanakan. JANGAN spend gem khusus event ini \u2014 gem paling bernilai di Hero Roulette saat HoG D2 (90.000/spin).'},
   {n:'Arcane Trove',cat:'undian \u00b7 sub-event',freq:'berkala (cek in-game)',what:'Buka peti undian pakai kunci. F2P: pakai kunci Gratis dari task saja \u2014 odds item top rendah, jangan beli kunci. Klaim milestone gratisnya.'},
   {n:'Develop New Tech',cat:'harian \u00b7 setelah reset',freq:'harian (reset 07:00 WIB)',what:'Sub-event harian: poin dari mulai/selesaikan riset. Mulai riset SETELAH reset biar kehitung; barengkan riset besar dengan hari riset HoG/SG/KvK biar poinnya dobel.'},
   {n:'Power Up',cat:'milestone power',freq:'berkala (obs. pertama ~H18, Kingdom #2114)',what:'Event milestone kenaikan POWER dalam window event \u2014 mirip Burst of Life: power dari upgrade/riset/training/hero dihitung, tiap ambang = chest. F2P: Tahan penyelesaian upgrade & riset besar untuk diselesaikan DI DALAM window-nya (idealnya barengan hari konstruksi HoG/SG = poin dobel). Tidak perlu spend khusus.'},
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
    lead:'Cuma skill TEMPUR yang aktif — hero ekonomi (mis. Diana) = dead weight walau power tinggi. Stage dalam butuh 3 team → hero ke-2/3 juga diberi gear.',
    marches:[
     {m:'Team 1 — UTAMA',hero:'Leader combat terkuat + gear terbaik-mu',why:'Power & gear utama ditaruh di sini.'},
     {m:'Team 2 & 3 (stage dalam)',hero:'Hero combat berikutnya, beri gear minimal (purple Lv5 pun membantu)',why:'Stage lanjut butuh 3 team. Trik: reset Armor XP hero utama → pinjam ke hero 2/3 buat tembus stage, lalu reset balik.'}],
    tips:['Bawa hero SKILL TEMPUR — hero ekonomi (cth Diana) jadi dead weight walau power tinggi.','Pastikan semua hero punya gear minimal; fokus 1 set utama.','Makin dalam butuh 2–3 team → siapkan gear di hero ke-2/3 (trik reset Armor XP).']},
   {key:'forest',name:'Forest of Life',days:'Rab-Kam',stat:'Pet (level + taming marks + combat skill)',ratio:[50,15,35],unlock:'~54 hari (Pet Gen-1)',heroes:false,teams:'tanpa hero',ownTroops:false,
    lead:'Hanya hitung PET (level + taming marks + combat skill — aktif OTOMATIS). Hero TIDAK dihitung. Andalan F2P awal: Moose (pet combat pertama, Horror Stare −5% HP musuh); makin tinggi generasi pet combat makin kuat.',
    tips:['Tidak bawa hero — troop hanya menerima stat dari pet.','Combat pet ability AKTIF otomatis (tak perlu trigger manual).','Naikkan level pet & taming marks untuk stat dasar.']},
   {key:'crystal',name:'Crystal Cave',days:'Rab-Kam',stat:'Governor Charm (Lethality + Health)',ratio:[60,20,20],unlock:'TC 25',heroes:false,teams:'tanpa hero',ownTroops:false,
    lead:'Hanya hitung Governor Charm (Lethality + Health). Hero/pet/gear/riset TIDAK dihitung. Prioritas naikkan charm Inf → Archer → Cav (semua Lv10 dulu, baru Design; push 1 charm ke atas, maks Lv22).',
    tips:['Hanya stat Governor Charm yang dihitung — paling "lurus".','Charm beri Lethality & Health (scaling lebih baik dari Atk/Def).','Charm Design = bottleneck utama; prioritas Inf→Arc→Cav, lompat L3→L5 efisien.']},
   {key:'nexus',name:'Knowledge Nexus',days:'Jum-Sab',stat:'Academy + War Academy (riset)',ratio:[50,20,30],unlock:'Langsung',heroes:false,teams:'tanpa hero',ownTroops:false,
    lead:'Hanya hitung Battle Research (Academy + War Academy). Hero TIDAK dihitung. Riset beri squad capacity & tier troop — satu-satunya zona di mana tier troop dari riset benar-benar terpakai (T11 jika War Academy sudah buka).',
    tips:['Tidak bawa hero — andalan Battle Research.','Riset beri squad capacity; jika War Academy terbuka, troop T11 bisa terpakai.','Salah satu zona di mana tier troop dari riset benar-benar membantu.']},
   {key:'molten',name:'Molten Fort',days:'Jum-Sab',stat:'Governor Gear (Attack + Defense)',ratio:[60,15,25],unlock:'TC 22',heroes:false,teams:'tanpa hero',ownTroops:false,
    lead:'Hanya hitung Governor Gear (Attack + Defense). Hero/charm/pet/riset DIABAIKAN. Prioritas upgrade Inf → Archer → Cav; bottleneck material = Artisan Vision; set bonus di 3 & 6 piece se-rarity.',
    tips:['Hanya Governor Gear — hero/charm/pet/riset DIABAIKAN (taktik hero tak berlaku).','Prioritas upgrade Inf→Arc→Cav; bottleneck material = Artisan Vision.','Set bonus di 3 & 6 piece se-rarity. Gear beri Atk/Def; Lethality/Health dari Charm.']},
   {key:'spire',name:'Radiant Spire',days:'Minggu',stat:'Semua stat + VIP + Skin + Oasis',ratio:[50,15,35],unlock:'Langsung',heroes:true,teams:'≤3 team',ownTroops:true,
    lead:'Ujian pamungkas: Semua sumber stat berlaku + pakai TROOP SENDIRI (tier tinggi spt True Gold+ unggul besar). Hero sama seperti Coliseum; hindari hero ekonomi (Diana). Stage dalam butuh 3 team.',
    marches:[
     {m:'Team 1 — UTAMA',hero:'Combat-skill terkuat + gear terbaik + troop tier tertinggi-mu',why:'Power, gear, & troop terbaik di sini (Spire pakai troop sendiri).'},
     {m:'Team 2 & 3 (stage dalam)',hero:'Combat-skill berikutnya, beri gear minimal',why:'Stage lanjut butuh 3 team. Trik: reset Armor XP hero utama → pinjam ke hero 2/3, lalu reset balik.'}],
    tips:['Ujian pamungkas: semua sumber stat berlaku.','Pakai TROOP SENDIRI (bukan T10) → tier tinggi (True Gold+) unggul besar.','Butuh 3 team kuat → siapkan gear & hero di team 2/3 (trik reset Armor XP).']}
  ],
  tactics:[
   ['Siapkan 3 team (Coliseum & Radiant Spire)','Stage dalam butuh 3 team berhero. Beri gear minimal ke semua hero combat. Trik (lootbar): reset Armor XP hero utama yang sudah maks → pinjamkan ke hero ke-2/3 untuk tembus 1 stage, lalu reset balik. CATATAN: urutan hero bertarung RNG (Xora) — tak bisa di-"umpan"/bait-march seperti conquest.'],
   ['Counter dari Battle Report','% troop musuh hanya kelihatan di Battle Report SETELAH kalah. Stage 1-9 seimbang (pakai rasio zona); stage 10 = 53/27/20 infantry-berat → tebalkan infantry-mu jadi meat-shield, archer tetap DPS. Ubah 5-10% tiap percobaan, habiskan 5 attempt.'],
   ['Mentok = naikkan stat, bukan formasi','Kalau rasio sudah benar tapi tetap kalah, itu batas investasi. Tingkatkan sumber stat zona tsb (gear/charm/pet/riset).']
  ],
  shop:'Mithril & Charm Design dulu (Charm Design = bottleneck F2P) → Mythic Hero Shard / Dev TP → True Gold Dust → speed-up paling akhir. Court of Knowledge (1–3% dari Trial Chest) = +20% Squad Attack permanen.',
  note:'Komposisi musuh persis per nomor stage & threshold gear belum terdokumentasi (teori). Stage format Chapter-Stage (mis. 14-7), berlanjut ke ratusan level.'
};

/* ── Event templates (scheduler / advisory) ── */
const EVENT_TEMPLATES={
  kvk:{name:'Kingdom of Power (KvK)',len:5,battleWIB:'19:00 WIB',minDay:70,
    days:['D1 City Construction','D2 Basic Skills','D3 Pet Training','D4 Gear & Troops','D5 Combined + Battle'],
    spend:['Pakai construction+research speedup; SELESAIKAN upgrade sekarang','Hero Roulette + Mythic shard','Advanced Taming Mark + pet','Aktifkan Training Capacity buff → Mithril + promote troop T10→T11','Buang SISA semua item (rate penuh)'],
    hold:'speedup (semua), gem, Mythic shard, Truegold, Mithril, Forgehammer, Advanced Taming Mark, troop T9 + Training Capacity buff utk promote'},
  sg:{name:'Strongest Governor',len:7,battleWIB:null,minDay:75,
    days:['D1 City Construction','D2 Hero Dev','D3 Skill Up','D4 Combat','D5 Power Boost','D6 Combat','D7 Hero Dev'],
    spend:['Buang semua speedup (30/mnt) + selesaikan bangunan','Mithril 40k + Roulette + shard','Advanced Taming Mark (15k)','Aktifkan Training Capacity buff → promote troop (T11 49/unit)','Mithril + buang speedup','Governor Gear + Training Capacity buff → promote troop','Tempered Truegold + Taming Mark + speedup'],
    hold:'speedup (utk D1/D5/D7), Mithril (D2/D4/D5), Advanced Taming Mark (D3), troop T9 + Training Capacity buff (D4/D6), gem'},
  hog:{name:'Hall of Governors',len:7,battleWIB:null,
    /* Susunan terverifikasi HoG #4/#5 (Hero: Hilde, Top 100). Lihat tab HoG utk detail per-iterasi. */
    days:['D1 Power Boost','D2 Hero Dev','D3 Train Troops','D4 Charm Upgrade','D5 Power Boost','D6 Governor Gear','D7 Hero Dev'],
    spend:['Selesaikan upgrade/riset/promote troop naik power (Constr/Research 30, troop 20).','★ SPIN Hero Roulette (+90.000/spin!) pakai GEM/KUNCI + shard (Mythic 35rb/Epic 14rb/Rare 4rb)','Latih/promote troop tier TERTINGGI (Lv10=1.960 vs Lv1=90) + Training Capacity buff','Naikkan Governor Charm (+1.000/score, level awal lompat besar)','Widget Hero Exclusive Gear (100.000!) + Forgehammer (50.000)','Naikkan Governor Gear (+500/score; Mythic level-up 6.250)','Shard hero sisa + buang speedup (300/mnt Constr/Research/Train)'],
    hold:'gem + Widget (utk D2 & D5 = 90rb & 100rb!), troop T9 + Training Capacity buff (D3), Charm design (D4), Forgehammer (D5), speedup (D7)'},
  armament:{name:'Armament Competition',len:2,battleWIB:null,minDay:65,
    days:['Type 1: shard + Truegold + gov gear','Type 2: hero gear (Forgehammer/Mithril)'],
    spend:['Shard + Truegold + Governor Gear score','Forgehammer + Mithril + Widget'],
    hold:'Forgehammer, Mithril, shard, Truegold. \u26d4 JANGAN buang speedup di sini (1 poin/mnt)!'},
  burst:{name:'Burst of Life',len:7,milestone:true,battleWIB:null,oneTime:true,startDay:0,
    goal:'Kumpulkan POWER (upgrade + riset + train troop + hero) untuk 8 tier milestone: 50rb \u2192 4 juta power. Reward puncak: City Skin + 2\u00d71.000 gem.',
    days:[],spend:[],hold:''},
};
/* ── Hall of Governors — data PER-ITERASI per-STAGE (terverifikasi kingshotdata.com + kingshotwiki, Jul 2026) ──
   Satu tabel per iterasi (susunan seperti game): Stage → Task → Poin.
   Task & poin SAMA antar iterasi; yang beda = stage mana yang aktif, Hero of the Season, & ambang leaderboard. */
const _HT={ /* baris task pakai-ulang: [label, poin] */
  roul:['🎰 Hero Roulette (1 spin)','90.000'],
  sM:['🦸 Mythic Hero Shard','35.000'], sE:['🦸 Epic Hero Shard','14.000'], sR:['🦸 Rare Hero Shard','4.000'],
  gath:['🌾 Gather Bread/Wood/Stone/Iron','3 /task'],
  troop:['⚔️ Latih troop Lv1 → Lv10','90 → 1.960'],
  ggr:['🛡️ Governor Gear +1 max score','500'],
  chr:['💠 Governor Charm +1 max score','1.000'],
  wid:['🔨 Widget Hero Exclusive Gear','100.000'], ham:['🔨 Forgehammer (Hero Gear)','50.000'], gxp:['🔨 Hero Gear Enhancement XP (100)','30.000'],
  beast:['🐺 Bunuh Beast Lv1-30','30.000'], terror:['🐉 Rally Terror','90.000'],
  ccC:['🏗️ Power dari Construction','45'], ccR:['🔬 Power dari Research','45'],
  pbC:['🏗️ Power dari Construction','30'], pbR:['🔬 Power dari Research','30'], pbT:['⚔️ Power dari train/promote troop','20'],
  spC:['⏩ Speedup Construction (/mnt)','300'], spR:['⏩ Speedup Research (/mnt)','300'], spT:['⏩ Speedup Train/Promote (/mnt)','300'],
};
/* ── Angka NUMERIK per satuan untuk kalkulator poin ──
   Kunci = kunci _HT di atas (yang dipakai tabel tampilan). Angka TIDAK di-parse dari string
   _HT saat runtime: '90.000' / '3 /task' / '90 → 1.960' adalah teks tampilan yang gampang
   berubah bentuk, dan parser yang diam-diam gagal jauh lebih berbahaya daripada angka ganda.
   Konsistensi keduanya ditegakkan test_21_hog_kalkulator.js — kalau salah satu diubah tanpa
   yang lain, test merah.
   Satuan terverifikasi silang dua sumber (kingshotdata.com + kingshot-data.com, Jul 2026):
   power dihitung PER 1 POWER, charm/gear PER 1 POIN MAX SCORE, troop PER 1 TROOP. */
const HOG_SCORING={
  roul:{pts:90000,unit:'spin'},
  sM:{pts:35000,unit:'shard'}, sE:{pts:14000,unit:'shard'}, sR:{pts:4000,unit:'shard'},
  gath:{pts:3,unit:'task'},
  troop:{pts:[90,120,180,265,385,595,830,1130,1485,1960],unit:'troop'},
  ggr:{pts:500,unit:'score'}, chr:{pts:1000,unit:'score'},
  wid:{pts:100000,unit:'widget'}, ham:{pts:50000,unit:'hammer'}, gxp:{pts:30000,unit:'100 XP'},
  beast:{pts:30000,unit:'beast'}, terror:{pts:90000,unit:'rally'},
  ccC:{pts:45,unit:'power'}, ccR:{pts:45,unit:'power'},
  pbC:{pts:30,unit:'power'}, pbR:{pts:30,unit:'power'}, pbT:{pts:20,unit:'power'},
  spC:{pts:300,unit:'menit'}, spR:{pts:300,unit:'menit'}, spT:{pts:300,unit:'menit'},
};
/* Field gudang → kunci task yang bisa menampungnya. Urutan = prioritas kalau task yang sama
   muncul di beberapa stage; mesin memilih stage berpoin tertinggi (lihat hogPlanScore). */
const HOG_GUDANG=[
  {f:'spin',k:['roul'],lbl:'🎰 Spin Hero Roulette'},
  {f:'sM',k:['sM'],lbl:'🦸 Shard Mythic'},
  {f:'sE',k:['sE'],lbl:'🦸 Shard Epic'},
  {f:'sR',k:['sR'],lbl:'🦸 Shard Rare'},
  {f:'wid',k:['wid'],lbl:'🔨 Widget Hero Exclusive Gear'},
  {f:'ham',k:['ham'],lbl:'🔨 Forgehammer'},
  {f:'gxp',k:['gxp'],lbl:'🔨 Enhancement XP (per 100) — hanya HoG #2'},
  {f:'terror',k:['terror'],lbl:'🐉 Rally Terror — hanya HoG #1'},
  {f:'beast',k:['beast'],lbl:'🐺 Beast Lv1-30 — hanya HoG #1'},
  {f:'chr',k:['chr'],lbl:'💠 Charm: max score NAIK berapa'},
  {f:'ggr',k:['ggr'],lbl:'🛡️ Governor Gear: max score NAIK berapa'},
  {f:'powC',k:['ccC','pbC'],lbl:'🏗️ Power dari Construction'},
  {f:'powR',k:['ccR','pbR'],lbl:'🔬 Power dari Research'},
  {f:'powT',k:['pbT'],lbl:'⚔️ Power dari latih/promote troop'},
  {f:'spC',k:['spC'],lbl:'⏩ Speedup Construction (menit)'},
  {f:'spR',k:['spR'],lbl:'⏩ Speedup Research (menit)'},
  {f:'spT',k:['spT'],lbl:'⏩ Speedup Train/Promote (menit)'},
  {f:'gath',k:['gath'],lbl:'🌾 Task gather selesai'},
];
/* ── Event yang MEMAKAN stamina ──────────────────────────────────────────
   Dipakai untuk mendeteksi otomatis "stamina hari ini terbayar ke mana saja". `id` HARUS
   id kanonik yang dipakai evUpcoming() (titleKey feed atau tipe event umur), supaya
   deteksinya memakai daftar aktif yang sama dengan tab Sekarang — bukan daftar kedua.
   `poinPerHunt` diisi HANYA kalau angkanya terverifikasi; null berarti app menghitung
   jumlah hunt saja dan berkata terus terang bahwa poinnya tak dipublikasikan. */
const STAMINA_EVENTS=[
  {id:'desertTrial',id2:'Desert Trial',nama:'Desert Trial',model:'dt',poinPerHunt:null,
   hasil:'Clawshard & Challenger Pouch → gem, speedup, Hero XP; claw → rally Dreadwolf → shard Diana'},
  {id:'hog',nama:'HoG — stage Beast Slay',model:'hog',stage:'Beast Slay',poinPerHunt:30000,
   hasil:'30.000 poin/beast · Rally Terror 90.000 (hanya HoG #1)'},
  {id:'defeatBeasts',nama:'Defeat Nearby Beasts',model:'hunt',poinPerHunt:null,
   hasil:'poin event per beast — besaran poinnya tak pernah dipublikasikan'},
  {id:'beastWhisperer',nama:'Beast Whisperer',model:'hunt',poinPerHunt:null,
   hasil:'material & Hero EXP dari beast'},
  {id:'cesaresFury',nama:'Cesare’s Fury',model:'rebel',poinPerHunt:null,
   hasil:'shard Mythic + gem + speedup',
   catatan:'ongkosnya beda: scout 15 · solo 10 · rally 25 stamina (hemat ~2 dengan Diana) — tidak ikut hitungan hunt'},
];

/* ── Desert Trial: farming stamina → hasil ──
   Terverifikasi 30 Jul 2026: kingshot.fandom.com + byewiki.com (drop 50/50), kingshotwiki.com
   (isi pouch, 15% stamina), heaven-guardian.com (rally 25 → 20 stamina dengan Diana maks,
   join rally TANPA stamina, maks 50 hadiah partisipasi per event 3 hari).
   Validasi silang model: harapan gem = 0,20×100 + 0,50×20 = 30/pouch — persis angka
   "rata-rata ~30 gem/pouch" yang sudah tercatat di entri Desert Trial jauh sebelum ini. */
const DT_FARM={
  huntStamina:8,          /* ~8 stamina per hunt beast di MAP (catatan lama app) */
  dianaHuntCut:0.20,      /* Iron Constitution: stamina −20% */
  rallyStamina:25, rallyStaminaDiana:20,
  pClaw:0.5, pPouch:0.5,  /* tiap beast: 50% Clawshard / 50% Challenger Pouch */
  dwShard:[2,4],          /* Dreadwolf tumbang → 2-4 shard Diana */
  dwShardMaxEvent:500,    /* batas shard Diana per event */
  pouch:{spd:[5,10],heroXp:1000,gemBig:{p:0.20,amt:100},gemSmall:{p:0.50,amt:[10,30]},stam:{p:0.15,amt:1}},
};
const HOG_DETAIL={
  intro:'Event kompetitif solo tiap 14 hari (mulai H6). Hanya muncul di Generasi 1-2 kingdom. Hero of the Season + susunan stage BERUBAH tiap iterasi. Reward: 4 tier milestone (gratis, tier akhir = gem + skill book) + shard hero dari leaderboard.',
  iters:[
    {no:'#1', hero:'Amadeus', rank:'Top 10', gen:'Gen 1', day:'H6',
     stages:[['1 · City Construction',[_HT.ccC,_HT.ccR]],['2 · Hero Development',[_HT.roul,_HT.sM,_HT.sE,_HT.sR,_HT.gath]],['3 · Train Troops',[_HT.troop]],['4 · Beast Slay',[_HT.terror,_HT.beast]],['5 · Power Boost',[_HT.pbC,_HT.pbR,_HT.pbT]]],
     note:'Satu-satunya HoG dengan Beast Slay (Rally Terror + beast).'},
    {no:'#2', hero:'Amadeus', rank:'Top 10', gen:'Gen 1', day:'H20',
     stages:[['1 · City Construction',[_HT.ccC,_HT.ccR]],['2 · Hero Development',[_HT.roul,_HT.sM,_HT.sE,_HT.sR,_HT.gath]],['3 · Train Troops',[_HT.troop]],['4 · Gather Resources',[_HT.gath,_HT.ccR]],['5 · Power Boost',[_HT.wid,_HT.ham,_HT.gxp,_HT.pbC,_HT.pbR,_HT.pbT]],['6 · Governor Gear',[_HT.ggr,_HT.pbC,_HT.pbR,_HT.pbT]]],
     note:'Beast Slay hilang; muncul Gather & Governor Gear.'},
    {no:'#3', hero:'Amadeus', rank:'Top 10', gen:'Gen 1-2', day:'H34',
     stages:[['1 · Power Boost',[_HT.pbC,_HT.pbR,_HT.pbT]],['2 · Hero Development',[_HT.roul,_HT.sM,_HT.sE,_HT.sR,_HT.gath]],['3 · Train Troops',[_HT.troop]],['4 · Gather Resources',[_HT.gath,_HT.ccR]],['5 · Power Boost',[_HT.wid,_HT.ham,_HT.pbC,_HT.pbR,_HT.pbT]],['6 · Governor Gear',[_HT.ggr]],['7 · Hero Development',[_HT.sR,_HT.sE,_HT.sM,_HT.spC,_HT.spR,_HT.spT]]],
     note:'Sering transisi ke Gen 2. Stage akhir Hero Dev + speedup baru berpoin.'},
    {no:'#4 & #5', hero:'🔥 Hilde', rank:'Top 100', gen:'Gen 2', day:'H48 / H62',
     stages:[['1 · Power Boost',[_HT.pbC,_HT.pbR,_HT.pbT]],['2 · Hero Development',[_HT.roul,_HT.sM,_HT.sE,_HT.sR,_HT.gath]],['3 · Train Troops',[_HT.troop]],['4 · Charm Upgrade',[_HT.chr,_HT.gath,_HT.ccR]],['5 · Power Boost',[_HT.wid,_HT.ham,_HT.pbC,_HT.pbR,_HT.pbT]],['6 · Governor Gear',[_HT.ggr]],['7 · Hero Development',[_HT.sR,_HT.sE,_HT.sM,_HT.spC,_HT.spR,_HT.spT]]],
     note:'Hero GANTI ke Hilde, ambang Top 100 (bukan Top 10) → peluang emas F2P. Muncul Charm Upgrade.'},
  ],
  /* Skala detail (collapsible di bawah tabel utama) */
  troop:[['Lv1','90'],['Lv2','120'],['Lv3','180'],['Lv4','265'],['Lv5','385'],['Lv6','595'],['Lv7','830'],['Lv8','1.130'],['Lv9','1.485'],['Lv10','1.960']],
  govgear:[['Uncommon','1.125'],['Uncommon ★1','1.875'],['Rare','3.000'],['Rare ★1','4.500'],['Rare ★2','5.100'],['Rare ★3','5.400'],['Epic / ★1','3.230'],['Epic ★2 / ★3','3.225'],['Epic T1 / ★1','3.440'],['Epic T1 ★2 / ★3','4.085'],['Mythic (semua ★)','6.250']],
  charm:[['Lv1','625'],['Lv2','1.250'],['Lv3','3.125'],['Lv4','8.750'],['Lv5','11.250'],['Lv6','12.500'],['Lv7','12.500'],['Lv8','13.000'],['Lv9','14.000'],['Lv10','15.000'],['Lv11','16.000']],
  tips:[
    '🎯 HoG #4 (H48) & #5 (H62) = kesempatan EMAS F2P: cukup Top 100 (bukan Top 10) untuk shard Hilde. Fokus kejar leaderboard di dua iterasi ini.',
    '💥 Poin tunggal terbesar: Widget Hero Exclusive Gear = 100.000, lalu Hero Roulette = 90.000/spin. Simpan gem + Widget untuk stage-nya.',
    '⚔️ Troop tier tinggi JAUH lebih berpoin (Lv10 = 1.960 vs Lv1 = 90). Stage Train Troops: latih/promote troop tier TERTINGGI yang bisa, jangan spam tier rendah.',
    '🐉 Hanya HoG #1 punya Beast Slay (Rally Terror 90rb + beast 30rb). HoG #2+ TIDAK — jangan tunggu beast day di HoG #4.',
    '🌾 Gather resource cuma 3 poin/task — abaikan, buang-buang stamina.',
    '⏩ Speedup baru berpoin di stage Hero Dev TERAKHIR (HoG #3/#4/#5) = 300/mnt. Selain itu speedup nyaris tak berpoin — pakai hanya untuk naikin power.',
    '🎁 Milestone reward 4 tier bisa diraih Gratis walau tak masuk leaderboard. Tier akhir = gem + skill book — selalu kejar.',
    '⏳ HoG berhenti setelah #5 (H62-H68) karena rotasi event berpindah ke KvK (gerbang H70) & Strongest Governor (H75) — BUKAN karena "Gen 3", sebab generasi hero ke-3 baru datang di hari ~105-120. Hari transisinya bervariasi antar kingdom, jadi kalau di kingdommu HoG ternyata masih muncul, catat tanggalnya.',
  ],
};
/* Misi jelas per-stage HoG (key = nama stage tanpa nomor). Dipakai render tabel HoG. */
const HOG_STAGE_MISSION={
  'City Construction':'Naikkan POWER dari upgrade bangunan & riset — selesaikan di dalam window (pakai speedup construction).',
  'Hero Development':'Spin Hero Roulette (gem/kunci) & pakai shard untuk naik bintang hero. Roulette = poin terbesar.',
  'Train Troops':'Latih/promote troop — tier makin tinggi makin berpoin. Aktifkan Training Capacity buff dulu.',
  'Beast Slay':'Bunuh beast di peta & rally Terror. Rally Terror = 90.000 (terbesar).',
  'Gather Resources':'Kumpulkan resource di wilderness + sedikit power dari riset. Poin gather kecil — jangan diandalkan.',
  'Power Boost':'Kumpulkan POWER (bangunan/riset/troop) + pakai Forgehammer/Widget ke gear hero. Widget = 100.000.',
  'Governor Gear':'Naikkan skor Governor Gear (level-up gear) — +500 poin tiap max score naik.',
  'Charm Upgrade':'Naikkan Governor Charm — level awal lompatan poin besar (+1.000/score).',
};
/* SUMBER KANONIK ROI speedup per event (dipakai render encyclopedia + roi card). */
const SPEED_NOTE={kvk:'\u2705 PAKAI speedup (30/mnt) sesuai tema hari',sg:'\u2705 PAKAI speedup (30/mnt) di D1/D5/D7 \u2014 buang bank speedup di sini',hog:'\u26d4 Speedup nyaris tak ber-poin di HoG \u2014 pakai hanya untuk selesaikan upgrade (naik power)',armament:'\u26d4 JANGAN buang speedup di Armament (1 poin/menit)',burst:'\u2705 PAKAI speedup untuk selesaikan upgrade (naik power)'};
/* "Harus ngapain" per event mingguan kingdom (key = titleKey API kingshot.net) */
const WEEKLY_GUIDE={
  sanctuaryBattle:'Join rally aliansi \u2014 bawa SATU joiner di slot-1 (Chenko/Yeonwoo). Menang \u2192 tahan 30 menit.',
  allianceChampionship:'Tim didaftarkan R4/R5 (snapshot buff saat registrasi — aktifkan semua buff dulu!). F2P: daftar kalau diminta, deploy troop SEBELUM tanding, hadir saat jam tanding, klaim reward. Strategi aliansi: 2-1 (tumpuk 2 lane, korbankan 1). Hanya top-20 power yang dihitung.',
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
  mysticDivination:'Undian \u2014 pakai tiket/attempt Gratis harian saja, jangan beli.',
  fishing:'Bait gratis +1/3 jam (cap 10 — jangan biarkan penuh). Upgrade gear SEGERA: Line → Hook → Sinker (reset tiap musim). Kejar reward level milestone — termasuk Conquest Manual (tabung kalau tak main Arena). Abaikan leaderboard (P2W).',
  champagneFair:'Event tema ringan \u2014 ambil reward gratis, skip pembelian.',
  goldenGlaives:'Event poin kombat ringan \u2014 ikut dari aktivitas normal, jangan spend khusus.',
  eternitysReach:'Progres solo \u2014 reward bertahap dari aktivitas normal, tak perlu spend.',
  defeatBeasts:'Bunuh beast di map \u2014 habiskan semua stamina di hari ini (hemat: hero Diana).',
  vikingsVengeance:'Kosongkan rumah + support anggota ONLINE (stage 7/14/17 = skor besar; 10/20 = HQ). Lineup: tab Hero → Viking Vengeance.',
  strongestGovernor:'Event skor 7 hari \u2014 ikuti tema harian (lihat Advisory & Ensiklopedia SG).',
  kingsCastle:'Castle Battle: serang TURRET (bukan castle), masuk Forbidden Zone <1 jam sebelum mulai.',
  castleBattle:'Serang TURRET (bukan castle); TP masuk <1 jam sebelum mulai; batch-heal.',
  allOut:'Kill event: SHIELD tiap offline; farm gatherer lawan (injured = killed, tanpa hospital).',
  kvkPrepPhase:'KvK Prep Phase: stage troop, isi formasi, kosongkan hospital, koordinasi aliansi.',
  kvkFieldTriage:'Fase pemulihan KvK \u2014 heal pasukan (batch + help aliansi), klaim reward.',
  truegoldWonders:'Komisi mingguan \u2192 True Gold dust & gold. Kerjakan komisi Gratis di War Academy.',
  charmCraftsman:'Poin dari charm / Charm Design. Pakai material terencana \u2014 jangan beli khusus event.',
  treasureCove:'Event chest + daily task. Kerjakan daily efisien, berhenti sebelum milestone mahal.',
  governorGearEnhancement:'Poin dari enhance/upgrade gear. Pakai Forgehammer/Mithril/Artisan Vision di window; JANGAN buang speedup.',
  enhanceGear:'Poin dari enhance/upgrade gear. Pakai material gear di window; jangan buang speedup.',
  customArmsSet:'PACK berbayar (mat Hero Gear). F2P: SKIP — bukan event poin.',
  techStorm:'PACK berbayar riset. F2P: SKIP; tahan riset utk hari scoring (HoG/SG D5).',
  conqueror:'PACK berbayar (bukan event kill/training). F2P: SKIP.',
  worldTraveler:'PACK berbayar (teleporter + heal). F2P: SKIP kecuali sedang relokasi.',
  wishfulEmporium:'PACK bundle berbayar (kustom 3 slot). F2P: SKIP; beda dari Emporium of Enigma gratis.',
  topGovernor:'Varian Top Governor bertema (gear/dll). Tahan material tema → selesaikan di window.'
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
/* Feed live memakai titleKey GLOBAL; model umur server memakai id EVENT_TEMPLATES.
   Samakan supaya satu event tidak muncul dua kali dengan tanggal berbeda.
   (Fase KvK diciutkan jadi satu entri 'kvk' — granularitas fase bukan tujuan countdown.) */
const EV_ALIAS={kvkMatchmaking:'kvk',kvkPrepPhase:'kvk',kvkFieldTriage:'kvk',strongestGovernor:'sg'};
const EV_EMOJI={burst:'\u25c8',hog:'\u25c9',kvk:'\u2620',sg:'\u25a3',armament:'\u25c6'};

/* Event yang WIKI SENDIRI nyatakan tak bisa diprediksi. Tampil TANPA angka \u2014
   daftar jujur mengalahkan timer palsu. (kingshotwiki.com/events/*) */
const EV_UNPREDICTABLE=[
  {id:'treasureRaiders',title:'Treasure Raiders',recur:'recurring',
   why:'Wiki: "irregular event so it cannot be predicted". 3 hari; 78 pickaxe gratis, pity \u226414/lantai, pickaxe tersimpan antar event.'},
  {id:'powerUp',title:'Power Up',recur:'oneTime',
   why:'Wiki: "irregular event so it cannot be predicted". 2 hari, Gen 1 SAJA \u2014 tak muncul lagi di Gen 2+. Poin dari speedup konstruksi/riset.'},
  {id:'warPreparation',title:'War Preparation',recur:'oneTime',
   why:'Wiki: "cannot be predicted". 2 hari, minggu-minggu awal saja; Mastery Forging butuh TC20.'},
  {id:'planYourCity',title:'Plan your City',recur:'oneTime',
   why:'Wiki: "irregular event so it cannot be predicted... occur early on in your new kingdom". 2 hari, Gen 1 SAJA. 1 poin per POWER dari Research/Construction (beda dari Power Up yang menghitung MENIT speedup).'},
];
/* Kelas MUSIMAN: tidak ada di katalog/API mana pun -> tak ada yang bisa dipoll.
   Yang bisa app lakukan hanyalah berhenti berpura-pura daftarnya lengkap. */
const EV_SEASONAL_NOTE={
  title:'Event musiman tidak terlihat di sini',
  body:'Kingshot menjalankan event terbatas yang tidak ada di katalog maupun API mana pun \u2014 contoh: Football Fiesta (9\u201316 Juli 2026, city skin permanen Apex Arena). Hanya berita in-game & Discord resmi yang mengumumkannya. Daftar di atas lengkap untuk event BERULANG; untuk yang musiman, matamu sendiri satu-satunya sumber.',
  discord:'https://discord.gg/9rzDtTWQbz',
};

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
const F2P_TRICKS=[
 ['⚔ Perang / KvK / Castle',[
  'Serang TURRET bukan castle — tiap turret musuh = 2% korban/siklus ke garrison (4 turret = 8%, tak bisa di-heal). Rebut 4 turret = aliansi menengah bisa tahan lawan yang lebih kuat.',
  'Rebut ULANG turret musuh untuk "reset" — attack-speed turret naik makin lama dipegang; 1 retake mematahkannya & beri waktu garrison heal.',
  'Castle menang by TOTAL WAKTU tahan (dihitung per-ALIANSI), bukan 1 timer — 90 menit kalah dari 2 jam; jangan pecah hold antar aliansi.',
  'Shield di "dead zone" antara Prep selesai & Battle mulai — sering dipukul walau ada NAP/aturan.',
  'Heal pakai slider ~30 menit + spam Help (BUKAN speedup) — heal nyaris terus-menerus, 0 speedup. Speedup heal hanya saat hospital overflow.',
 ]],
 ['▲ Pertumbuhan akun (ungguli whale seiring waktu)',[
  'Pet unlock by UMUR SERVER (bukan TC/spend) — whale Day-50 mustahil punya Lion; F2P Day-200 punya semua. Equalizer F2P terbesar.',
  'JANGAN buang pet food ke Gen-1 (Gray Wolf/Bison/Lynx) — food sama di Lion (~Day 113) ~3x stat. Gen-1 cukup fungsional, sisanya TABUNG.',
  'Rencanakan 1 pet ke depan — pet bagus di-gate level pet sebelumnya (Lion butuh Moose Lv15; Mighty Bison butuh Giant Rhino Lv30).',
  'Master Academy: UNLOCK master lebih awal, ADVANCE belakangan. Pan = pilihan F2P pertama (ekonomi harian, tak perlu jadi rally lead).',
  'Master/Journey supply 40 gratis/hari (jam UTC tetap: 00:00 +20, 08:00 +10, 16:00 +10) — jangan overflow, hangus permanen.',
 ]],
 ['◆ Event / ROI',[
  'Event build/riset skor by POWER NAIK, bukan lama speedup — 1 upgrade tier tinggi > banyak kecil.',
  'Pre-antri upgrade TC TERBESAR ke ~99% SEBELUM event, selesaikan DI window = lonjakan poin.',
  'PROMOTE troop (bukan train baru) saat event training — poin per jam-speedup lebih besar. Masuk hari training dgn army 1 tier di bawah max.',
  'Edict combo: nyalakan "Productivity Day" (x2 produksi) DULU, baru "Rush Job" (instan 5 hari) = ~10 hari resource sekali klik.',
 ]],
 ['✷ Di mana stat F2P BERARTI',[
  'Bear Hunt ABAIKAN semua stat defensif (def/HP) — beruang tak balas. Cuma Attack & Lethality berlaku, jadi defense = sia-sia di sini.',
  'Pompa Lethality > Attack — kebanyakan over-invest Attack, jadi Lethality multiplier-nya lebih rendah = ROI lebih tinggi.',
  'Joiner cuma sumbang skill Expedition #1 hero pertama + troop mentah — joiner skill bagus SETARA whale joiner; ukuran akun joiner nyaris tak penting.',
  'Joiner Lethality (Chenko/Amadeus/Yeonwoo +25% flat) ADITIF & menumpuk (4 Chenko compound). Game cuma pakai 4 skill joiner tertinggi/rally — koordinasi 4 slot teratas jadi Lethality.',
  'Kirim joiner SALAH lebih buruk dari tanpa hero — skill defensif/ekonomi (Diana/Gordon/Jabel) blokir slot. Kalau tak ada hero Lethality, kirim troop-only.',
 ]],
 ['🤝 Aliansi / disiplin troop',[
  'Rally lebih SEDIKIT tapi PENUH > banyak tipis — tiap rally pecah pool joiner; 3 rally x5 joiner >> 5 rally x3. Suruh R4/R5 batasi jumlah rally vs anggota aktif.',
  'Naikkan level gedung Bear Trap/Forgehammer — tiap level = +5% Attack semua troop se-aliansi (ROI aliansi teratas).',
  '1 pengecualian gem selain Roulette: sewa builder ke-2 (1.000 gem/2 hari) saat build besar — clear Saul 2-bintang dulu (~6% speed konstruksi permanen).',
  'Mulai FARM ACCOUNT sebelum tembok TC28-30 (bracket rakus resource) — stok farm bikin mulus + suplai main saat KvK.',
 ]],
];
