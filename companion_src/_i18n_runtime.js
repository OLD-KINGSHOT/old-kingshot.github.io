/* ============================================================
   KINGSHOT13 — i18n runtime (ID ⇄ EN)
   Post-render translation layer. The app renders Indonesian;
   this walks the DOM and swaps to English when LANG==='en'.
   Originals are kept in a WeakMap so switching back to ID is
   lossless. window.__TR (the phrase dictionary) is injected
   immediately before this script at build time.
   ============================================================ */
(function(){
  var TR = window.__TR || {};
  var LANG = 'id';
  try { var sv = localStorage.getItem('ks_lang'); if (sv) LANG = JSON.parse(sv); } catch(e){}
  window.__getLang = function(){ return LANG; };

  /* Dynamic-string rules: applied (in order) only when a text node has
     no exact dictionary match. Handle templated text + date words. */
  var RULES = [
    /* catat kemunculan (observed lines) — MUST run before the generic
       "hari"/"lagi" word rules below, which would otherwise mangle these
       full phrases before this composite regex gets a chance to match. */
    [/Biasanya tiap ~(\d+) hari · terakhir (\d+) hari lalu · perkiraan ~(\d+) hari lagi/g, 'Usually every ~$1 days · last seen $2 days ago · est. ~$3 days to go'],
    [/Biasanya tiap ~(\d+) hari · terakhir (\d+) hari lalu · perkiraan sudah terlewat \(~(\d+) hari\)/g, 'Usually every ~$1 days · last seen $2 days ago · est. overdue (~$3 days)'],
    [/Terakhir muncul (\d+) hari lalu · (\d+) catatan \(butuh 3 untuk estimasi\)\./g, 'Last seen $1 days ago · $2 record(s) (needs 3 to estimate).'],
    [/Event awal-kingdom \(Gen 1\) — di H(\d+) kemungkinan sudah lewat; tak berulang\./g, 'Early-kingdom event (Gen 1) — at D$1 it has likely passed; does not recur.'],
    [/Event awal-kingdom \(Gen 1\) — di H(\d+) pantau minggu-minggu ini\./g, 'Early-kingdom event (Gen 1) — at D$1 watch these first weeks.'],
    [/ · tercatat (\d+) hari lalu/g, ' · recorded $1 days ago'],
    [/\bHari ke-(\d+)/g, 'Day $1'],
    [/\bServer hari\b/g, 'Server day'],
    [/\bserver hari\b/g, 'server day'],
    [/\(server hari (\d+)\)/g, '(server day $1)'],
    [/Belum aktif/g, 'Not active yet'],
    [/mulai ~hari (\d+)/g, 'starts ~day $1'],
    [/buka ~H(\d+)/g, 'unlocks ~D$1'],
    [/buka H(\d+)/g, 'unlocks D$1'],
    [/\bterkunci\b/g, 'locked'],
    [/Event awal-kingdom \(Gen 1\), tak berulang\./g, 'Early-kingdom event (Gen 1), does not recur.'],
    [/~hari (\d+)/g, '~day $1'],
    [/Simpan persiapan\./g, 'Save your prep.'],
    [/\b1 hari lagi/g, '1 day left'],
    [/(\d+) hari lagi/g, '$1 days left'],
    [/\bhari ini\b/g, 'today'],
    [/sisa (\d+) hari/g, '$1 days left'],
    [/(\d+(?:[.,]\d+)?) hari\/level/g, '$1 days/level'],
    /* "tiap ... hari" HARUS mendahului dua aturan angka+hari di bawahnya: kalau
       kebalik, "tiap 18 hari" keluar sebagai "tiap 18 days" — setengah Indonesia. */
    [/\btiap (\d+) hari\b/g, 'every $1 days'],
    [/\btiap hari\b/g, 'every day'],
    [/~(\d+) hari/g, '~$1 days'],
    [/(\d+) hari\b/g, '$1 days'],
    [/\bTC masih (\d+)/g, 'TC still $1'],
    [/Kebut TC ke (\d+)/g, 'Rush TC to $1'],
    /* HoG: sumber jadwal + peringatan kingdom (dinamis) — HARUS di atas aturan
       generik "hari" di bawah, yang kalau duluan akan merusak frasa penuhnya. */
    [/Kingdom (\d+) · hari (\d+)/g, 'Kingdom $1 · day $2'],
    [/Lihat semua \((\d+)\)/g, 'Show all ($1)'],
    /* Jaring pengaman untuk baris advisory yang isinya DIRAKIT saat jalan (mis. spend
       HoG per-iterasi): kunci penuhnya tak bisa ditulis di kamus, jadi minimal
       awalannya tak tertinggal berbahasa Indonesia. Kunci persis tetap menang. */
    [/✅ Pakai sekarang: /g, '✅ Use now: '],
    [/🔒 Tahan & siapkan: /g, '🔒 Hold & prepare: '],
    [/🔒 Tahan: /g, '🔒 Hold: '],
    [/\bUmur server:/g, 'Server age:'],
    [/— bergeser ke archer tiap gen/g, '— shifts toward archers each gen'],
    /* jumlah tugas ikut profil, jadi tak bisa dikunci ke satu angka */
    [/Lihat semua (\d+) tugas →/g, 'See all $1 tasks →'],
    [/\bmulai (\d{4}-\d{2}-\d{2})/g, 'starts $1'],
    [/⚠ hari (\d+) bukan jangkar HoG kingdom ini/g, '⚠ day $1 is not this kingdom’s HoG anchor'],
    [/ — cocoknya Kingdom /g, ' — it fits Kingdom '],
    [/Tanggal manual tersimpan/g, 'Saved manual dates'],
    [/⚠ Tanggal ini TIDAK COCOK dengan umur kingdom profil ini: jatuh di hari (\d+), sedangkan jangkar HoG terdekat hari (\d+) \(#(\d+)\) — meleset 1 hari\./g,
      '⚠ This date does NOT match this profile’s kingdom age: it lands on day $1, while the nearest HoG anchor is day $2 (#$3) — off by 1 day.'],
    [/⚠ Tanggal ini TIDAK COCOK dengan umur kingdom profil ini: jatuh di hari (\d+), sedangkan jangkar HoG terdekat hari (\d+) \(#(\d+)\) — meleset (\d+) hari\./g,
      '⚠ This date does NOT match this profile’s kingdom age: it lands on day $1, while the nearest HoG anchor is day $2 (#$3) — off by $4 days.'],
    [/ Tanggal ini justru PAS untuk Kingdom (.+?) — salah profil\?/g, ' It DOES fit Kingdom $1 — wrong profile?'],
    [/ Cek lagi hari pertama HoG di tab Events game\./g, ' Double-check HoG day 1 in the in-game Events tab.'],
    [/📌 hari (\d+) = jangkar HoG #(\d+), di luar rotasi yang terdokumentasi \(#1-#5\)\. Ini bukti baru dari game — kabari supaya datanya diperbarui\./g,
      '📌 day $1 = HoG #$2 anchor, outside the documented rotation (#1-#5). This is new in-game evidence — report it so the data can be updated.'],
    [/📌 Hari (\d+) = jangkar HoG #(\d+), di luar rotasi yang terdokumentasi \(#1-#5, berhenti karena era KvK\)\. Ini bukti baru dari game\./g,
      '📌 Day $1 = HoG #$2 anchor, outside the documented rotation (#1-#5, which ends because the KvK era begins). This is new in-game evidence.'],
    /* kalkulator poin (angka disisipkan → tak bisa dicocokkan penuh) */
    [/^([\d.]+) poin\/troop$/g, '$1 pts/troop'],
    [/^([\d.]+)\/menit$/g, '$1/min'],
    [/^([\d.]+)\/(spin|shard|widget|hammer|power|score|troop|task|beast|rally|100 XP|truegold|mithril|mark)$/g, '$1/$2'],
    [/^([\d.]+)\/misi$/g, '$1/mission'],
    [/^proyeksi ([\d.]+)$/g, 'projected $1'],
    [/^Kurang ([\d.]+) poin\.$/g, 'Short by $1 pts.'],
    [/^✅ Target ([\d.]+) terlampaui — lebih ([\d.]+) poin\.$/g, '✅ Target $1 passed — $2 points to spare.'],
    [/^Stage ini sedang memakai timpaan ([\d.]+) poin\.$/g, 'This stage is using an override of $1 pts.'],
    [/^Di atas rencana ([\d.]+) poin\.$/g, 'Above plan by $1 pts.'],
    [/^Di bawah rencana ([\d.]+) poin\.$/g, 'Below plan by $1 pts.'],
    /* farming stamina */
    [/^harapan ([\d.]+)\/pouch$/g, 'expected $1/pouch'],
    [/^Rally Dreadwolf \(([\d.]+) stamina\)$/g, 'Dreadwolf rallies ($1 stamina)'],
    [/^Stamina hanya cukup untuk ([\d.]+) rally dari ([\d.]+) yang diminta\.$/g,
      'Stamina only covers $1 of the $2 rallies requested.'],
    [/^HoG jalan, tapi stage hari ini bukan (.+)$/g, 'HoG is running, but today’s stage is not $1'],
    /* kalkulator inventaris (angka disisipkan) */
    [/^alternatif: (.+)$/g, 'alternative: $1'],
    [/^([\d.]+) hunt → ([\d.,]+) pouch$/g, '$1 hunts → $2 pouches'],
    [/^×([\d.]+) — barang ini tak punya task di HoG\/KvK\/SG, atau tabel poin event-nya belum kita punya\.$/g,
      '×$1 — these have no task in HoG/KvK/SG, or we do not have that event’s point table yet.'],
    [/^×([\d.]+) — barang ini tak punya task/g, '×$1 — these have no task'],
    [/Poin sama di stage lain, jadi boleh dipindah:/g, 'Same points in other stages, so it can be moved:'],
    /* label barang inventaris muncul DI DALAM baris rakitan, jadi kunci penuhnya
       tak pernah cocok — labelnya harus bisa diterjemahkan sendiri-sendiri. */
    [/\bPower dari latih\/promote troop\b/g, 'Power from training/promoting troops'],
    [/\bPower dari\b/g, 'Power from'],
    /* redeem + robot (angka/kode disisipkan) */
    [/^Server menolak sementara \(kode (.+?)\) — dicoba lagi otomatis nanti$/g,
      'Server refused temporarily (code $1) — will retry automatically later'],
    [/^🤖 Robot redeem: (\d+) berhasil, sisanya dibatasi server — dilanjutkan otomatis nanti\.$/g,
      '🤖 Redeem robot: $1 succeeded, the rest were rate-limited — will continue automatically later.'],
    [/^🤖 Robot redeem ([\d:]+ UTC): (\d+) kode masuk\.$/g, '🤖 Redeem robot $1: $2 codes claimed.'],
    [/^🤖 Robot redeem ([\d:]+ UTC): (\d+) kode masuk, (\d+) tidak berlaku\.$/g,
      '🤖 Redeem robot $1: $2 codes claimed, $3 not valid.'],
    [/^🤖 Robot redeem ([\d:]+ UTC): (\d+) kode masuk · jam disinkronkan otomatis\.$/g,
      '🤖 Redeem robot $1: $2 codes claimed · clock resynced automatically.'],
    [/^🤖 Robot redeem ([\d:]+ UTC): (\d+) kode masuk, (\d+) tidak berlaku · jam disinkronkan otomatis\.$/g,
      '🤖 Redeem robot $1: $2 codes claimed, $3 not valid · clock resynced automatically.'],
    [/^([\d.]+) hunt$/g, '$1 hunts'],
    [/^([\d.]+) gem · ([\d.]+) mnt$/g, '$1 gems · $2 min'],
    /* event advisory (dynamic, number-interpolated) */
    [/Server masih baru \(hari/g, 'Server is still new (day'],
    [/baru aktif/g, 'becomes active'],
    [/\b(D\d+) AKTIF\b/g, '$1 ACTIVE'],
    [/Jam event:/g, 'Event time:'],
    [/Player ID tidak ditemukan/g, 'Player ID not found'],
    [/server buka/g, 'server opened'],
    [/jam event\b/g, 'event time'],
    [/Age of Truegold lewat tapi/g, 'Age of Truegold passed but'],
    [/\bKamu TC/g, "You're TC"],
    [/Ketat! Jangan biarkan antrian kosong\./g, "Tight! Don't let the queue go empty."],
    [/Jaga ritme upgrade\./g, 'Keep up the upgrade pace.'],
    [/Fokus saat itu \(H/g, 'Focus then (H'],
    [/generasi aktif/g, 'active generation'],
    [/siapkan untuk tanggal ini/g, 'prep for this date'],
    [/\baktif\b/g, 'active'],
    [/Menuju Age of Truegold/g, 'Toward Age of Truegold'],
    /* countdown durations (schedule tab + Sekarang card): "N hr M jam" = N days M hours.
       Composite forms first so English word order reads naturally. */
    [/AKTIF · sisa (\d+) hr (\d+) jam/g, 'ACTIVE · $1d $2h left'],
    [/AKTIF · sisa (\d+) jam/g, 'ACTIVE · $1h left'],
    [/sisa (\d+) hr (\d+) jam/g, '$1d $2h left'],
    [/sisa (\d+) jam/g, '$1h left'],
    [/(\d+) hr (\d+) jam lagi/g, 'in $1d $2h'],
    [/(\d+) jam lagi/g, 'in $1h'],
    [/(\d+) hr (\d+) jam/g, '$1d $2h'],
    [/(\d+) jam\b/g, '$1h'],
    [/\bsudah lewat\b/g, 'already passed'],
    [/\btidak diketahui\b/g, 'unknown'],
    /* Jaring pengaman kata tunggal: "Gratis" muncul di banyak label yang DIRAKIT
       (mis. "· Cavalry · Joiner (Epic, Gratis)"), dan kunci penuhnya gampang putus
       tiap kali kapitalnya diubah. Aturan ini hanya jalan kalau kunci persis tak ada. */
    [/\bGratis\b/g, 'Free'],
    [/\bgratis\b/g, 'free'],
    [/\bAKTIF\b/g, 'ACTIVE'],
    [/\bsisa\b/g, 'left'],
    [/\btercapai\b/g, 'reached'],
    [/\bhari\b/g, 'days'],
    [/\bs\/d\b/g, 'until'],
    /* day abbreviations (calendar + schedule) */
    [/\bMin\b/g,'Sun'],[/\bSen\b/g,'Mon'],[/\bSel\b/g,'Tue'],[/\bRab\b/g,'Wed'],
    [/\bKam\b/g,'Thu'],[/\bJum\b/g,'Fri'],[/\bSab\b/g,'Sat'],
    /* month abbreviations that differ from English */
    [/\bMei\b/g,'May'],[/\bAgu\b/g,'Aug'],[/\bOkt\b/g,'Oct'],[/\bDes\b/g,'Dec'],
    /* full day names */
    [/\bMinggu\b/g,'Sunday'],[/\bSenin\b/g,'Monday'],[/\bSelasa\b/g,'Tuesday'],
    [/\bRabu\b/g,'Wednesday'],[/\bKamis\b/g,'Thursday'],[/\bJumat\b/g,'Friday'],[/\bSabtu\b/g,'Saturday'],
    /* full month names that differ */
    [/\bJanuari\b/g,'January'],[/\bFebruari\b/g,'February'],[/\bMaret\b/g,'March'],
    [/\bJuni\b/g,'June'],[/\bJuli\b/g,'July'],[/\bAgustus\b/g,'August'],
    [/\bOktober\b/g,'October'],[/\bDesember\b/g,'December']
  ];

  function applyEN(src){
    var key = src.trim();
    if (key && TR[key] !== undefined){
      return src.replace(key, TR[key]);
    }
    if (!key) return src;
    /* RULES dijalankan pada teks yang SUDAH di-trim. Dulu dijalankan pada `src`
       mentah, sehingga SETIAP aturan berjangkar ^...$ gagal diam-diam begitu simpul
       teksnya punya spasi/newline di tepi — dan simpul dalam HTML multi-baris hampir
       selalu punya. Spasi tepinya dikembalikan lewat replace di bawah. */
    var out = key, changed = false;
    for (var i=0;i<RULES.length;i++){
      var n = out.replace(RULES[i][0], RULES[i][1]);
      if (n !== out){ out = n; changed = true; }
    }
    return changed ? src.replace(key, out) : src;
  }

  var orig = new WeakMap();   /* textNode -> Indonesian original */

  function setNode(node){
    var cur = node.nodeValue;
    if (!cur || !/\S/.test(cur)) return;
    if (orig.has(node)){
      /* if the app wrote NEW text into a node we translated earlier, adopt the
         new value as the original instead of resurrecting the old one */
      var o = orig.get(node);
      if (cur !== o && cur !== applyEN(o)) orig.delete(node);
    }
    var src = orig.has(node) ? orig.get(node) : cur;
    var target = (LANG === 'en') ? applyEN(src) : src;
    if (!orig.has(node) && target !== src) orig.set(node, src);
    if (node.nodeValue !== target) node.nodeValue = target;
  }

  var attrOrig = new WeakMap(); /* element -> {attr: idValue} */
  function setAttr(el, attr){
    var cur = el.getAttribute(attr);
    if (cur == null || !/\S/.test(cur)) return;
    var store = attrOrig.get(el) || {};
    var src = (store[attr] !== undefined) ? store[attr] : cur;
    var dictKey = '@'+(attr==='placeholder'?'ph':attr)+':'+src.trim();
    var target = src;
    if (LANG === 'en' && TR[dictKey] !== undefined){
      target = TR[dictKey].replace(/^@(?:ph|title):/, ''); /* values may keep the lookup prefix */
    }
    if (store[attr] === undefined && target !== src){ store[attr] = src; attrOrig.set(el, store); }
    if (cur !== target) el.setAttribute(attr, target);
  }

  function skip(node){
    var p = node.parentNode;
    if (!p) return true;
    var t = p.nodeName;
    return t === 'SCRIPT' || t === 'STYLE' || p.id === 'langtoggle';
  }

  function translateTree(root){
    if (!root) return;
    if (root.nodeType === 3){ if(!skip(root)) setNode(root); return; }
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n, batch = [];
    while ((n = walker.nextNode())) batch.push(n);
    for (var i=0;i<batch.length;i++){ if(!skip(batch[i])) setNode(batch[i]); }
    if (root.querySelectorAll){
      root.querySelectorAll('[placeholder]').forEach(function(el){ setAttr(el,'placeholder'); });
      root.querySelectorAll('[title]').forEach(function(el){ setAttr(el,'title'); });
    }
  }

  /* Observe the whole app: every re-render adds nodes -> translate them.
     Our nodeValue edits don't add/remove nodes, so no feedback loop. */
  var observer = new MutationObserver(function(muts){
    for (var i=0;i<muts.length;i++){
      var m = muts[i];
      if (m.type === 'characterData' && m.target && !skip(m.target)){
        if (LANG === 'en') setNode(m.target);
        else if (orig.has(m.target) && m.target.nodeValue !== orig.get(m.target)){
          orig.delete(m.target); /* app wrote new ID text in-place — drop the stale original */
        }
        continue;
      }
      if (LANG !== 'en') continue;   /* additions need no work in Indonesian mode */
      for (var j=0;j<m.addedNodes.length;j++){
        var nd = m.addedNodes[j];
        if (nd.nodeType === 3){ if(!skip(nd)) setNode(nd); }
        else if (nd.nodeType === 1) translateTree(nd);
      }
    }
  });

  function start(){
    try { observer.observe(document.documentElement, {childList:true, subtree:true, characterData:true}); } catch(e){}
    translateTree(document.body || document.documentElement);
  }

  /* Toggle entry point used by the header button (event-delegated below). */
  window.setLang = function(l){
    LANG = l;
    try { localStorage.setItem('ks_lang', JSON.stringify(l)); } catch(e){}
    var btn = document.getElementById('langtoggle');
    if (btn) btn.textContent = (l === 'en') ? 'ID' : 'EN';
    /* regenerate dynamic UI (fresh Indonesian), then re-apply language */
    try { if (typeof buildNav === 'function') buildNav(); } catch(e){}
    try { if (typeof renderTopClock === 'function') renderTopClock(); } catch(e){}
    try {
      if (typeof activate === 'function'){
        var last = (window.store && store.get) ? store.get('lastTab','sekarang') : 'sekarang';
        activate(last);
      }
    } catch(e){}
    translateTree(document.body);
  };

  document.addEventListener('click', function(e){
    var t = e.target && e.target.closest ? e.target.closest('#langtoggle') : null;
    if (t){ e.preventDefault(); window.setLang(LANG === 'en' ? 'id' : 'en'); }
  }, true);

  /* set initial button label once DOM is live */
  function syncBtn(){ var b=document.getElementById('langtoggle'); if(!b) return;
    /* globe + active language via textContent (auto-ignored by translator) */
    b.textContent = (LANG==="en") ? "ID" : "EN"; b.setAttribute("title","Ganti bahasa / Switch language");
    b.setAttribute('title','Ganti bahasa / Switch language'); }

  /* Wrap the app's render entry points so a tab switch / clock tick translates
     synchronously (no flash of Indonesian). The app modules load AFTER this
     inline script, so we wrap on the next macrotask once they're defined.
     A global function declaration is a property of window, so reassigning it
     redirects later identifier lookups inside the modules too. */
  function wrap(name){
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__i18nWrapped) return;
    var w = function(){ var r = orig.apply(this, arguments); if (LANG === 'en') translateTree(document.body); return r; };
    w.__i18nWrapped = true;
    try { window[name] = w; } catch(e){}
  }
  window.__translate = function(){ translateTree(document.body); };

  start();
  syncBtn();
  /* NOTE: renderTopClock is intentionally NOT wrapped — it runs every second
     via tickClock, and a full-body translateTree per tick is a serious perf
     drain on phones. The MutationObserver picks up its innerHTML writes.
     The app modules load AFTER this inline script (the loader executes them
     one by one), so poll until the functions actually exist before wrapping. */
  var _wrapTries = 0;
  var _wrapTimer = setInterval(function(){
    ['activate','buildNav'].forEach(wrap);
    syncBtn();
    var done = window.activate && window.activate.__i18nWrapped;
    if (done && LANG === 'en') translateTree(document.body);
    if (done || ++_wrapTries > 50) clearInterval(_wrapTimer);
  }, 150);
})();
