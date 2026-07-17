/* ============================================================
   KINGSHOT COMPANION — APP part 2 (event, bangun, pets, kode, profil, init)
   ============================================================ */

/* ============ EVENT ============ */
let _calOffset=0;
/* duration-aware: an event covers ALL its days (di = 0-based day inside the event),
   not just the start date — so "HoG D4" in the header matches the calendar. */
function calEventsOnDay(start,d){
  /* d = hari server 1-based (buka = H1), sama dengan konvensi game */
  const out=[]; if(d<1) return out;
  if(d<=7) out.push({c:'var(--profit)',n:'Burst of Life',tag:'B',di:d-1,len:7});
  MILESTONES.filter(m=>m.d===d).forEach(m=>out.push({c:'var(--cyan)',n:m.name,milestone:true,note:m.note,tag:'⚑'}));
  /* user-corrected dates ("Tambah/ralat tanggal manual") re-anchor the cycle —
     so the calendar follows EACH user's real server, not just the default model */
  const userEv=store.get('events',[]);
  const anchor=type=>{ const e=userEv.find(x=>x.type===type); if(!e||!start) return null;
    const u=daysBetween(start,new Date(e.date+'T00:00:00Z'))+1; return u>=1?u:null; };
  const rec=(type,s0,per,col,tag)=>{ const ua=anchor(type); if(ua!=null) s0=ua%per||per;
    if(d<s0) return;
    const ds=s0+Math.floor((d-s0)/per)*per; const t=EVENT_TEMPLATES[type]; let len=(t&&t.len)||1;
    if(type==='hog'){ var _no=hogNoForDay(ds); if(!hogExists(_no)) return;   /* #6+ tidak pernah ada */
      len=hogLen(_no); }
    if(d-ds<len) out.push({c:col,n:(t&&t.name)||type,type,di:d-ds,len,tag}); };
  rec('hog',6,14,'var(--accent)','HoG');
  rec('kvk',70,28,'var(--loss)','KvK');
  rec('sg',75,28,'var(--pink)','SG');
  return out;
}
function renderCalendar(host){
  const {p,start,age}=profileAge();
  if(!start){ host.innerHTML='<div class="muted small">Hubungkan Player ID dulu untuk kalender server.</div>'; return; }
  const today=todayMidnight();
  const base=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+_calOffset,1));
  const y=base.getUTCFullYear(),mo=base.getUTCMonth();
  const dim=new Date(Date.UTC(y,mo+1,0)).getUTCDate(); const lead=new Date(Date.UTC(y,mo,1)).getUTCDay();
  const dow=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  let cells=''; for(let i=0;i<lead;i++) cells+='<div class="calcell empty"></div>';
  for(let day=1;day<=dim;day++){
    const cd=new Date(Date.UTC(y,mo,day)); const d=daysBetween(start,cd)+1; /* 1-based: buka = H1 */
    const evs=calEventsOnDay(start,d);
    const wk=(typeof wkEventsOnDate==='function')?wkEventsOnDate(cd):[];
    const isToday=cd.getTime()===today.getTime();
    /* labeled chips: event tag + day-in-event (HoG\u00b2, KvK\u2075 \u2026) instead of anonymous dots */
    const tags=evs.slice(0,2).map(x=>`<span class="ctag" style="color:${x.c};border-color:${x.c}">${x.tag}${x.len>1&&!x.milestone?'<small>'+(x.di+1)+'</small>':''}</span>`).join('')
      +(evs.length>2?`<span class="ctag">+${evs.length-2}</span>`:'');
    cells+=`<div class="calcell${evs.length?' has':''}${wk.length?' wk':''}${isToday?' today':''}" data-d="${d}"><div class="dn num">${day}</div><div class="sd">${d>=1?'H'+d:''}</div><div class="cdots">${tags}</div></div>`;
  }
  host.innerHTML=`<div class="calhead"><button class="calnav" id="cprev">\u2039</button><span class="mon">${ID_MON_FULL[mo]} ${y}</span><button class="calnav" id="cnext">\u203a</button></div>
    <div class="calgrid">${dow.map(x=>`<div class="caldow">${x}</div>`).join('')}${cells}</div>
    <div class="callegend"><b style="color:var(--profit)">B</b> Burst of Life \u00b7 <b style="color:var(--cyan)">\u2691</b> Milestone \u00b7 <b style="color:var(--accent)">HoG</b> Hall of Governors \u00b7 <b style="color:var(--loss)">KvK</b> Kingdom of Power \u00b7 <b style="color:var(--pink)">SG</b> Strongest Governor. Angka kecil = hari ke-berapa event (HoG<small>2</small> = hari ke-2). Garis biru bawah = ada event mingguan kingdom hari itu. <b>H51</b> = umur server. Ketuk tanggal untuk detail.</div>
    <div id="caldetail" style="margin-top:12px"></div>`;
  $('#cprev',host).onclick=()=>{_calOffset--;renderCalendar(host);};
  $('#cnext',host).onclick=()=>{_calOffset++;renderCalendar(host);};
  $$('.calcell[data-d]',host).forEach(c=>{ if(c.classList.contains('empty'))return; c.onclick=()=>{ $$('.calcell',host).forEach(x=>x.classList.remove('sel')); c.classList.add('sel'); calDetail(host,+c.dataset.d); }; });
  const todc=host.querySelector('.calcell.today'); if(todc){ todc.classList.add('sel'); calDetail(host,+todc.dataset.d); }
}
function calDetail(host,d){
  const out=$('#caldetail',host); if(!out) return;
  const {start,age,tc}=profileAge();
  if(d<1){ out.innerHTML='<div class="alert inf small">'+addDaysFmt(start,d)+' \u2014 sebelum server buka.</div>'; return; }
  const tag=d===age?' <span class="pill f2p">HARI INI</span>':(d===age+1?' <span class="pill a">BESOK</span>':(d<age?' <span class="pill c">lewat</span>':''));
  const evs=calEventsOnDay(start,d);
  let lines=[`<div class="kv"><span>${addDaysFmt(start,d)}</span><b class="acc">Hari ke-${d}${tag}</b></div>`];
  if(evs.length){ evs.forEach(x=>{
    if(x.milestone){ lines.push(`<div class="alert inf small"><b>\u2691 ${esc(x.n)}</b>${x.note?'<br>'+esc(x.note):''}</div>`); return; }
    const dlab=x.len>1?` \u2014 hari ke-${x.di+1}/${x.len}${x.di+1===x.len?' (TERAKHIR)':''}`:'';
    lines.push(`<div class="alert ${d>age?'warn':'ok'} small"><b>${esc(x.n)}</b>${dlab} \u2014 ${d>age?'estimasi, siapkan untuk tanggal ini':(d===age?'AKTIF hari ini':'sudah lewat')}</div>`);
  }); } else lines.push('<div class="muted small" style="margin-top:6px">Tidak ada event pertumbuhan terjadwal \u2014 fokus rutin & pondasi.</div>');
  /* weekly kingdom events on this date (projected from the live 4-week cycle) */
  if(typeof wkEventsOnDate==='function'){
    const cd=new Date(start.getTime()+d*86400000);
    const wk=wkEventsOnDate(cd);
    if(wk.length){
      lines.push('<div class="lbl" style="margin:10px 0 4px">Event mingguan kingdom hari ini</div>');
      wk.forEach(e=>{ const g=(typeof WEEKLY_GUIDE!=='undefined'&&WEEKLY_GUIDE[e.titleKey])||WEEKLY_GUIDE_DEFAULT;
        const min=(typeof WEEKLY_MIN!=='undefined')?WEEKLY_MIN[e.titleKey]:null;
        const locked=min!=null&&d<min; /* gate by the DATE's server day, not today's */
        lines.push(`<div class="check note"${locked?' style="opacity:.55"':''}><div><div class="t">${esc(e.title)}${locked?' <span class="pill c">🔒 ~hari '+min+'</span>':''}</div><div class="d">${esc(g)}</div></div></div>`); });
    }
  }
  const plan=phasePlan(d,tc).slice(0,3);
  lines.push('<div class="alert inf small"><b>\ud83c\udfaf Fokus saat itu (H'+d+'):</b><br>'+plan.join('<br>')+'</div>');
  out.innerHTML=lines.join('');
}

/* Live weekly kingdom schedule (kingshot.net) — real dates, not cycle estimates */
async function fillLiveEvents(force){
  const host=$('#evlive'); if(!host) return;
  host.innerHTML='<div class="muted small">⏳ Memuat jadwal live…</div>';
  await ksLiveEvents(force);                       /* isi cache; evUpcoming baca dari store */
  const list=(typeof evUpcoming==='function')?evUpcoming():[];
  const now=ksClock.now().getTime();
  const CONF={ingame:['✅','terverifikasi in-game'],live:['📡','feed live kingshot.net'],
    wiki:['📖','kingshotwiki'],community:['💬','satu sumber, belum terkonfirmasi'],
    inferred:['🔢','perkiraan hitungan app'],unknown:['❔','tidak diketahui'],
    observed:['👁️','dari catatanmu sendiri (perkiraan)']};
  const dur=ms=>{ if(ms<0)ms=0; const d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000);
    return d>0?(d+' hr '+h+' jam'):(h+' jam'); };
  const daysAgo=ms=>Math.max(0,Math.floor((now-ms)/86400000));
  function obsHTML(it){
    const o=it.observed||{count:0}, age=profileAge().age, oc=CONF.observed;
    let line;
    if(it.recur==='recurring'){
      if(!o.count) line='Belum ada catatan. Tekan ✏️ saat event ini muncul.';
      else if(o.count<3) line='Terakhir muncul '+daysAgo(o.lastUTC)+' hari lalu · '+o.count+' catatan (butuh 3 untuk estimasi).';
      else { const m=Math.floor((o.nextEstUTC-now)/86400000);
        line='<span title="'+esc(oc[1])+'">'+oc[0]+'</span> Biasanya tiap ~'+o.medianGapDays+' hari · terakhir '+daysAgo(o.lastUTC)+' hari lalu · '
          +(m>0?('perkiraan ~'+m+' hari lagi'):('perkiraan sudah terlewat (~'+Math.abs(m)+' hari)')); }
    } else {
      const passed=(age!=null&&age>21);
      line=(age!=null?('Event awal-kingdom (Gen 1) — di H'+age+(passed?' kemungkinan sudah lewat; tak berulang.':' pantau minggu-minggu ini.')):'Event awal-kingdom (Gen 1), tak berulang.')
        +(o.count?(' · tercatat '+daysAgo(o.lastUTC)+' hari lalu'):'');
    }
    const undo=o.count?' <button class="btn sec sm evlog_del" data-id="'+esc(it.id)+'">↩ hapus catatan terakhir</button>':'';
    return '<div class="obs small dim" style="margin-top:4px">'+line+'</div>'
      +'<div class="row" style="margin-top:4px"><button class="btn sec sm evlog_add" data-id="'+esc(it.id)+'">✏️ Muncul hari ini</button>'+undo+'</div>';
  }
  const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  function seasonalHTML(){
    const rows=(store.get('evLog',[])||[]).filter(r=>r&&/^seasonal:/.test(r.id));
    const byId={};
    rows.forEach(r=>{ (byId[r.id]=byId[r.id]||{title:r.title||r.id.replace(/^seasonal:/,''),dates:[]}).dates.push(r.date); });
    let list='';
    Object.keys(byId).forEach(id=>{ const g=byId[id]; g.dates.sort();
      list+='<div class="obs small" style="margin-top:4px"><b>'+esc(g.title)+'</b> <span class="dim">'+esc(g.dates.join(', '))+'</span> '
        +'<button class="btn sec sm evlog_del" data-id="'+esc(id)+'">↩</button></div>'; });
    return '<div class="lbl" style="margin:10px 0 4px">Catat event musiman</div>'
      +'<div class="row"><input id="seas_name" placeholder="Nama event (mis. Football Fiesta)" style="flex:1;min-width:0">'
      +'<input id="seas_date" type="date"><button class="btn sec sm" id="seas_add">Catat</button></div>'+list;
  }
  const row=it=>{
    const c=CONF[it.conf]||CONF.unknown;
    /* WEEKLY_GUIDE di-key pakai titleKey ASLI -> coba srcKey dulu, baru id kanonik */
    const guide=(typeof WEEKLY_GUIDE!=='undefined'&&(WEEKLY_GUIDE[it.srcKey]||WEEKLY_GUIDE[it.id]))||'';
    let when;
    if(it.unpredictable) when='<span class="pill c">tak bisa diprediksi</span>';
    else if(it.active) when='<span class="pill f2p">AKTIF</span>'+(it.endUTC?' <span class="num dim small">sisa '+dur(it.endUTC-now)+'</span>':'');
    else if(it.startUTC!=null) when='<b class="acc">'+dur(it.startUTC-now)+' lagi</b>';
    else when='';
    const lock=it.locked?' <span class="pill c">🔒 ~hari '+it.gate.minDay+'</span>':'';
    return '<div class="check note"'+(it.locked?' style="opacity:.6"':'')+'><div style="flex:1;min-width:0">'
      +'<div class="t">'+esc(it.title)+' <span title="'+esc(c[1])+'">'+c[0]+'</span> '+when+lock+'</div>'
      +'<div class="d">'+esc(it.why||guide||WEEKLY_GUIDE_DEFAULT)+'</div>'
      +(it.unpredictable?obsHTML(it):'')+'</div></div>';
  };
  const sec=(label,arr)=>arr.length?('<div class="lbl" style="margin:12px 0 4px">'+label+'</div>'+arr.map(row).join('')):'';
  const n=(typeof EV_SEASONAL_NOTE!=='undefined')?EV_SEASONAL_NOTE:null;
  host.innerHTML=
     sec('Sedang berjalan',list.filter(x=>x.active))
    +sec('Berikutnya',list.filter(x=>!x.active&&x.startUTC!=null))
    +sec('Jadwal tidak pasti',list.filter(x=>x.unpredictable))
    +(n?'<div class="alert warn small" style="margin-top:10px"><b>⚠ '+esc(n.title)+'</b><br>'+esc(n.body)
        +'<br><a href="'+esc(n.discord)+'" target="_blank" rel="noopener">Discord resmi Kingshot</a></div>':'')
    +seasonalHTML()
    +'<div class="alert inf small" style="margin-top:6px">📌 Hitungan umur (H-x, gerbang 🔒) mengikuti KINGDOM-mu. Rotasi mingguan bersifat GLOBAL untuk kingdom dewasa — kingdom muda belum sinkron penuh, event bisa muncul di luar daftar. Acuan final = tab Events in-game.</div>'
    +'<div class="row" style="margin-top:8px"><button class="btn sec sm" id="evlive_r">↻ Muat ulang</button></div>';
  $$('.evlog_add',host).forEach(b=>b.onclick=()=>{ if(typeof evLogAdd==='function'){ evLogAdd(b.dataset.id,evTodayISO()); fillLiveEvents(false); } });
  $$('.evlog_del',host).forEach(b=>b.onclick=()=>{ if(typeof evLogRemoveLast==='function'){ evLogRemoveLast(b.dataset.id); fillLiveEvents(false); } });
  const sa=$('#seas_add',host); if(sa) sa.onclick=()=>{ const nm=$('#seas_name').value.trim(), dt=$('#seas_date').value;
    if(!nm||!slug(nm)){$('#seas_name').focus();return;} if(!dt){$('#seas_date').focus();return;}
    if(typeof evLogAdd==='function') evLogAdd('seasonal:'+slug(nm),dt,nm); fillLiveEvents(false); };
  const b=$('#evlive_r'); if(b) b.onclick=()=>fillLiveEvents(true);
}

function renderEvent(){
  const el=$('[data-tab=event]');
  const {p,start,age}=profileAge();
  /* auto scheduler */
  let schedHTML;
  if(age==null){ schedHTML='<div class="alert inf small">Hubungkan Player ID di tab Profil untuk advisory event otomatis.</div>'; }
  else{
    const user=store.get('events',[]); const userTypes=new Set(user.map(e=>e.type));
    const auto=[];
    if(age<=7 && !userTypes.has('burst')) auto.push({type:'burst',date:addDaysISO(start,1),pred:true});
    predictedEvents(start,age).forEach(pp=>{ if(!userTypes.has(pp.type)) auto.push({type:pp.type,date:pp.date,pred:true,conf:pp.conf}); });
    const merged=[...user.map((e,idx)=>({...e,pred:false,idx})),...auto];
    merged.forEach(e=>e._a=evAdvisory(e));
    const shown=merged.filter(e=>e._a&&e._a.di>=-7&&e._a.di<(e._a.len||e._a.tpl.len)).sort((a,b)=>new Date(a.date)-new Date(b.date));
    schedHTML=`<div class="alert inf small"><b>Tanggal di bawah = ESTIMASI otomatis</b> dari umur server (belum kamu konfirmasi). <b>Akurasi tinggi</b> = pola pasti (HoG tiap 14 hari). <b>Akurasi sedang</b> = perkiraan kasar (KvK ~hari 70, fix setelah KvK pertama). Advisory "Hari Ini" tetap jalan otomatis — kalau tanggal asli di game beda, tekan "ralat" di bawah.</div>`
      +(shown.length? shown.map(e=>{ const a=e._a; const pc=a.cls==='ok'?'f2p':a.cls==='bad'?'crit':a.cls==='warn'?'warn':'info';
        return `<div class="lcard" style="margin:10px 0">
          <div class="lh"><span class="nm" style="font-size:13px">${EV_EMOJI[e.type]||'\u25c6'} ${esc(a.name)}</span>${e.pred?'<span class="tag">estimasi \u00b7 akurasi '+(e.conf||'?')+'</span>':''}<span class="pill ${pc}" style="margin-left:auto">${esc(a.status)}</span></div>
          <div class="dim small mono" style="margin-bottom:4px">mulai ${esc(e.date)}</div>
          ${a.lines.map(l=>`<div class="alert ${a.cls} small">${l}</div>`).join('')}
          ${e.pred?'':`<button class="btn ghost sm del" data-idx="${e.idx}">Hapus</button>`}</div>`;
      }).join('') : '<div class="muted small">Tidak ada event aktif/akan datang \u22647 hari.</div>')
      +`<details style="margin-top:12px"><summary>Tambah / ralat tanggal manual</summary><div class="dt">
          <div class="grid2"><div><label class="fl">Jenis</label><select id="sch_type">${Object.entries(EVENT_TEMPLATES).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('')}</select></div><div><label class="fl">Tanggal D1</label><input id="sch_date" type="date"></div></div>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="sch_add">Simpan</button></div></div></details>`;
  }
  /* ROI points */
  const roi=`<div class="scrollx"><table><thead><tr><th>Item</th><th>Poin KvK</th><th>Catatan</th></tr></thead><tbody>
    ${POINTS.map(x=>`<tr><td><b>${esc(x.item)}</b></td><td class="num">${esc(x.kvk)}</td><td class="muted small">${esc(x.note)}</td></tr>`).join('')}</tbody></table></div>
    <div class="alert bad small">${SPEED_NOTE.armament} \u2014 KvK = 30/mnt (lihat tabel di atas). Simpan bank speedup untuk KvK/SG.</div>`;
  const itemGuide=`<div class="scrollx"><table><thead><tr><th>Item</th><th>Status</th><th>Pakai di</th></tr></thead><tbody>
    ${ITEM_GUIDE.map(([it,st,d])=>`<tr><td><b>${esc(it)}</b></td><td><span class="pill ${st==='BEBAS'?'f2p':'s'}">${esc(st)}</span></td><td class="muted small">${esc(d)}</td></tr>`).join('')}</tbody></table></div>`;
  /* encyclopedia */
  const ency=EVENTS_INFO.map(grp=>`<div class="lbl" style="color:var(--accent);margin:14px 0 4px">${esc(grp.g)}</div>`+grp.items.map(e=>{
    const parts=[`<div class="kv"><span>Jadwal</span><b>${esc(e.freq)}</b></div>`];
    if(e.what) parts.push(`<div class="small" style="margin-top:4px">${esc(e.what)}</div>`);
    if(e.tpl && EVENT_TEMPLATES[e.tpl] && (EVENT_TEMPLATES[e.tpl].days||[]).length){
      const t=EVENT_TEMPLATES[e.tpl];
      parts.push(`<h3 style="margin:10px 0 4px">Jadwal per hari</h3><div class="scrollx"><table><thead><tr><th>Hari</th><th>Tema skor</th><th>Pakai SEKARANG</th></tr></thead><tbody>${t.days.map((d,i)=>`<tr><td><b>${esc(d.split(' ')[0])}</b></td><td class="small">${esc(d.replace(/^D\d+\s*/,''))}</td><td class="small muted">${esc(t.spend[i]||'item sesuai tema')}</td></tr>`).join('')}</tbody></table></div>`);
      if(SPEED_NOTE[e.tpl]) parts.push(`<div class="alert warn small" style="margin-top:6px">${SPEED_NOTE[e.tpl]}.</div>`);
      if(t.hold) parts.push(`<div class="alert inf small">🔒 TAHAN: ${esc(t.hold)}</div>`);
    }
    if(e.sit){ const s=SITUATIONS.find(x=>x.key===e.sit); if(s) parts.push(lineupCard(s,age)); }
    return `<details><summary>${esc(e.n)} <span class="tag" style="margin-left:auto">${esc(e.cat)}</span></summary><div class="dt">${parts.join('')}</div></details>`;
  }).join('')).join('');

  el.innerHTML=pageHead('Event','Advisory otomatis: kapan TAHAN item, kapan PAKAI, dan jam berapa \u2014 digerakkan umur server. (Kalender kini tab tersendiri.)')
    +`<div class="seg" id="ev_sub" style="flex-wrap:wrap;margin:4px 0 10px">
        <button data-s="adv">\u25c9 Hari Ini</button><button data-s="live">\ud83d\udce1 Jadwal Live</button><button data-s="hog">\ud83c\udfdb HoG</button><button data-s="mystic">\ud83d\udd2e Mystic Trial</button><button data-s="find">\ud83d\udd0e Cari Event</button><button data-s="ency">\u25a4 Ensiklopedia</button><button data-s="kvk">\u2620 KvK Prep</button><button data-s="roi">\u25c6 Item & ROI</button><button data-s="anti">\u26a0 Anti-P2W</button><button data-s="ally">\ud83e\udd1d Aliansi & King</button>
      </div><div id="ev_subc"></div>`;

  /* SEMUA bagian jadi sub-tab \u2014 satu bagian tampil pada satu waktu, tanpa scroll panjang */
  const EV_SUBS={
    adv: card('Advisory Otomatis','\u25c9',schedHTML,'live',true),
    live: card('Jadwal Kingdom (live)','\ud83d\udce1','<div id="evlive"></div>'),
    cal: card('Kalender Server','\u2691',
      `<p class="muted small">Event PERTUMBUHAN berbasis umur server (HoG \u00b7 KvK \u00b7 SG \u00b7 Burst \u00b7 Milestone). Event mingguan aliansi ada di sub-tab "\ud83d\udce1 Jadwal Live".</p><div id="evcal"></div>`),
    mystic: mysticHTML(),
    find: eventFinderHTML(),
    hog: hogHTML(age),
    kvk: card('KvK Prep','\u2620',
      `<div class="alert ok small">${esc(KVK_PREP.target)}</div>
       <h3>Hitung mundur</h3>${KVK_PREP.stockpile.map(s=>`<div class="check note"><div class="d" style="color:var(--fg)">${esc(s)}</div></div>`).join('')}
       <div class="alert warn small">\ud83d\udc3a ${esc(KVK_PREP.buffs)}</div>
       <h3>Spend per hari</h3><div class="scrollx"><table><thead><tr><th>Hari</th><th>Fokus skor</th></tr></thead><tbody>${KVK_PREP.days.map(([d,f])=>`<tr><td><b>${esc(d)}</b></td><td class="small">${esc(f)}</td></tr>`).join('')}</tbody></table></div>
       <div class="alert inf small">\ud83c\udfe5 ${esc(KVK_PREP.revive)}</div>`),
    roi: card('Nilai Item & Speedup (ROI)','\u25c6',roi+'<h3>Pakai / Tahan / Bebas</h3>'+itemGuide),
    ency: card('Ensiklopedia Event','\u25a4',`<p class="muted small">Cara main F2P tiap event. Jadwal = perkiraan; tab Events di game = acuan final.</p>${ency}`),
    anti: card('Kesalahan F2P (Anti-P2W)','\u26a0',MISTAKES.map((m,i)=>`<div class="check note"><div class="d" style="color:var(--fg)"><span class="num dim">${pad(i+1)}</span> &nbsp;${esc(m)}</div></div>`).join(''))
      +card('Trik Lawan P2W','\ud83e\udd77',`<p class="muted small">Cara F2P/low-spender bersaing & mengungguli whale. Sumber: kingshotmastery, kingshotguide, lootbar, kingshotoptimizer, komunitas (Jun 2026).</p>`
        +(typeof F2P_TRICKS!=='undefined'?F2P_TRICKS.map(([g,arr])=>`<div class="lbl" style="color:var(--accent);margin:14px 0 4px">${esc(g)}</div>`+arr.map(t=>`<div class="check note"><div class="d" style="color:var(--fg)">${esc(t)}</div></div>`).join('')).join(''):'')),
    ally: card('Alliance \u2014 leverage F2P terbesar','\ud83e\udd1d',
      `<div class="lbl" style="margin-bottom:4px">Pilih alliance yang benar</div>
       <div class="small muted">Cari <b>top-2/3 aktif</b>: tech tinggi (buff diwarisi INSTAN), KvK/territory terorganisir, bukan akun mati. Pakai <b>Alliance Teleport</b> (Alliance Shop) pindah ke hive. Alliance dengan <b>NAP</b> = kota lebih aman.</div>
       <div class="lbl" style="margin:12px 0 4px">Urutan donasi Alliance Tech</div>
       <div class="small muted">1. <b>Growth dulu</b> (konstruksi/riset/gather semua) \u2192 buka Plains Enrichment. 2. Seimbangkan <b>Battle</b> (rally governor cap). 3. <b>Territory</b> secukupnya (banner + Storehouse). Donasi ke tech ber-flag "preferred" R4 (+20% reward). Tech kunci: <b>Cooperative Protocols</b> (help 30\u2192150 dtk), <b>Rally Expansion</b> (slot 1\u21924).</div>
       <div class="alert ok small">Peran F2P: <b>JOIN rally, jangan lead</b> (rally cap = CC leader; leader butuh Widget mahal). Spam Help All tiap hari = income token + rank gratis.</div>`)
      +card('King\'s Castle & Title \u2014 buff GRATIS','\ud83d\udc51',
      `<div class="small muted">Castle Battle pertama (~<b>hari 54</b>, timeline kingshot.net) \u2192 alliance pemenang menunjuk <b>King</b>. King beri <b>title/minister</b> (Marshal=Attack, Field Commander=Lethality) = buff stat GRATIS & sementara ke governor mana pun.</div>
       <div class="alert ok small">\ud83d\udca1 Minta title buff (konstruksi/riset) <b>sebelum</b> upgrade besar / riset panjang / snapshot registrasi Championship.</div>
       <div class="lbl" style="margin:12px 0 4px">Castle Battle \u2014 taktik F2P</div>
       <div class="small muted">\u2022 <b>Serang TURRET, bukan castle</b> \u2014 tiap turret musuh = 2% korban/siklus ke pasukan castle (4 turret = 8%).<br>\u2022 <b>Forbidden Zone</b>: TP masuk hanya &lt;1 jam sebelum mulai (lebih awal = kota dipindah, shield hilang).<br>\u2022 Batch-heal slider ~30 mnt + minta help; jangan buang healing speedup kecuali hospital overflow (overflow = 30% mati permanen).</div>`)
  };
  const showSub=k=>{ if(!EV_SUBS[k]||k==='cal') k='adv'; const c=$('#ev_subc',el); if(!c) return; /* Kalender kini tab utama */
    c.innerHTML=EV_SUBS[k];
    $$('#ev_sub button',el).forEach(b=>b.classList.toggle('active',b.dataset.s===k));
    store.set('evSub',k);
    /* section-specific wiring (elements exist only while their sub-tab is shown) */
    if(k==='cal'){ renderCalendar($('#evcal',el));
      /* make sure weekly markers appear even if the Live sub-tab was never opened */
      if(typeof ksLiveEvents==='function') ksLiveEvents().then(()=>{ const ec=$('#evcal',el); if(ec&&store.get('evSub','adv')==='cal') renderCalendar(ec); }); }
    if(k==='live') fillLiveEvents();
    if(k==='mystic') wireMystic(el);
    if(k==='find'){ const q=$('#evfind_q',el), cnt=$('#evfind_count',el);
      const doFilter=()=>{ const v=(q&&q.value||'').toLowerCase().trim(); let n=0;
        $$('.evfind',el).forEach(c=>{ const show=!v||c.dataset.k.indexOf(v)>=0; c.style.display=show?'':'none'; if(show)n++; });
        if(cnt) cnt.textContent=n+' event'; };
      if(q){ q.oninput=doFilter; } doFilter(); }
    if(k==='hog'){ const c=$('#hog_st',el); if(c){ const draw=i=>{ c.innerHTML=hogStageTbl(i); $$('.hibtn',el).forEach(b=>b.classList.toggle('active',+b.dataset.hi===i)); if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate(); }; $$('.hibtn',el).forEach(b=>b.onclick=()=>draw(+b.dataset.hi)); draw(hogCurIdx(age)); } }
    if(k==='adv'&&age!=null){
      const add=$('#sch_add',el); if(add) add.onclick=()=>{ const date=$('#sch_date').value; if(!date){$('#sch_date').focus();return;} const arr=store.get('events',[]); const ty=$('#sch_type').value; const i=arr.findIndex(x=>x.type===ty); if(i>=0)arr[i]={type:ty,date}; else arr.push({type:ty,date}); store.set('events',arr); renderEvent(); };
      $$('.del',el).forEach(b=>b.onclick=()=>{ const arr=store.get('events',[]); arr.splice(+b.dataset.idx,1); store.set('events',arr); renderEvent(); });
    }
    if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate(); };
  $$('#ev_sub button',el).forEach(b=>b.onclick=()=>showSub(b.dataset.s));
  /* Lompatan dari kartu "Sebulan ke depan" (tab Sekarang): buka sub-tab yg diminta,
     lalu buka + gulir ke entri ensiklopedia yg cocok namanya. */
  const _jump=window.__evJump; window.__evJump=null;
  showSub(_jump&&_jump.sub?_jump.sub:store.get('evSub','adv'));
  if(_jump&&_jump.name){ setTimeout(()=>{ const c=$('#ev_subc',el); if(!c) return;
    const want=String(_jump.name).toLowerCase();
    const ds=$$('details',c); for(let i=0;i<ds.length;i++){ const s=ds[i].querySelector('summary');
      if(s&&s.textContent.toLowerCase().indexOf(want)>=0){ ds[i].open=true; ds[i].scrollIntoView({block:'center'}); break; } } },60); }
}

/* ── Hall of Governors sub-tab (data: HOG_DETAIL) ── */
/* Durasi tiap HoG BEDA: #1=5 hari, #2=6 hari, #3+=7 hari (=jumlah stage). Dipakai deteksi iterasi. */
function hogLen(no){ return no<=1?5 : no===2?6 : 7; }
/* SATU sumber kebenaran penomoran HoG: siklus 14 hari, iterasi #1 mulai H6.
   Dulu nomor & datanya dihitung dari dua sumber berbeda (nomor dari hari event, data
   dari umur server) → judul "#2" tapi hero/durasi milik #1 saat #1 masih jalan. */
function hogNoForDay(day){ return day<6?1:Math.floor((day-6)/14)+1; }
function hogStartDay(no){ return 6+(no-1)*14; }
function hogIdxForNo(no){ return no<=1?0 : no===2?1 : no===3?2 : 3; }
/* HoG cuma ada di Gen 1-2: #5 (H62) yang terakhir. Setelahnya jangan diramalkan lagi. */
const HOG_LAST_NO=5;
function hogExists(no){ return no>=1&&no<=HOG_LAST_NO; }
function hogCurIdx(age){
  if(age==null) return 3;
  if(age<6) return 0;
  var no=hogNoForDay(age); var di=age-hogStartDay(no);
  if(di>=hogLen(no)) no++;            /* iterasi ini sudah selesai (pakai durasi asli) → berikutnya */
  return hogIdxForNo(no);
}
/* Status: HoG apa yang AKTIF sekarang / BERIKUTNYA + hari ke-berapa dari durasinya */
function hogStatusLine(age){
  if(age==null) return '';
  if(age<6) return '<div class="alert inf small"><b>📍 Berikutnya:</b> HoG #1 · H6 (~'+(6-age)+' hari)</div>';
  var no=hogNoForDay(age); var di=age-hogStartDay(no); var len=hogLen(no);
  var it=HOG_DETAIL.iters[hogCurIdx(age)]; var hi=it?(' · '+esc(it.hero)+' · '+esc(it.rank)):'';
  var gen3='<div class="alert warn small"><b>📍</b> HoG kemungkinan sudah selesai (cuma Gen 1-2) — fokus KvK / Strongest Governor.</div>';
  if(di<len) return hogExists(no)?'<div class="alert ok small"><b>📍 Sekarang:</b> HoG #'+no+' · hari '+(di+1)+'/'+len+hi+'</div>':gen3;
  var nno=no+1, nstart=hogStartDay(nno);
  if(!hogExists(nno)) return gen3;
  return '<div class="alert inf small"><b>📍 Berikutnya:</b> HoG #'+nno+' · H'+nstart+' (~'+(nstart-age)+' hari)'+hi+'</div>';
}
function hogStageTbl(idx){
  var it=HOG_DETAIL.iters[idx]; if(!it) return '';
  var rows=it.stages.map(function(st){
    var sn=st[0], tasks=st[1];
    var base=sn.replace(/^\d+\s*·\s*/,'');
    var mis=(typeof HOG_STAGE_MISSION!=='undefined'&&HOG_STAGE_MISSION[base])||'';
    return '<tr><td colspan="2" style="padding-top:10px"><b style="color:var(--accent)">Stage '+esc(sn)+'</b></td></tr>'
      + (mis?'<tr><td colspan="2" class="muted small" style="padding-bottom:4px"><b>📋 Misi:</b> '+esc(mis)+'</td></tr>':'')
      + tasks.map(function(t){ return '<tr><td class="small">'+esc(t[0])+'</td><td class="num">'+esc(t[1])+'</td></tr>'; }).join('');
  }).join('');
  return '<div class="kv"><span>Hero of the Season</span><b>'+esc(it.hero)+' \u00b7 '+esc(it.rank)+'</b></div>'
    + '<div class="kv"><span>Durasi</span><b>'+it.stages.length+' hari ('+it.stages.length+' stage)</b></div>'
    + '<div class="kv"><span>Mulai \u00b7 Generasi</span><b>'+esc(it.day)+' \u00b7 '+esc(it.gen)+'</b></div>'
    + '<div class="scrollx"><table><thead><tr><th>Task</th><th>Poin</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    + '<div class="alert inf small" style="margin-top:6px">'+esc(it.note)+'</div>';
}
function hogHTML(age){
  var H=HOG_DETAIL; var cur=hogCurIdx(age);
  var summary='<div class="scrollx"><table><thead><tr><th>HoG</th><th>Hero</th><th>Ambang</th><th>Durasi</th><th>Mulai</th></tr></thead><tbody>'
    + H.iters.map(function(it,i){ return '<tr'+(i===cur?' style="outline:1px solid var(--accent);outline-offset:-1px"':'')+'><td><b>'+esc(it.no)+'</b></td><td class="small">'+esc(it.hero)+'</td><td class="small">'+esc(it.rank)+'</td><td class="small">'+it.stages.length+' hari</td><td class="small muted">'+esc(it.day)+'</td></tr>'; }).join('')
    + '</tbody></table></div>';
  var sel=H.iters.map(function(it,i){ return '<button class="btn ghost sm hibtn'+(i===cur?' active':'')+'" data-hi="'+i+'">HoG '+esc(it.no)+'</button>'; }).join(' ');
  var scale='<details><summary>\u2694\ufe0f Latih Troop \u2014 poin per unit per level</summary><div class="dt"><div class="scrollx"><table><thead><tr><th>Level</th><th>Poin/unit</th></tr></thead><tbody>'+H.troop.map(function(r){return '<tr><td><b>'+esc(r[0])+'</b></td><td class="num">'+esc(r[1])+'</td></tr>';}).join('')+'</tbody></table></div><div class="muted small" style="margin-top:4px">Tier tertinggi jauh lebih berpoin \u2014 jangan spam tier rendah.</div></div></details>'
    + '<details><summary>\ud83d\udee1\ufe0f Governor Gear \u2014 poin per Level Up</summary><div class="dt"><div class="scrollx"><table><thead><tr><th>Rarity</th><th>Level-up score</th></tr></thead><tbody>'+H.govgear.map(function(r){return '<tr><td><b>'+esc(r[0])+'</b></td><td class="num">'+esc(r[1])+'</td></tr>';}).join('')+'</tbody></table></div><div class="muted small" style="margin-top:4px">+500 poin tiap naik max score (di luar tabel).</div></div></details>'
    + '<details><summary>\ud83d\udca0 Governor Charm \u2014 poin per Level Up (HoG #4/#5)</summary><div class="dt"><div class="scrollx"><table><thead><tr><th>Level</th><th>Level-up score</th></tr></thead><tbody>'+H.charm.map(function(r){return '<tr><td><b>'+esc(r[0])+'</b></td><td class="num">'+esc(r[1])+'</td></tr>';}).join('')+'</tbody></table></div><div class="muted small" style="margin-top:4px">+1.000 poin tiap naik max score. Level awal (L4=8.750) lompat besar.</div></div></details>';
  var tips=H.tips.map(function(t,i){ return '<div class="check note"><div class="d" style="color:var(--fg)"><span class="num dim">'+pad(i+1)+'</span> &nbsp;'+esc(t)+'</div></div>'; }).join('');
  return card('Hall of Governors','\ud83c\udfdb',hogStatusLine(age)+'<p class="small" style="margin-top:6px">'+esc(H.intro)+'</p><div class="alert warn small" style="margin-top:6px">\u26a0\ufe0f Yang BERUBAH tiap iterasi = Hero of the Season, ambang leaderboard, durasi, & susunan stage. Poin per task SAMA. Tab Events di game = acuan final.</div><div class="lbl" style="margin:10px 0 4px">Ringkasan 4 iterasi</div>'+summary)
    + card('Tabel Skor per Stage (seperti game)','\u25a6','<p class="muted small">Pilih iterasi \u2014 satu tabel berisi urutan Stage \u2192 Task \u2192 Poin, persis alur di game.</p><div class="seg" style="flex-wrap:wrap;margin-bottom:8px">'+sel+'</div><div id="hog_st"></div>')
    + card('Skala Poin Detail','\u25a4',scale)
    + card('Tips F2P','\ud83d\udca1',tips);
}

/* ── Cari Event: indeks flat semua event (biar tak terkubur di accordion) ── */
function eventFinderHTML(){
  var items=[]; EVENTS_INFO.forEach(function(grp){ (grp.items||[]).forEach(function(e){ items.push([e,grp.g]); }); });
  var list=items.map(function(pair){ var e=pair[0], g=pair[1];
    var key=((e.n||'')+' '+(e.cat||'')+' '+(g||'')+' '+(e.what||'')).toLowerCase();
    return '<div class="lcard evfind" data-k="'+esc(key)+'" style="margin:8px 0">'
      +'<div class="lh"><span class="nm" style="font-size:13px">'+esc(e.n)+'</span><span class="tag" style="margin-left:auto">'+esc(e.cat||'')+'</span></div>'
      +'<div class="dim small mono" style="margin:2px 0 4px">'+esc(e.freq||'')+'</div>'
      +(e.what?'<div class="small">'+esc(e.what)+'</div>':'')
      +'</div>';
  }).join('');
  return card('Cari Event','🔎',
    '<p class="muted small">Ketik nama event untuk cari cepat — apa yang dilakukan, poin, & tips. Semua event ada di sini (tak ada yang terkubur).</p>'
    +'<input id="evfind_q" placeholder="mis. fishing, buccaneer, armament, viking…" autocomplete="off" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,.04);color:var(--fg);margin-bottom:6px;font-size:13px">'
    +'<div class="dim small" id="evfind_count" style="margin-bottom:8px"></div>'
    +'<div id="evfind_list">'+list+'</div>');
}

/* ── Mystic Trial sub-tab (data: MYSTIC_TRIAL) ── */
const _MTC={inf:'#6fa8d6',cav:'#e8a23a',arc:'#ff5a1f'};
function _mtBar(r){ return `<div style="display:flex;height:9px;border-radius:5px;overflow:hidden;border:1px solid var(--border);margin:6px 0">
  <i style="width:${r[0]}%;background:${_MTC.inf}"></i><i style="width:${r[1]}%;background:${_MTC.cav}"></i><i style="width:${r[2]}%;background:${_MTC.arc}"></i></div>`; }
function mysticHTML(){
  const M=MYSTIC_TRIAL;
  const week=[['Sen','Sel'],['Rab','Kam'],['Jum','Sab'],['Min']].map(grp=>{
    const names=M.zones.filter(z=>grp.some(d=>z.days.indexOf(d)>=0)).map(z=>z.name);
    return `<div class="kv"><span class="mono small">${grp.join('/')}</span><span class="small">${names.join(' · ')||'—'}</span></div>`;
  }).join('');
  const rules=`<ul class="mtul">
    <li><b>Counter:</b> ${esc(M.common.counter)}</li>
    <li><b>AI musuh:</b> ${esc(M.common.aiNormal)}; ${esc(M.common.aiBoss)}.</li>
    <li><b>Attempt:</b> ${esc(M.common.attempts)}</li>
    <li><b>Raid:</b> ${esc(M.common.raid)}</li>
    <li style="color:var(--warn)">${esc(M.common.deploy)}</li>
    <li>${esc(M.common.rng)}</li></ul>`;
  const zoneBtns=M.zones.map((z,i)=>`<button class="btn ghost sm mzbtn${i===0?' active':''}" data-mz="${z.key}">${esc(z.name)}</button>`).join(' ');
  const calcOpts=M.zones.map(z=>`<option value="${z.ratio.join(',')}"${z.key==='molten'?' selected':''}>${esc(z.name)} — ${z.ratio.join('/')}</option>`).join('');
  const tableRows=M.zones.map(z=>`<tr><td><b>${esc(z.name)}</b></td><td class="small">${esc(z.days)}</td><td class="small">${esc(z.stat)}</td><td class="mono">${z.ratio.join('/')}</td><td class="small">${esc(z.unlock)}</td></tr>`).join('');
  const tactics=M.tactics.map(t=>`<div class="check note"><div class="d" style="color:var(--fg)"><b>${esc(t[0])}</b><div class="muted small">${esc(t[1])}</div></div></div>`).join('');
  return card('Mystic Trial — 6 Zona','🔮',
      `<p class="muted small">PvE permanen, unlock TC ${M.unlockTC}. Total power TIDAK berlaku — tiap zona hanya menghitung SATU sumber stat. Troop disediakan game (T10) kecuali Radiant Spire (troop sendiri).</p>
       <div class="lbl" style="margin:10px 0 2px">Jadwal mingguan</div>${week}
       <div class="lbl" style="margin:12px 0 2px">Aturan semua zona</div>${rules}`,null,true)
    +card('Detail per Zona','▦',
      `<div class="seg" style="flex-wrap:wrap;margin-bottom:8px">${zoneBtns}</div><div id="mt_detail"></div>`)
    +card('Kalkulator Formasi','◆',
      `<div class="row"><div style="flex:1"><label class="fl">Kapasitas march</label><input id="mt_cap" type="number" value="100000" min="0" step="1000"></div>
       <div style="flex:1"><label class="fl">Zona / preset</label><select id="mt_zone">${calcOpts}</select></div></div>
       <div class="stats" style="margin-top:10px">
        <div class="stat"><div class="sl" style="color:${_MTC.inf}">Infantry</div><div class="sv" id="mt_inf">—</div></div>
        <div class="stat"><div class="sl" style="color:${_MTC.cav}">Cavalry</div><div class="sv" id="mt_cav">—</div></div>
        <div class="stat"><div class="sl" style="color:${_MTC.arc}">Archer</div><div class="sv" id="mt_arc">—</div></div></div>
       <p class="muted small" style="margin-top:8px">Angka presisi 5% = wisdom-of-the-crowds + testing kreator (directionally accurate), bukan rumus resmi.</p>`)
    +card('Ringkasan 6 Zona','▤',
      `<div class="scrollx"><table><thead><tr><th>Zona</th><th>Hari</th><th>Stat</th><th>I/C/A</th><th>Unlock</th></tr></thead><tbody>${tableRows}</tbody></table></div>`)
    +card('Taktik Lanjutan','♟',tactics)
    +card('Shop & Catatan','🎁',
      `<div class="alert inf small">${esc(M.shop)}</div><p class="muted small">${esc(M.note)}</p>`);
}
/* Metode TERVERIFIKASI: % musuh TIDAK tampil sebelum fight — baca dari Battle Report
   setelah kalah, lalu counter saat ulang. Komposisi musuh predictable (bukan acak):
   stage 1-9 ~33/33/33–40/30/30, STAGE 10 tiap set = 53/27/20 (infantry-berat). */
function _mtCounter(ei,ec,ea){
  ei=+ei||0; ec=+ec||0; ea=+ea||0;
  const max=Math.max(ei,ec,ea), min=Math.min(ei,ec,ea);
  if(max-min<=8) return {rec:[50,20,30],unit:'Seimbang',why:'Musuh seimbang (~33/33/33–40/30/30) — pakai 50/20/30 (infantry tank + archer DPS).'};
  if(ei===max) return {rec:[55,15,30],unit:'INFANTRY (tahan) + ARCHER (DPS)',why:'Musuh Infantry-berat (mis. stage 10 = 53/27/20) → TEBALKAN infantry-mu ke 55-60% jadi meat-shield + archer tetap tinggi utk bunuh infantry musuh. JANGAN archer-only (mati tanpa frontline).'};
  if(ec===max) return {rec:[60,15,25],unit:'INFANTRY',why:'Musuh Cavalry-berat → Infantry counter Cavalry. Tebalkan infantry.'};
  return {rec:[50,30,20],unit:'CAVALRY',why:'Musuh Archer-berat → Cavalry counter Archer. Naikkan cavalry.'};
}
function _mtMethod(z){
  const s10=Math.min(60,z.ratio[0]+10), s10a=Math.max(0,100-s10-z.ratio[1]);
  return `<div class="lbl" style="margin:14px 0 4px">Stage 5-10: pakai troop apa</div>
   <div class="alert warn small">⚠ % musuh TIDAK kelihatan sebelum fight — cuma di <b>Battle Report SETELAH kalah</b>. Tapi komposisinya <b>TETAP (bukan acak)</b>: stage 1-9 ~<b>33/33/33–40/30/30</b> (seimbang), <b>STAGE 10 tiap set = 53/27/20</b> (infantry-berat).</div>
   <ul class="mtul">
     <li><b>Stage 5-9:</b> pakai baseline zona <b>${z.ratio.join('/')}</b> (musuh seimbang).</li>
     <li><b>Stage 10 (tembok):</b> musuh 53/27/20 → <b>tebalkan INFANTRY-mu jadi ${s10}/${z.ratio[1]}/${s10a}</b> (meat-shield), archer tetap DPS. Jangan archer-only (mati tanpa frontline).</li>
     <li><b>Set sumber stat zona</b> (${esc(z.stat)}) + hero SKILL TEMPUR saja; jangan ada tipe troop = 0 (sisakan ≥5% biar skill buff hero aktif).</li>
     <li><b>Kalah?</b> baca Battle Report → frontline cepat habis: +5-10% Infantry; damage kurang: +5% Archer. Lalu ULANG.</li>
     <li><b>RNG besar — habiskan 5 attempt</b> (komposisi musuh tetap, hasil-nya yang RNG; menang = gratis lanjut).</li>
     <li><b>Tetap mentok?</b> itu batas STAT — upgrade ${esc(z.stat.split('(')[0].trim())}, bukan formasi.</li>
     ${z.heroes?`<li><b>3 team</b> (zona hero-based): stage dalam butuh 3 team berhero — beri gear minimal ke hero ke-2/3 (trik reset Armor XP). Urutan bertarung RNG, tak bisa di-"umpan".</li>`:''}
   </ul>
   <div class="lbl" style="margin:14px 0 4px">Kalkulator Counter — isi rasio musuh (dari Battle Report setelah kalah)</div>
   <div class="row">
     <div style="flex:1"><label class="fl">Musuh Inf %</label><input id="mtc_ei" type="number" value="53" min="0" max="100"></div>
     <div style="flex:1"><label class="fl">Cav %</label><input id="mtc_ec" type="number" value="27" min="0" max="100"></div>
     <div style="flex:1"><label class="fl">Archer %</label><input id="mtc_ea" type="number" value="20" min="0" max="100"></div>
   </div>
   <div id="mtc_out" style="margin-top:8px"></div>
   <p class="muted small" style="margin-top:6px">Default terisi pola stage-10 (53/27/20). Stage 10 = juga syarat unlock Raid.</p>`;
}
function _wireCounter(el){
  const ei=$('#mtc_ei',el),ec=$('#mtc_ec',el),ea=$('#mtc_ea',el),out=$('#mtc_out',el);
  if(!ei||!ec||!ea||!out) return;
  const upd=()=>{ const s=_mtCounter(ei.value,ec.value,ea.value);
    out.innerHTML=`<div class="mono"><b>Bawa lebih: <span style="color:var(--accent)">${s.unit}</span></b></div>`+_mtBar(s.rec)
      +`<div class="mono small">Formasi: <b style="color:${_MTC.inf}">${s.rec[0]}</b>/<b style="color:${_MTC.cav}">${s.rec[1]}</b>/<b style="color:${_MTC.arc}">${s.rec[2]}</b></div><div class="small muted" style="margin-top:4px">${esc(s.why)}</div>`; };
  [ei,ec,ea].forEach(i=>i.addEventListener('input',upd)); upd();
}
function _mtZoneDetail(z){
  const tag=(on,txt)=>`<span class="tag" style="${on?'color:var(--profit)':'opacity:.7'}">${txt}</span>`;
  const _age=(typeof profileAge==='function')?profileAge().age:null;
  const leadBlock=z.lead?('<div class="lbl" style="margin:12px 0 4px">⭐ Leader zona'+(z.heroes?' (otomatis sesuai umur)':'')+'</div><div class="alert inf small">'
    +(z.heroes?heroNowLine(_age)+'<div class="dim small" style="margin-top:6px">'+esc(z.lead)+'</div>':esc(z.lead))+'</div>'):'';
  return `<div class="kv"><b style="font-size:15px">${esc(z.name)}</b><span class="mono small" style="color:var(--accent)">⏱ ${esc(z.days)}</span></div>
    <div class="small" style="margin:4px 0">Stat dihitung: <b>${esc(z.stat)}</b></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${tag(true,'Unlock: '+esc(z.unlock))} ${tag(true,esc(z.teams))} ${tag(z.heroes,z.heroes?'Hero dihitung ✓':'Hero tidak dihitung')} ${tag(z.ownTroops,z.ownTroops?'Troop sendiri':'Troop game (T10)')}</div>
    ${_mtBar(z.ratio)}<div class="mono small">Rekomendasi: <b style="color:${_MTC.inf}">${z.ratio[0]}</b> / <b style="color:${_MTC.cav}">${z.ratio[1]}</b> / <b style="color:${_MTC.arc}">${z.ratio[2]}</b> (Inf/Cav/Arc)</div>
    ${leadBlock}
    ${z.marches?`<div class="lbl" style="margin:12px 0 4px">Susunan team (stage lanjut butuh 3 team)</div>
     <div class="scrollx"><table><thead><tr><th>Team</th><th>Hero</th><th>Catatan</th></tr></thead><tbody>${z.marches.map(m=>`<tr><td class="small"><b>${esc(m.m)}</b></td><td class="small">${esc(m.hero)}</td><td class="small muted">${esc(m.why)}</td></tr>`).join('')}</tbody></table></div>`:''}
    <ul class="mtul" style="margin-top:8px">${z.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
    ${_mtMethod(z)}`;
}
function wireMystic(el){
  const M=MYSTIC_TRIAL;
  const det=$('#mt_detail',el); let cur=M.zones[0];
  const show=z=>{ cur=z; if(det) det.innerHTML=_mtZoneDetail(z);
    $$('.mzbtn',el).forEach(b=>b.classList.toggle('active',b.dataset.mz===z.key));
    if(det) _wireCounter(det); };
  $$('.mzbtn',el).forEach(b=>b.onclick=()=>{ const z=M.zones.find(x=>x.key===b.dataset.mz); if(z) show(z); });
  show(M.zones[0]);
  const cap=$('#mt_cap',el),zo=$('#mt_zone',el);
  const calc=()=>{ const tot=Math.max(0,parseInt(cap.value)||0); const [pi,pc]=zo.value.split(',').map(Number);
    const inf=Math.round(tot*pi/100),cav=Math.round(tot*pc/100),arc=tot-inf-cav;
    const f=n=>n.toLocaleString('id-ID'); $('#mt_inf',el).textContent=f(inf); $('#mt_cav',el).textContent=f(cav); $('#mt_arc',el).textContent=f(arc<0?0:arc); };
  if(cap&&zo){ cap.addEventListener('input',calc); zo.addEventListener('change',calc); calc(); }
}

/* ============ BANGUN (build + progres) ============ */
function _calcEN(){ return !!(window.__getLang&&window.__getLang()==='en'); }
function _fmtMin(mins){
  mins=Math.max(0,Math.round(mins));
  var d=Math.floor(mins/1440), h=Math.floor((mins%1440)/60), m=mins%60, out=[], en=_calcEN();
  var U=en?['d','h','m']:['hari','jam','mnt'];
  if(d) out.push(d+' '+U[0]); if(h) out.push(h+' '+U[1]); if(m||!out.length) out.push(m+' '+U[2]);
  return out.join(' ');
}
function buildCalcCard(){
  return card('Kalkulator Waktu Bangun & Speedup','🧮',
    `<p class="muted small">Hitung waktu upgrade sebenarnya setelah bonus <b>Construction Speed</b>, dan berapa speedup yang dibutuhkan. Baca <b>base time</b> di layar upgrade dan total <b>Construction Speed %</b> di profil buff-mu (VIP + Research + Chief Minister + pet Gray Wolf + decree).</p>
     <div class="calcgrid">
       <label class="calcf"><span>Base — Hari</span><input id="cd_d" type="number" min="0" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Base — Jam</span><input id="cd_h" type="number" min="0" max="23" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Base — Menit</span><input id="cd_m" type="number" min="0" max="59" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Construction Speed %</span><input id="cd_p" type="number" min="0" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Speedup dimiliki (menit)</span><input id="cd_su" type="number" min="0" value="0" inputmode="numeric"></label>
       <label class="calcf chk"><input id="cd_dt" type="checkbox"> Double Time Decree (−50%)</label>
     </div>
     <div id="cd_out" class="calcout"></div>
     <div class="alert inf small">💡 Simpan upgrade besar untuk hari <b>City Construction</b> (KvK D1/D5, SG D1, stage City Construction HoG) → dobel manfaat: naik level + poin event. Aktifkan <b>Double Time</b> + pet <b>Gray Wolf</b> SEBELUM mulai (window 5 mnt).</div>
     <div class="muted small">Rumus: Double Time diterapkan ke base dulu (×0.5), lalu Construction Speed menumpuk (÷ (1 + %/100)) — sesuai mekanik in-game, bukan stack flat.</div>`,
    null,true);
}
function wireCalc(root){
  var el=root||document;
  function num(id){ var e=$('#'+id,el); return e?(parseFloat(e.value)||0):0; }
  function calc(){
    var out=$('#cd_out',el); if(!out) return; var en=_calcEN();
    var base=num('cd_d')*1440+num('cd_h')*60+num('cd_m');
    if(base<=0){ out.innerHTML='<div class="muted small">'+(en?'Enter the base time from the upgrade screen to start calculating.':'Isi base time dari layar upgrade untuk mulai menghitung.')+'</div>'; return; }
    var p=num('cd_p'); var dt=$('#cd_dt',el)&&$('#cd_dt',el).checked;
    var eff=base*(dt?0.5:1)/(1+p/100); var saved=base-eff; var own=num('cd_su'); var rem=eff-own;
    var suLine = own>0
      ? (rem<=0 ? '<b class="ok">'+(en?'Enough speedups':'Speedup cukup')+'</b>'+(en?' — finishes instantly ('+_fmtMin(-rem)+' speedups left).':' — selesai instan (sisa '+_fmtMin(-rem)+' speedup).')
                : (en?'Use all speedups → still wait <b>'+_fmtMin(rem)+'</b>.':'Pakai semua speedup → sisa nunggu <b>'+_fmtMin(rem)+'</b>.'))
      : (en?'Need <b>'+_fmtMin(eff)+'</b> of speedups to finish instantly.':'Butuh <b>'+_fmtMin(eff)+'</b> speedup untuk selesai instan.');
    out.innerHTML=
      '<div class="calcrow"><span>'+(en?'Actual time':'Waktu sebenarnya')+'</span><b class="num">'+_fmtMin(eff)+'</b></div>'
     +'<div class="calcrow"><span>'+(en?'Saved by buffs':'Hemat dari buff')+'</span><b class="num ok">'+_fmtMin(saved)+'</b></div>'
     +'<div class="calcrow"><span>'+(en?'Speedups':'Speedup')+'</span><span class="small">'+suLine+'</span></div>';
  }
  ['cd_d','cd_h','cd_m','cd_p','cd_su'].forEach(function(id){ var e=$('#'+id,el); if(e) e.oninput=calc; });
  var c=$('#cd_dt',el); if(c) c.onchange=calc;
  calc();
}
/* ===== Kalkulator Statistik Tempur ===== */
function statCalcCard(){
  return card('Kalkulator Statistik Tempur','⚔',
    `<p class="muted small">4 stat inti Kingshot — <b>Attack</b> + <b>Lethality</b> = kekuatan serang; <b>Defense</b> + <b>Health</b> = daya tahan. Isi total bonus %-mu (Avatar → Stat / detail troop) untuk lihat keseimbangan & stat mana yang jadi prioritas.</p>
     <div class="calcgrid">
       <label class="calcf"><span>Attack %</span><input id="st_atk" type="number" min="0" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Lethality %</span><input id="st_let" type="number" min="0" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Defense %</span><input id="st_def" type="number" min="0" value="0" inputmode="numeric"></label>
       <label class="calcf"><span>Health %</span><input id="st_hp" type="number" min="0" value="0" inputmode="numeric"></label>
     </div>
     <div id="st_out" class="calcout"></div>
     <p class="muted small" style="margin-top:4px">Indeks = pengali relatif dari buff-mu (bukan angka power in-game). Gunanya lihat keseimbangan serang↔tahan dan stat terlemah untuk dinaikkan lebih dulu.</p>
     <div class="lbl" style="margin:16px 0 4px">Rasio Formasi vs Musuh</div>
     <p class="muted small">RPS: <b>Archer › Infantry › Cavalry › Archer</b>. Pilih tipe pasukan dominan musuh (dari Battle Report) → rasio counter Inf/Archer/Cav.</p>
     <label class="calcf" style="max-width:280px"><span>Tipe musuh</span>
       <select id="st_enemy">
         <option value="bal">Tak tahu / seimbang</option>
         <option value="inf">Infantry-berat</option>
         <option value="arc">Archer-berat</option>
         <option value="cav">Cavalry-berat</option>
       </select></label>
     <div id="st_ratio" class="calcout"></div>
     <div class="alert inf small">💡 Meta F2P: <b>50/0/50</b> (Infantry + Archer, tanpa Cavalry) — infantry tembok, archer DPS. Jaga floor <b>5.000 infantry</b> supaya skill hero infantry aktif. Default (musuh tak diketahui) = 50/20/30.</div>`,
    null,true);
}
function wireStat(root){
  var el=root||document;
  function num(id){ var e=$('#'+id,el); return e?(parseFloat(e.value)||0):0; }
  var RAT={ bal:[50,20,30], inf:[30,50,20], arc:[30,20,50], cav:[60,20,20] };
  function calc(){
    var en=_calcEN();
    var out=$('#st_out',el);
    if(out){
      var off=(1+num('st_atk')/100)*(1+num('st_let')/100);
      var def=(1+num('st_def')/100)*(1+num('st_hp')/100);
      var stats=[['Attack','st_atk'],['Lethality','st_let'],['Defense','st_def'],['Health','st_hp']];
      var minv=Infinity,minn=''; stats.forEach(function(s){ var v=num(s[1]); if(v<minv){minv=v;minn=s[0];} });
      out.innerHTML=
        '<div class="calcrow"><span>'+(en?'Offense index':'Indeks Serang')+'</span><b class="num">×'+off.toFixed(2)+'</b></div>'
       +'<div class="calcrow"><span>'+(en?'Defense index':'Indeks Tahan')+'</span><b class="num">×'+def.toFixed(2)+'</b></div>'
       +'<div class="calcrow"><span>'+(en?'Raise first':'Prioritas naikkan')+'</span><b class="num ok">'+minn+'</b></div>';
    }
    var rr=$('#st_ratio',el);
    if(rr){
      var ekey=$('#st_enemy',el)?$('#st_enemy',el).value:'bal'; var r=RAT[ekey]||RAT.bal;
      var expl={ bal:en?'balanced / enemy unknown':'seimbang / musuh tak diketahui',
                 inf:en?'archer beats infantry':'archer kalahkan infantry',
                 arc:en?'cavalry beats archer':'cavalry kalahkan archer',
                 cav:en?'infantry beats cavalry':'infantry kalahkan cavalry' };
      rr.innerHTML=
        '<div class="calcrow"><span>'+(en?'Recommended ratio':'Rasio disarankan')+'</span><b class="num">'+r[0]+' / '+r[1]+' / '+r[2]+'</b></div>'
       +'<div class="calcrow"><span class="small">Inf / Archer / Cav — '+esc(expl[ekey])+'</span></div>';
    }
  }
  ['st_atk','st_let','st_def','st_hp'].forEach(function(id){ var e=$('#'+id,el); if(e) e.oninput=calc; });
  var es=$('#st_enemy',el); if(es) es.onchange=calc;
  calc();
}
/* ===== Tab Kalkulator (Building + Statistik) ===== */
function renderKalkulator(){
  const el=$('[data-tab=kalkulator]'); if(!el) return;
  el.innerHTML=pageHead('Kalkulator','Alat hitung: waktu bangun & speedup, dan statistik tempur (power & rasio formasi).')
    +`<div class="seg" id="kk_sub" style="flex-wrap:wrap;margin:4px 0 10px">
        <button data-s="build">🧮 Building</button><button data-s="stat">⚔ Statistik</button>
      </div><div id="kk_subc"></div>`;
  const KK_SUBS={ build:buildCalcCard(), stat:statCalcCard() };
  const showSub=k=>{ if(!KK_SUBS[k]) k='build'; const c=$('#kk_subc',el); if(!c) return;
    c.innerHTML=KK_SUBS[k];
    $$('#kk_sub button',el).forEach(b=>b.classList.toggle('active',b.dataset.s===k));
    store.set('kkSub',k);
    if(k==='build') wireCalc(el);
    if(k==='stat') wireStat(el);
    if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate(); };
  $$('#kk_sub button',el).forEach(b=>b.onclick=()=>showSub(b.dataset.s));
  showSub(store.get('kkSub','build'));
}
/* ===== Tab Kalender (dipindah dari sub-tab Event jadi tab utama) ===== */
function renderKalender(){
  const el=$('[data-tab=kalender]'); if(!el) return;
  el.innerHTML=pageHead('Kalender Server','Event pertumbuhan (umur server) + rotasi mingguan live kingshot.net — sesuai server-mu.')
    +card('Kalender Server','⚑',
      `<p class="muted small">Event PERTUMBUHAN berbasis umur server (HoG · KvK · SG · Burst · Milestone) + event mingguan aliansi (rotasi live kingshot.net). Klik tanggal untuk detail.</p><div id="evcal_k"></div>`);
  renderCalendar($('#evcal_k',el));
  if(typeof ksLiveEvents==='function') ksLiveEvents().then(()=>{ const ec=$('#evcal_k',el); if(ec&&$('[data-tab=kalender]').classList.contains('active')) renderCalendar(ec); });
  if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate();
}
/* ===== Tab Castle Battle — riset + simulasi posisi ===== */
function nextCastleDay(age){ if(age==null) return 54; if(age<54) return 54; return 54+Math.ceil((age-54+0.0001)/18)*18; }
/* Hero Castle Battle per generasi (sumber: kingshotwiki). Attack = pecah/serang; Garrison = tahan.
   Gen 1-2 belum punya hero meta (Petra/Eric/Jaeger dst) → pakai yang ada + saran F2P. */
const CB_ATK={1:'Jabel (lead) · Amadeus (bila VIP) · Quinn',2:'Amadeus · Zoe · Marlin',3:'Amadeus · Petra · Marlin',4:'Amadeus · Petra · Rosa',5:'Amadeus · Petra/Thrud · Rosa',6:'Amadeus/Triton · Petra/Thrud · Yang',7:'Amadeus/Triton/Charles · Ava · Wee&Woo'};
const CB_DEF={1:'Howard (tank garrison) · F2P: JOIN garrison rally',2:'Howard/Zoe · Hilde',3:'Eric · Jaeger · Hilde',4:'Alcar · Jaeger · Margot',5:'Long Fei · Jaeger · Margot',6:'Long Fei · Jaeger · Margot',7:'Long Fei · Jaeger · Margot'};
function _cbGen(age){ return (typeof _genNum==='function'&&age!=null)?_genNum(age):1; }
function attackRallyHeroes(age){ return CB_ATK[_cbGen(age)]||CB_ATK[3]; }
function defenseHeroes(age){ return CB_DEF[_cbGen(age)]||CB_DEF[3]; }
function cbRatioBar(inf,cav,arc){ var seg=function(w,c){ return w>0?'<i style="display:block;height:100%;width:'+w+'%;background:'+c+'"></i>':''; };
  return '<div style="display:flex;height:9px;border-radius:5px;overflow:hidden;margin:7px 0 3px;background:var(--bg-3)">'+seg(inf,'#6b93f2')+seg(cav,'#d1a24a')+seg(arc,'#c8434f')+'</div>'
    +'<div class="small" style="display:flex;gap:14px"><span><b style="color:#6b93f2">'+inf+'%</b> Inf</span><span><b style="color:#d1a24a">'+cav+'%</b> Cav</span><span><b style="color:#c8434f">'+arc+'%</b> Arc</span></div>'; }
var CB_TP={n:[170,74],e:[270,154],s:[170,234],w:[70,154]};
var CB_BASE={n:[170,32],e:[318,154],s:[170,300],w:[22,154]};
function castleMapSVG(){
  var tur=function(id,lbl){ var p=CB_TP[id]; return '<g id="tur-'+id+'" class="turret enemy" style="cursor:pointer" tabindex="0"><circle cx="'+p[0]+'" cy="'+p[1]+'" r="21"/><text x="'+p[0]+'" y="'+(p[1]+4)+'" text-anchor="middle" class="tl">⛨</text><text x="'+p[0]+'" y="'+(p[1]+34)+'" text-anchor="middle" class="tn">'+lbl+'</text></g>'; };
  return '<svg class="cbmap" viewBox="0 0 340 332" role="img" aria-label="Peta Castle Battle">'
    +'<circle cx="170" cy="154" r="112" class="fzone"/>'
    +'<g id="cb_base"></g>'
    +tur('n','Turret N')+tur('e','Turret E')+tur('s','Turret S')+tur('w','Turret W')
    +'<g><rect x="146" y="130" width="48" height="48" rx="8" class="castle"/><text x="170" y="161" text-anchor="middle" class="cico">🏰</text><text x="170" y="196" text-anchor="middle" class="cn">King'+"'"+'s Castle</text></g>'
    +'<text x="170" y="326" text-anchor="middle" class="stage">1 march = 1 struktur · staging di LUAR ring</text>'
    +'</svg>';
}
function wireCastle(root){
  var el=root||document; var st={n:'enemy',e:'enemy',s:'us',w:'us'}; var dir='s';
  var eng=function(){ return !!(window.__getLang&&window.__getLang()==='en'); };
  var DIRS={ n:{nm:['Utara','North'],adj:['w','e'],far:'s'}, e:{nm:['Timur','East'],adj:['n','s'],far:'w'}, s:{nm:['Selatan','South'],adj:['e','w'],far:'n'}, w:{nm:['Barat','West'],adj:['s','n'],far:'e'} };
  function paintTur(){
    ['n','e','s','w'].forEach(function(k){ var g=$('#tur-'+k,el); if(g) g.setAttribute('class','turret '+st[k]); });
    var en=['n','e','s','w'].filter(function(k){return st[k]==='enemy';}).length;
    var out=$('#cb_out',el); if(!out) return; var atr=en*2; var L=eng();
    out.innerHTML='<div class="calcrow"><span>'+(L?'Turrets held by enemy':'Turret dikuasai musuh')+'</span><b class="num">'+en+' / 4</b></div>'
     +'<div class="calcrow"><span>'+(L?'Attrition to your garrison':'Attrition ke garrison-mu')+'</span><b class="num" style="'+(atr>=6?'color:var(--loss)':(atr===0?'color:var(--win,#5bd6a0)':''))+'">−'+atr+'% / siklus</b></div>'
     +'<div class="calcrow"><span class="small">'+(en>0?(L?'Retake the '+en+' enemy turret(s) → 0% attrition. Hit TURRETS first, then hold.':'Rebut '+en+' turret musuh → attrition 0%. Serang TURRET dulu, baru tahan castle.'):(L?'All turrets safe — defend & hold the castle.':'Semua turret aman — pertahankan & tahan castle.'))+'</span></div>';
  }
  function paintBase(){
    var b=CB_BASE[dir], t=CB_TP[dir], g=$('#cb_base',el);
    if(g) g.innerHTML='<line x1="'+b[0]+'" y1="'+b[1]+'" x2="170" y2="154" class="rl-atk"/>'
      +'<line x1="'+b[0]+'" y1="'+b[1]+'" x2="'+t[0]+'" y2="'+t[1]+'" class="rl-tur"/>'
      +'<circle cx="'+t[0]+'" cy="'+t[1]+'" r="26" class="turhi"/>'
      +'<circle cx="'+b[0]+'" cy="'+b[1]+'" r="15" class="ourbase"/><text x="'+b[0]+'" y="'+(b[1]+4)+'" text-anchor="middle" class="obt">🚩</text>';
    $$('#cb_dir button',el).forEach(function(x){ x.classList.toggle('active',x.dataset.dir===dir); });
    var D=DIRS[dir], L=eng(), nm=D.nm[L?1:0], U=function(k){return k.toUpperCase();};
    var gd=$('#cb_guide',el); if(!gd) return;
    gd.innerHTML = L
      ? '<b>Base in the '+nm+'</b> → stage outside the ring on the '+nm+' side.<br>• <b>🔴 Attack rally</b> (strongest players) → King\'s Castle (center).<br>• <b>🟢 Turret rally</b> → Turret '+U(dir)+' (nearest = capture & HOLD, easy to defend) + Turret '+D.adj.map(U).join('/')+' (secondary).<br>• <b>🚩 Joiners</b> → gather behind the rally leader, tap JOIN (only a joiner\'s 1st Expedition skill counts).<br>• Turret '+U(D.far)+' (opposite) → leave to the alliance on that side.'
      : '<b>Base di '+nm+'</b> → staging di luar ring sisi '+nm+'.<br>• <b>🔴 Rally SERANG</b> (pemain terkuat) → King\'s Castle (tengah).<br>• <b>🟢 Rally TURRET</b> → Turret '+U(dir)+' (terdekat = rebut & TAHAN, mudah dibela) + Turret '+D.adj.map(U).join('/')+' (sekunder).<br>• <b>🚩 Joiner</b> → kumpul di belakang rally leader, tekan JOIN (cuma skill Expedition #1 joiner yang dihitung).<br>• Turret '+U(D.far)+' (seberang) → serahkan ke aliansi sisi itu.';
  }
  $$('#cb_dir button',el).forEach(function(b){ b.onclick=function(){ dir=b.dataset.dir; paintBase(); }; });
  ['n','e','s','w'].forEach(function(k){ var g=$('#tur-'+k,el); if(g){ g.onclick=function(){ st[k]=st[k]==='enemy'?'us':(st[k]==='us'?'contested':'enemy'); paintTur(); }; g.onkeydown=function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); g.onclick(); } }; } });
  paintTur(); paintBase();
}
function renderCastle(){
  const el=$('[data-tab=castle]'); if(!el) return;
  const {start,age}=profileAge();
  const L=!!(window.__getLang&&window.__getLang()==='en'); const P2W=isP2W();
  let cdCard;
  if(age!=null){ const nd=nextCastleDay(age); const left=nd-age;
    cdCard=card(L?'Countdown':'Hitung Mundur','⏳',
      `<div class="stats"><div class="stat acc"><div class="sl">${L?'Next Castle Battle':'Castle Battle berikutnya'}</div><div class="sv sm">${left<=0?(L?'≈ today':'≈ hari ini'):'~'+left+(L?' days':' hari')}</div></div>
        <div class="stat"><div class="sl">${L?'Estimated date':'Perkiraan tanggal'}</div><div class="sv sm">${addDaysFmt(start,nd)}</div></div>
        <div class="stat"><div class="sl">${L?'Server age':'Umur server'}</div><div class="sv">${L?'D':'H'}${age}</div></div></div>
       <div class="muted small">${L?"First ~day 54, then ~every 18 days (biweekly, often Saturday). Exact timer: zoom the world map → tap the King's Castle. May be Standard or KvK Castle Battle.":"Pertama ~hari 54, lalu ~tiap 18 hari (biweekly, sering Sabtu). Timer pasti: zoom peta dunia → tap King's Castle. Format bisa Standard atau KvK Castle Battle."}</div>`,null,true);
  } else cdCard='<div class="alert inf small">'+(L?'Connect your Player ID (Profile tab) for the Castle Battle countdown.':'Hubungkan Player ID (tab Profil) untuk hitung mundur Castle Battle.')+'</div>';
  const mapCard=card(L?'Map & Position Simulator':'Simulasi Peta & Posisi','🗺',
    `<p class="muted small">${L?'5 structures: <b>Castle</b> (center) + <b>4 turrets</b>. Each turret held by the <b>enemy</b> = <b>−2%</b> troops/cycle to the castle holder (max −8%). Tap a turret to simulate (enemy → you → contested).':'5 struktur: <b>Castle</b> (tengah) + <b>4 turret</b>. Tiap turret yang dipegang <b>musuh</b> = <b>−2%</b> pasukan/siklus ke penahan castle (maks −8%). Ketuk turret untuk simulasi (musuh → kamu → rebutan).'}</p>
     <div class="cbdir">${L?'Our alliance base:':'Base aliansi kita:'} <span id="cb_dir"><button data-dir="n">${L?'North':'Utara'}</button><button data-dir="e">${L?'East':'Timur'}</button><button data-dir="s" class="active">${L?'South':'Selatan'}</button><button data-dir="w">${L?'West':'Barat'}</button></span></div>
     ${castleMapSVG()}
     <div class="cbleg"><span><i class="d us"></i> ${L?'our turret':'turret kita'}</span><span><i class="d enemy"></i> ${L?'enemy':'musuh'}</span><span><i class="d contested"></i> ${L?'contested':'rebutan'}</span><span><i class="d base"></i> ${L?'our base':'base kita'}</span></div>
     <div id="cb_guide" class="alert inf small"></div>
     <div class="lbl" style="margin:10px 0 2px">${L?'Turret attrition sim':'Simulasi attrition turret'}</div>
     <div id="cb_out" class="calcout"></div>`,null,true);
  const winCard=card(L?'How to Win & Score':'Cara Menang & Skor','🏆',
    `<div class="alert ok small">${L?"<b>Win</b> = hold the Castle <b>2.5–3h straight</b> (instant win), OR the <b>highest total hold time</b> when the event (5–6h) ends. Counted per-<b>ALLIANCE</b>, not one timer — don't split holds.":'<b>Menang</b> = tahan Castle <b>2,5–3 jam beruntun</b> (langsung menang), ATAU <b>total waktu tahan tertinggi</b> saat event (5–6 jam) habis. Dihitung per-<b>ALIANSI</b>, bukan 1 timer — jangan pecah hold antar grup.'}</div>
     <div class="lbl" style="margin:12px 0 4px">${L?"3 point sources — FIGHT, don't idle":'3 sumber poin — FIGHT, jangan diam'}</div>
     <div class="scrollx"><table><thead><tr><th>${L?'Points':'Poin'}</th><th>${L?'From':'Dari'}</th></tr></thead><tbody>
       <tr><td><b>Carnage / KO</b></td><td class="small">${L?'Kill/wound enemy troops at the castle & turrets':'Bunuh/lukai pasukan musuh di castle & turret'}</td></tr>
       <tr><td><b>Occupation</b></td><td class="small">${L?'POWER of troops you station × hold time':'POWER pasukan yang kamu stasiunkan × lama tahan'}</td></tr>
       <tr><td><b>Casualty</b></td><td class="small">${L?'Your troops wounded while fighting':'Pasukanmu yang terluka saat bertempur'}</td></tr>
     </tbody></table></div>
     <div class="alert warn small">${L?'Idle holding WITHOUT fighting = low score. Points come from <b>active combat</b>.':'Diam menahan struktur TANPA bertempur = skor kecil. Poin datang dari <b>pertempuran aktif</b>.'}</div>
     <div class="alert inf small">${L?'🩹 Troops are NOT permanently killed unless the <b>hospital is full</b> (then 30% lost, 70% recovered via the Enlistment Office/Loyalty). Watch hospital capacity.':'🩹 Pasukan TIDAK mati permanen kecuali <b>hospital penuh</b> (lalu 30% hilang, 70% balik via Enlistment Office/Loyalty). Pantau kapasitas hospital.'}</div>`);
  const heroCard=card(L?'Heroes & Ratios — Attack vs Hold':'Hero & Rasio — Serang vs Tahan','⚔',
    `<p class="muted small">${age!=null?(L?'Your generation: <b>Gen '+_cbGen(age)+'</b>. ':'Generasimu: <b>Gen '+_cbGen(age)+'</b>. '):''}${L?'<b>ATTACK</b> rally = break/capture · <b>HOLD</b> (garrison) rally = keep the castle. Source: kingshotwiki.':'Rally <b>SERANG</b> = pecah/rebut · Rally <b>TAHAN</b> (garrison) = hold castle. Sumber: kingshotwiki.'}</p>
     <div class="grid2">
       <div>
         <div class="lbl" style="color:#c8737a">${L?'⚔ Attack (rally)':'⚔ Serang (Attack Rally)'}</div>
         <div class="alert inf small" style="margin:4px 0">${age!=null?esc(attackRallyHeroes(age)):(L?'Connect your Player ID.':'Hubungkan Player ID.')}</div>
         <div class="small muted">${L?'Standard ratio':'Rasio standar'}</div>${cbRatioBar(50,20,30)}
         <div class="small muted" style="margin-top:8px">${L?'Vs infantry-heavy castle':'Vs castle Infantry-berat'}</div>${cbRatioBar(50,0,50)}
         <div class="dim small" style="margin-top:4px">${L?'Archers melt infantry; drop Cav if the enemy has no archers.':'Archer lumat infantry; buang Cav kalau musuh tak punya archer.'}</div>
       </div>
       <div>
         <div class="lbl" style="color:#6fbf95">${L?'🛡 Hold (garrison)':'🛡 Tahan (Garrison)'}</div>
         <div class="alert inf small" style="margin:4px 0">${age!=null?esc(defenseHeroes(age)):(L?'Connect your Player ID.':'Hubungkan Player ID.')}</div>
         <div class="small muted">${L?'Garrison ratio (durability)':'Rasio garrison (durability)'}</div>${cbRatioBar(60,40,0)}
         <div class="dim small" style="margin-top:4px">${L?'Infantry-heavy + cavalry, NO archers. Heroes focused on survivability/sustain.':'Infantry-berat + cavalry, TANPA archer. Hero fokus survivability/sustain.'}</div>
       </div>
     </div>
     <div class="alert warn small" style="margin-top:10px">${L?'RPS: <b>Archer › Infantry › Cavalry › Archer</b>. Scout the enemy garrison first; unknown → use 50/20/30.':'RPS: <b>Archer › Infantry › Cavalry › Archer</b>. Scout garrison musuh dulu; tak tahu → pakai 50/20/30.'}</div>`);
  const posCard=card(L?'Positions & Roles':'Posisi & Peran','📍',
    `<div class="lbl" style="margin-bottom:4px">${L?'Positioning rules':'Aturan posisi'}</div>
     <ul class="doul">
       <li>${L?"<b>1 march = 1 structure</b> — troops in a turret can't also be in the castle.":'<b>1 march = 1 struktur</b> — pasukan di turret tak bisa sekaligus di castle.'}</li>
       <li>${L?'<b>Forbidden zone</b>: TP in only <b>&lt;1 hour</b> before start (too early = city moved, shield lost).':'<b>Zona terlarang</b>: TP masuk hanya <b>&lt;1 jam</b> sebelum mulai (kepagian = kota dipindah, shield hilang).'}</li>
       <li>${L?'Stage OUTSIDE the ring, then rush in at start.':'Staging di LUAR ring, lalu serbu saat mulai.'}</li>
     </ul>
     <div class="lbl" style="margin:12px 0 4px">${P2W?(L?'P2W / Spender role':'Peran P2W / Spender'):(L?'F2P role':'Peran F2P')}</div>
     ${P2W
       ? '<div class="alert ok small">'+(L?'Spearhead: <b>LEAD the attack rally</b> on the Castle (buy the <b>Attack Widget</b> = big rally cap). Refresh with <b>gems</b> for extra attempts, push the <b>leaderboard</b>. Coordinate turret targets with R4/R5.':'Ujung tombak: <b>LEAD rally serang</b> ke Castle (beli <b>Attack Widget</b> = rally cap besar). Refresh <b>gem</b> untuk attempt/serangan ekstra, dorong <b>leaderboard</b>. Koordinasi target turret dengan R4/R5.')+'</div>'
       : '<div class="alert ok small">'+(L?"JOIN rallies (don't lead — rally cap = the CC leader's, needs an expensive Widget). Capturing/holding a <b>turret</b> (attrition + points) is more realistic than the main castle for F2P.":'JOIN rally (jangan lead — rally cap = CC leader, butuh Widget mahal). Rebut/pegang <b>turret</b> (attrition + poin) lebih realistis daripada castle utama untuk F2P.')+'</div>'}`);
  const tacCard=card(L?'F2P Tactics':'Taktik F2P','🎯',
    `<ul class="doul">
       <li>${L?'<b>Hit TURRETS, not the castle</b> — each enemy turret = 2% casualties/cycle to their garrison (4 turrets = 8%, un-healable while held).':'<b>Serang TURRET, bukan castle</b> — tiap turret musuh = 2% korban/siklus ke garrison mereka (4 turret = 8%, tak bisa di-heal saat dipegang).'}</li>
       <li>${L?'<b>Retake</b> an enemy turret = resets its attack-speed buildup (the longer held, the more it hurts) + gives the garrison time to heal.':'<b>Rebut ulang</b> turret musuh = reset attack-speed-nya (makin lama dipegang makin sakit) + beri garrison waktu heal.'}</li>
       <li>${L?'Heal with the <b>~30-min slider + spam Help</b>, NOT speedups (unless hospital overflow).':'Heal pakai <b>slider ~30 mnt + spam Help</b>, BUKAN speedup (kecuali hospital overflow).'}</li>
       <li>${L?'Clear your <b>hospital & infirmary</b> before battle (capacity for the wounded).':'Kosongkan <b>hospital & infirmary</b> sebelum battle (kapasitas untuk luka).'}</li>
       <li>${L?'Win → the alliance appoints the <b>King</b> = kingdom buff + rewards for all. Even a loss gives <b>Charm materials</b> — always join.':'Menang → aliansi tunjuk <b>King</b> = buff kingdom + reward semua anggota. Kalah pun dapat <b>Charm material</b> — tetap ikut.'}</li>
     </ul>`);
  el.innerHTML=pageHead('Castle Battle',L?"King's Castle — capture & hold. Position simulator, scoring, F2P tactics (community research).":"King's Castle — rebut & tahan. Simulasi posisi, skor, taktik F2P (riset komunitas).")+cdCard+mapCard+winCard+heroCard+posCard+tacCard;
  wireCastle(el);
}
/* ===== Tab Dukung — Saran/Request + Donasi ===== */
function renderDukung(){
  const el=$('[data-tab=dukung]'); if(!el) return;
  el.innerHTML=pageHead('Saran & Donasi','Punya ide atau permintaan fitur? Kirim di sini — semoga membantu.')
    +card('Pembuat','👑',
      `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
         <div class="crest" style="width:46px;height:46px;flex:0 0 auto;font-size:22px">👑</div>
         <div><div style="font-weight:800;font-size:16px">INDONenen13</div><div class="muted small">2 server</div></div>
       </div>
       <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
         <span class="badge acc" style="min-width:50px;text-align:center">#2114</span>
         <code class="num" style="background:var(--bg-2);border:1px solid var(--bd);border-radius:8px;padding:6px 12px;font-size:15px">330300846</code>
         <button class="btn sec sm" data-cid="330300846">📋 Salin</button>
       </div>
       <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
         <span class="badge acc" style="min-width:50px;text-align:center">#2184</span>
         <code class="num" style="background:var(--bg-2);border:1px solid var(--bd);border-radius:8px;padding:6px 12px;font-size:15px">343522603</code>
         <button class="btn sec sm" data-cid="343522603">📋 Salin</button>
       </div>
       <div class="dim small" style="margin-top:8px">Semoga membantu perjalanan F2P-mu. 🙏</div>`)
    +card('Saran / Request Fitur','💬',
      `<p class="muted small">Tulis ide, bug, atau fitur yang kamu mau. Terkirim langsung dari sini.</p>
       <textarea id="fb_text" rows="5" placeholder="Contoh: tambah kalkulator gear, atau event X belum ada…"></textarea>
       <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
         <button class="btn" id="fb_send">📨 Kirim</button>
         <button class="btn sec sm" id="fb_copy">📋 Salin</button>
       </div>
       <div id="fb_status"></div>`)
    +card('Dukung / Donasi','❤',
      `<p class="muted small">Gratis & F2P-friendly. Donasi sepenuhnya opsional — kalau merasa terbantu, boleh dukung biaya server. Semoga membantu! 🙏</p>
       <div class="row" style="gap:10px;flex-wrap:wrap">
         <a class="btn" href="https://saweria.co/indonenen13" target="_blank" rel="noopener">🇮🇩 Saweria</a>
         <a class="btn sec" href="https://ko-fi.com/indonenen13" target="_blank" rel="noopener">🌍 Ko-fi</a>
       </div>
       <div class="alert inf small" style="margin-top:12px">💳 <b>PayPal</b> — kirim via <b>Send Money</b> (Friends & Family) ke email berikut:
         <div class="row" style="margin-top:8px;gap:8px;align-items:center;flex-wrap:wrap">
           <code id="pp_mail" class="num" style="background:var(--bg-2);border:1px solid var(--bd);border-radius:8px;padding:6px 10px">memuat…</code>
           <button class="btn sec sm" id="pp_copy">📋 Salin email</button>
           <a class="btn ghost sm" href="https://www.paypal.com/myaccount/transfer/send" target="_blank" rel="noopener">Buka PayPal</a>
         </div>
         <span class="dim small">Tombol Donate PayPal tak tersedia utk akun Indonesia — jadi pakai Send Money manual.</span>
       </div>`);
  const t=$('#fb_text',el);
  const mailAddr=function(){ return 'faturochman13'+String.fromCharCode(64)+'gmail.com'; }; /* dirakit runtime */
  const en=()=>(window.__getLang&&window.__getLang()==='en');
  const st=()=>$('#fb_status',el);
  /* Kirim langsung via FormSubmit.co (AJAX, tanpa buka email). Aktivasi 1× di inbox pemilik. */
  const send=$('#fb_send',el); if(send) send.onclick=async()=>{
    const v=(t&&t.value||'').trim(); if(!v){ if(t) t.focus(); return; }
    const s=st(); if(s) s.innerHTML='<div class="alert inf small">'+(en()?'⏳ Sending…':'⏳ Mengirim…')+'</div>';
    send.disabled=true;
    try{
      const p=store.get('profile',{});
      const r=await fetch('https://formsubmit.co/ajax/905432b354085e82520786f06171434c',{ /* FormSubmit token (form aktif) — email pemilik tak tampil di bundle */
        method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({ message:v, _subject:'Saran Kingshot App', _captcha:'false', _template:'table',
          dari:(p.nick||'?')+' · ID '+(p.pid||'-')+' · Kingdom '+(p.kingdom||'-'), bahasa:(window.__getLang&&window.__getLang())||'id' }) });
      const j=await r.json().catch(()=>({}));
      if(j&&(j.success==='true'||j.success===true)){
        if(s) s.innerHTML='<div class="alert ok small">'+(en()?'✅ Sent! Thanks for the feedback.':'✅ Terkirim! Terima kasih atas masukannya.')+'</div>'; if(t) t.value='';
      } else if(j&&/activ/i.test(j.message||'')){
        if(s) s.innerHTML='<div class="alert warn small">'+(en()?'Form is being activated by the owner — please try again shortly, or use Copy below.':'Form sedang diaktifkan pemilik — coba lagi sebentar, atau pakai Salin di bawah.')+'</div>';
      } else { throw new Error('fail'); }
    }catch(e){
      if(s) s.innerHTML='<div class="alert bad small">'+(en()?'Failed to send (network). Copy the text and send manually.':'Gagal kirim (jaringan). Salin teks lalu kirim manual.')+'</div>';
    }
    send.disabled=false;
  };
  const copy=$('#fb_copy',el); if(copy) copy.onclick=async()=>{
    const v=(t&&t.value||'').trim(); if(!v) return; const s=st();
    try{ await navigator.clipboard.writeText(v); if(s) s.innerHTML='<div class="alert ok small">'+(en()?'📋 Copied.':'📋 Tersalin.')+'</div>'; }
    catch(e){ if(t){ t.select(); try{ document.execCommand('copy'); }catch(e2){} } }
  };
  /* PayPal email — inject runtime + copy */
  const ppm=$('#pp_mail',el); if(ppm) ppm.textContent=mailAddr();
  const ppc=$('#pp_copy',el); if(ppc) ppc.onclick=async()=>{
    try{ await navigator.clipboard.writeText(mailAddr()); ppc.textContent=en()?'✅ Copied':'✅ Tersalin'; setTimeout(()=>{ ppc.textContent=en()?'📋 Copy email':'📋 Salin email'; },1500); }catch(e){}
  };
  $$('[data-cid]',el).forEach(b=>{ b.onclick=async()=>{
    try{ await navigator.clipboard.writeText(b.dataset.cid); const o=b.textContent; b.textContent=en()?'✅ Copied':'✅ Tersalin'; setTimeout(()=>{ b.textContent=o; },1500); }catch(e){}
  }; });
  if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate();
}
function renderBangun(){
  const el=$('[data-tab=bangun]');
  const done=store.get('buildDone',{});
  const cUrut=card('Urutan Upgrade F2P','▣',
      `<div class="alert warn small">Sebelum upgrade: aktifkan Double Time Decree + skill pet Gray Wolf, dan tahan upgrade besar untuk hari City Construction (KvK D1/D5, SG D1).</div><div id="up_list"></div>`,null,true)
    +card('City Decrees (Court of Justice — TC6)','⚖',
      `<p class="muted small">Decree dibeli pakai poin Contentment (dari Resident bekerja). Double Time WAJIB tiap upgrade besar.</p>
       <div class="scrollx"><table><thead><tr><th>Decree</th><th>Efek</th><th>Catatan</th></tr></thead><tbody>${DECREES.map(([n,e,c])=>`<tr><td><b>${esc(n)}</b></td><td class="small">${esc(e)}</td><td class="small muted">${esc(c)}</td></tr>`).join('')}</tbody></table></div>
       <div class="alert ok small">⏱️ Double Time: aktifkan SEBELUM mulai upgrade (window 5 mnt). Dihitung dari base time DULU, baru buff lain (VIP/research/Chief Minister) menumpuk — bukan stack flat. Stack dgn pet Gray Wolf + Chief Minister. Lewat TC25: tunggu cooldown daripada mulai tanpa Double Time.</div>`)
    +card('Prasyarat Town Center','○',
      `<div class="scrollx"><table><thead><tr><th>Target</th><th>Butuh</th></tr></thead><tbody>${TC_PREREQ.map(([a,b])=>`<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div><p class="muted small">Angka bisa beda tipis per versi — cek layar upgrade di game.</p>`);
  const cRiset=card('Urutan Research (Academy)','▤',RESEARCH_ORDER.map(([t,d])=>`<div class="check note"><div><div class="t">${esc(t)}</div><div class="d">${esc(d)}</div></div></div>`).join(''))
    +card('VIP — Target F2P','◉',
      `<div class="scrollx"><table><thead><tr><th>VIP</th><th>Manfaat</th><th>Catatan</th></tr></thead><tbody>${VIP_LEVELS.map(([v,b,n])=>`<tr><td><b>${esc(v)}</b></td><td class="small">${esc(b)}</td><td class="small muted">${esc(n)}</td></tr>`).join('')}</tbody></table></div><div class="muted small">XP gratis ~200-500/hari. Ambang VIP9 beda antar sumber.</div>`);
  const cTroop=card('Troop Tier & Training','⚔',
      `<div class="scrollx"><table><tbody>${TROOP_INFO.tiers.map(([a,b])=>`<tr><td><b>${esc(a)}</b></td><td class="small muted">${esc(b)}</td></tr>`).join('')}</tbody></table></div>${TROOP_INFO.tips.map(t=>`<div class="check note"><div class="d" style="color:var(--fg)">• ${esc(t)}</div></div>`).join('')}`);
  const cGub=card('🏛️ Prioritas Gubernur — item yang dinaikkan','★',
      `<div class="alert ok small"><b>#1 mutlak: Town Center (TC)</b> — rush ke TC30 (buka T10 + Age of Truegold). Semua di-gate level TC; jangan biarkan antrian bangun kosong.</div>
       <p class="muted small">Governor Gear (unlock TC22) & Charm (TC25) = buff <b>SELURUH pasukan</b> (joiner pun kepakai). Urutan tipe selalu <b>Infantry → Archer → Cavalry</b>.</p>
       <div class="lbl" style="margin:12px 0 4px">A. GOVERNOR GEAR — 6 item (beri Attack + Defense)</div>
       <p class="muted small">Material: <b>Satin</b> + <b>Gilded Threads</b>, lalu <b>Artisan's Vision</b> (bottleneck, mulai tier Blue 2★). Naikkan berurutan:</p>
       <div class="scrollx"><table><thead><tr><th>#</th><th>Item</th><th>Untuk</th></tr></thead><tbody>
         <tr><td>1</td><td><b>Cloak</b></td><td class="small">Infantry Atk/Def</td></tr>
         <tr><td>2</td><td><b>Breeches</b></td><td class="small">Infantry Atk/Def</td></tr>
         <tr><td>3</td><td><b>Ring</b></td><td class="small">Archer Atk/Def</td></tr>
         <tr><td>4</td><td><b>Staff</b></td><td class="small">Archer Atk/Def</td></tr>
         <tr><td>5</td><td><b>Hood</b></td><td class="small">Cavalry Atk/Def</td></tr>
         <tr><td>6</td><td><b>Necklace</b></td><td class="small">Cavalry Atk/Def</td></tr>
       </tbody></table></div>
       <div class="alert inf small">Set bonus: <b>3 item tier sama = +Defense</b>, <b>6 item tier sama = +Attack</b> → naikkan ke-6 berbarengan 1 tier. Trik F2P: dorong 3 item dulu (Cloak + Breeches + Ring) ke Purple untuk jaga set bonus saat Artisan's Vision seret.</div>
       <div class="lbl" style="margin:12px 0 4px">B. GOVERNOR CHARM — 3 jenis (beri Lethality + Health, lebih impactful)</div>
       <p class="muted small">Material: <b>Charm Design</b> + <b>Charm Guide</b> (beli di Mystic Trial / Alliance Brawl shop). Pasang charm di tiap item gear dulu, lalu naikkan berurutan:</p>
       <div class="scrollx"><table><thead><tr><th>#</th><th>Charm</th><th>Untuk</th></tr></thead><tbody>
         <tr><td>1</td><td><b>Protection Charm</b></td><td class="small">Infantry Health + Lethality</td></tr>
         <tr><td>2</td><td><b>Vision Charm</b></td><td class="small">Archer Health + Lethality</td></tr>
         <tr><td>3</td><td><b>Keenness Charm</b></td><td class="small">Cavalry Health + Lethality</td></tr>
       </tbody></table></div>
       <div class="alert ok small">⭐ Trik hemat: lompat <b>Level 3 → 5</b> per charm (= +9% stat). Biaya 1 charm L3→L5 = <b>300 Charm Design + 180 Charm Guide</b> (lebih hemat 60 Guide drpd sebar 3 charm L3→L4). Urut: Protection → Vision → Keenness, ulang.</div>
       <div class="alert warn small">⚠ Ini <b>GOVERNOR</b> Gear/Charm (Satin/Gilded/Artisan + Charm Design) — BEDA dari <b>HERO</b> Gear (Forgehammer/Mithril, cuma saat hero-mu MEMIMPIN — termasuk Mystic Trial/Arena, bukan saat join rally). Nama item dari wiki — cek nama persis di layar Avatar → Governor → Gear.</div>`)
    +card('Item/Gear Hero — siapa dulu & sampai Lv berapa','◈',
      `<div class="alert ok small"><b>Unlock TC15.</b> Gear hero aktif saat hero-mu <b>MEMIMPIN</b> march — rally leader, garrison, DAN expedition solo (<b>Mystic Trial & Arena</b> — ROI terbesar F2P justru di sini). <b>SIA-SIA hanya saat JOIN rally orang lain</b> (cuma gear si leader yang dihitung). Fokus 3 hero leader (1 Inf + 1 Cav + 1 Archer); untuk stage dalam Mystic Trial, taruh gear SISA (jangan Forgehammer) di hero ke-4/5.</div>
       <div class="scrollx"><table><thead><tr><th>#</th><th>Hero</th><th>2 Piece</th><th>Target</th></tr></thead><tbody>
       ${HERO_GEAR.map((g,i)=>`<tr><td><b>${i+1}</b></td><td><b>${esc(g[0])}</b><div class="dim small">${esc(g[1])}</div></td><td class="small">${esc(g[2])}</td><td class="small"><b>${esc(g[3])}</b></td></tr>`).join('')}
       </tbody></table></div>
       <div class="small muted" style="margin-top:6px">• <b>2-piece:</b> pasang HANYA 2 piece sesuai fokus hero. DPS/leader → Helmet+Boots (Lethality). Tank/garrison → Gloves+Chest (Health). <i>(Slot gear hero cuma 4: Helmet/Chest/Gloves/Boots — tak ada "Belt".)</i><br>• <b>Transfer per TIPE:</b> gear bisa dipindah antar-hero, tapi dalam tipe yang sama. 1 set Infantry → hero infantry terbaikmu (Howard→Zoe); 1 set Cavalry → Jabel→Petra; 1 set Archer → Marlin. Gear Cavalry TIDAK nyambung ke hero Infantry.<br>• <b>Target Lv20</b> = breakpoint <b>Mastery Forging</b> (pakai Forgehammer).<br>• Exclusive Gear/Widget = Mythic saja — prioritas paling AKHIR (mahal).</div>
       <div class="alert bad small">⛔ JANGAN gear hero JOINER (Chenko/Amane/Yeonwoo/Gordon/Howard/Quinn) — tak terhitung saat join. Jangan gear hero Gen 1 yang bakal diganti.</div>`)
    +card('Gear & Charm Governor (TC25+)','◈',
      `${GEAR_INFO.map(([t,d])=>`<details><summary>${esc(t)}</summary><div class="dt"><div class="small muted">${esc(d)}</div></div></details>`).join('')}
       <details><summary>Governor Charms</summary><div class="dt"><div class="small muted">${CHARM_INFO.map(c=>'• '+esc(c)).join('<br>')}</div></div></details>
       <div class="alert warn small">Governor Gear TIDAK pakai Forgehammer/Mithril (itu Hero Gear). Jangan gear hero joiner.</div>`);
  el.innerHTML=pageHead('Bangun & Progres','Urutan upgrade F2P (rush TC30), research, VIP, troop, gear & prioritas gubernur.')
    +`<div class="seg" id="bg_sub" style="flex-wrap:wrap;margin:4px 0 10px">
        <button data-s="urut">▣ Urutan</button><button data-s="riset">▤ Riset/VIP</button><button data-s="troop">⚔ Troop</button><button data-s="gear">◈ Gear & Gubernur</button><button data-s="track">✓ Tracker</button>
      </div><div id="bg_subc"></div>`;
  const BG_SUBS={ urut:cUrut, riset:cRiset, troop:cTroop, gear:cGub, track:buildTrackerCard() };
  const wireUp=()=>{ const list=$('#up_list',el); if(!list) return;
    BUILD_ORDER.forEach((b,idx)=>{ const id='bo'+idx,isDone=!!done[id];
      const div=document.createElement('label'); div.className='check'+(isDone?' done':'');
      div.innerHTML=`<input type="checkbox" ${isDone?'checked':''}><div><div class="t" style="${b.warn?'color:var(--loss)':''}">${esc(b.t)}</div><div class="d">${esc(b.d)}</div></div>`;
      div.querySelector('input').onchange=e=>{ done[id]=e.target.checked; store.set('buildDone',done); div.classList.toggle('done',e.target.checked); };
      list.appendChild(div); }); };
  const showSub=k=>{ if(!BG_SUBS[k]) k='urut'; const c=$('#bg_subc',el); if(!c) return;
    c.innerHTML=BG_SUBS[k];
    $$('#bg_sub button',el).forEach(b=>b.classList.toggle('active',b.dataset.s===k));
    store.set('bgSub',k);
    if(k==='urut') wireUp();
    if(k==='track') wireTracker(el);
    if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate(); };
  $$('#bg_sub button',el).forEach(b=>b.onclick=()=>showSub(b.dataset.s));
  showSub(store.get('bgSub','urut'));
}
/* ============ PETS ============ */
function renderPets(){
  const el=$('[data-tab=pets]');
  const pc={S:'s',A:'a',B:'b',C:'c'};
  el.innerHTML=pageHead('Pets / Beast','Beast Cage buka TC18 (~hari 55). Skill aktif unlock Pet Lv10, +1 tiap 10 level.')
    +card('Daftar Pet & Prioritas F2P','\u2b22',
      `<div class="alert ok small">\u2605 <b>Lion = prioritas F2P #1</b> (hasilkan Truegold/Forgehammer harian). Wajib Moose Lv15 dulu untuk menangkapnya.</div>
       <div class="scrollx"><table><thead><tr><th>Pet</th><th>Skill & F2P</th></tr></thead><tbody>
       ${PETS.map(p=>`<tr><td><b>${esc(p.n)}</b> <span class="pill ${pc[p.pri]}">${esc(p.pri)}</span><div class="dim small">${esc(p.role)}</div><div class="num dim small" style="white-space:nowrap">W${p.w} · ${esc(p.day)}</div></td><td class="small">${esc(p.skill)}<div class="muted small" style="margin-top:3px">${esc(p.f2p)}</div></td></tr>`).join('')}</tbody></table></div>`,null,true)
    +card('Taming Marks (refine)','\u25c6',
      `<div class="small muted">Common\u2192Rare pakai <b>Common Mark</b>. SIMPAN <b>Advanced Mark</b> untuk tier tinggi. Refine sesuai <b>troop utamamu</b> (umumnya <b>Infantry Health</b> & <b>Archer Lethality</b>). Common-tier Mighty Bison > Mythic Gray Wolf.</div>
       <div class="small muted" style="margin-top:6px">\ud83d\udcca Tier refine di-gate level pet (6 tingkat): Lv10=Common \u00b7 Lv20=Uncommon \u00b7 Lv30=Rare \u00b7 Lv40=Epic \u00b7 Lv50=Mythic/Legendary. Naikkan level pet dulu sebelum bisa refine ke tier lebih tinggi. Terima reroll hanya kalau <b>net power naik</b>.</div>
       <div class="alert inf small">Event Pet Training (KvK D3 / Brawl D3): 1 Advanced Taming Mark = <b>15.000 poin</b>.</div>`);
}

/* ============ ISLAND (Oasis) ============ */
function renderIsland(){
  const el=$('[data-tab=island]');
  el.innerHTML=pageHead('My Island (Oasis)','Panen peti & Essence — peta referensi + 5 aturan yang berlaku untuk layout apa pun.')
    +card('🗺️ Peta referensi komunitas (grid 60×60)','🏝',
      `<div class="small muted" style="margin-bottom:8px">🟥 merah = peti · ⬜ putih = jalur ter-clear · angka = koordinat. Cocokkan 2-3 titik merah dekat tepi dengan pulaumu — kalau meleset, abaikan koordinat dan pakai 5 aturan saja.</div>
       <div class="scrollx" style="border-radius:8px;max-height:70vh;overflow:auto"><img id="isl_ref" src="${(document.getElementById('islandmap')||{}).src||''}" alt="island map" style="width:100%;border-radius:8px;border:1px solid var(--bd-strong);cursor:zoom-in"></div>
       <div class="small muted" style="margin-top:4px">🔍 Ketuk gambar untuk zoom (100% → 180% → 260%), geser untuk melihat detail.</div>
       <div class="alert inf small" style="margin-top:8px">Peta optimal route komunitas = panduan arah saja, tidak 100% akurat tiap akun. Pakai 5 aturan ini untuk layout apa pun.</div>`,null,true)
    +card('🖊️ Peta Pulauku — tandai peti pulaumu','✏️',
      `<p class="muted small">Dasar peta = template komunitas: <b>abu-abu</b> = kaktus belum dibuka · <b>putih</b> = jalur ter-buka · <b>merah</b> = peti (hanya peti yang berlabel koordinat). Samakan dengan pulaumu pakai mode 🌵/⬜, lalu tandai ✅ tiap sel yang sudah kamu buka. Tersimpan otomatis & ikut Export backup.</p>
       <div class="seg" id="isl_mode">
         <button data-m="1" class="active">🟥 Peti</button><button data-m="2">✅ Diambil</button><button data-m="4">🌵 Kaktus</button><button data-m="5">⬜ Jalan</button><button data-m="0">⌫ Hapus</button>
       </div>
       <div class="row" style="justify-content:center;align-items:center;margin:6px 0">
         <button class="btn sec sm" id="isl_zo">➖ Zoom out</button><button class="btn sec sm" id="isl_zi">➕ Zoom in</button>
         <span class="small muted">cubit 2 jari / Ctrl+scroll = zoom</span>
       </div>
       <div class="row" style="align-items:center;margin:2px 0">
         <input type="file" id="isl_file" accept="image/*" style="display:none">
         <button class="btn ghost sm" id="isl_imgbtn">📷 Jiplak screenshot</button>
         <button class="btn sec sm" id="isl_imgfit" style="display:none">🖼 Atur gambar: ON</button>
         <input type="range" id="isl_alpha" min="10" max="90" value="45" style="display:none;width:90px" title="transparansi">
         <button class="btn ghost sm" id="isl_imgdel" style="display:none;color:var(--loss)">✖</button>
       </div>
       <div class="small muted" id="isl_imghint" style="display:none">Mode Atur gambar ON: geser = pindahkan gambar, cubit/scroll = besar-kecil. Pas-kan 2-3 patokan pulaumu ke grid, matikan (OFF), lalu jiplak pakai mode 🌵/⬜/✅. Gambar hanya alat bantu — tidak ikut tersimpan.</div>
       <div class="row" style="margin:2px 0 8px">
         <button class="btn ghost sm" id="isl_seed">🧩 Muat titik peti komunitas</button>
         <span class="small muted" id="isl_stats"></span>
         <button class="btn ghost sm" id="isl_clear" style="margin-left:auto;color:var(--loss);border-color:rgba(255,70,85,.4)">reset peta</button>
       </div>
       <div class="scrollx" style="max-height:62vh;overflow:auto;border:1px solid var(--bd);border-radius:8px;background:#06080C"><canvas id="isl_cv"></canvas></div>`,null,true)
    +card('My Island (Oasis) — panen peti','🏝️',
      `<p class="muted small">Mode terpisah, unlock TC19 (ikon Island di peta). Clear cacti → muncul peti + Essence (buff growth & combat). Semua cacti habis → dapat Purifier. Clearing = progress permanen.</p>
       <div class="lbl" style="margin:10px 0 4px">5 aturan (tak perlu hafal peta)</div>
       ${['Kiri dulu — sisi kiri pulau = peti terpadat.','Taruh Reservoir nempel cluster peti, bukan di tengah kosong.','Cluster beres → pindahkan Reservoir ke cluster peti berikutnya.','Buka layar Oasis saat clearing — worker lebih cepat online daripada offline.','Kerjakan per kuadran; pakai dekorasi untuk blokir & arahkan worker ke peti.'].map((t,i)=>`<div class="check note"><div class="d" style="color:var(--fg)"><span class="num dim">${i+1}</span> &nbsp;${esc(t)}</div></div>`).join('')}
       <div class="lbl" style="margin:12px 0 4px">Mekanik penting</div>
       <div class="kv"><span>Reservoir ke Lv4</span><b>worker ke-2, clear 2× — prioritas #1</b></div>
       <div class="kv"><span>Essence penuh 12 jam</span><b>kumpul minimal 2× sehari</b></div>
       <div class="kv"><span>Fountain of Life</span><b>prioritas jangka panjang</b></div>
       <div class="lbl" style="margin:12px 0 4px">Sumber Essence & peti</div>
       <div class="small muted">Pasif dari Fountain + Reservoir · peti dalam cacti (utama) · quest island · bantu anggota alliance.</div>
       <div class="small muted" style="margin-top:6px">Essence ekstra: beli dekorasi murah dulu untuk selesaikan quest line; recycle item balik 50% cost.</div>
       <div class="alert bad small">Boros: bangun banyak item sama; over-dekorasi awal; layout cantik tapi worker tak bisa capai peti.</div>`);
  islWire(el);
}
/* My-Island interactive grid: marks stored as ks_islandMarks {"x,y":1|2|4|5}
   (1=chest, 2=cleared/collected, 4=cactus override, 5=path override).
   Terrain (cactus vs path) renders from ISLAND_TERRAIN; 4/5 override it per cell.
   Legacy value 3 (reservoir) was dropped — pruned on load. */
function islWire(el){
  const cv=$('#isl_cv',el); if(!cv) return;
  /* coordinates match the community map: origin "1" at BOTTOM-LEFT, x along the bottom, y rises upward */
  const ctx=cv.getContext('2d'); const N=(typeof ISLAND_N!=='undefined')?ISLAND_N:60, L=28,R=30,T=20,B=26;
  /* PER-PROFIL: tiap profil punya island sendiri (store sudah sadar-profil). Profil yang
     belum punya data di-seed template komunitas (titik merah/peti) sebagai DASAR — jadi
     mark merah selalu ada di tiap ID; editmu (collected/cactus/path) tersimpan per-ID. */
  let marks=store.get('islandMarks',null);
  const looksUntouchedOld=marks&&store.get('islandSeedV',1)<3&&Object.keys(marks).length===42&&Object.values(marks).every(v=>v===1);
  if(!marks||Object.keys(marks).length===0||looksUntouchedOld){
    marks={};
    if(typeof ISLAND_SEED!=='undefined') ISLAND_SEED.forEach(p=>{ marks[p[0]+','+p[1]]=1; });
    store.set('islandMarks',marks); store.set('islandSeedV',3);
  }
  /* prune legacy reservoir marks (value 3) — the mode no longer exists */
  { let pruned=false; for(const k in marks){ if(marks[k]===3){ delete marks[k]; pruned=true; } }
    if(pruned) store.set('islandMarks',marks); }
  let zoom=Math.max(8,Math.min(56,parseInt(store.get('islandZoom',16))||16));
  let mode=1;
  /* screenshot-trace overlay: session-only (not persisted — keeps Export backup small) */
  let trImg=null, trAdj=false; const trT={x:0,y:0,s:1,a:.45};
  const FILL={1:'#FF4655',2:'#00E5A0'};
  const TQ=(typeof ISLAND_TERRAIN!=='undefined')?ISLAND_TERRAIN:null;
  /* effective terrain after manual 🌵/⬜ overrides */
  function isPath(x,y){ const m=marks[x+','+y]; if(m===5) return true; if(m===4) return false;
    return TQ?TQ[y].charAt(x)==='1':false; }
  function stats(){ let c=0,d=0; for(const k in marks){ if(marks[k]===1)c++; else if(marks[k]===2)d++; }
    let kk=0; if(TQ) for(let y=0;y<N;y++)for(let x=0;x<N;x++){ if(marks[x+','+y]===2) continue; if(!isPath(x,y)) kk++; }
    const s=$('#isl_stats',el); if(s) s.textContent='🟥 '+c+' · ✅ '+d+' · 🌵 '+kk; }
  /* ISOMETRIC rendering — same diamond orientation as the community map image,
     so the two are directly comparable. Storage stays "x,y" (y from bottom). */
  function geom(){ const cs=zoom; const hw=cs/2, hh=cs/4;
    const CX=34+N*hw, BaseY=14+N*2*hh+8; return {cs,hw,hh,CX,BaseY,W:68+2*N*hw,H:BaseY+22}; }
  function cellPath(g,x,y){ const px=g.CX+(x-y)*g.hw, py=g.BaseY-(x+y)*g.hh;
    ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+g.hw,py-g.hh); ctx.lineTo(px,py-2*g.hh); ctx.lineTo(px-g.hw,py-g.hh); ctx.closePath(); }
  function draw(){
    const g=geom(); cv.width=g.W; cv.height=g.H;
    cv.style.display='block'; cv.style.margin='0 auto'; cv.style.touchAction='none'; cv.style.cursor='crosshair';
    ctx.fillStyle='#06080C'; ctx.fillRect(0,0,cv.width,cv.height);
    /* terrain base layer — community template + manual 🌵/⬜ overrides */
    if(TQ) for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      cellPath(g,x,y); ctx.fillStyle=isPath(x,y)?'#E7EAF0':'#566071'; ctx.fill();
    }
    /* two families of iso grid lines (dark — terrain below is light) */
    for(let i=0;i<=N;i++){
      ctx.strokeStyle=i%10===0?'rgba(255,120,0,.55)':'rgba(0,0,0,.22)'; ctx.lineWidth=1;
      /* lines of constant x=i : from (i,0) to (i,N) */
      ctx.beginPath(); ctx.moveTo(g.CX+i*g.hw, g.BaseY-i*g.hh); ctx.lineTo(g.CX+(i-N)*g.hw, g.BaseY-(i+N)*g.hh); ctx.stroke();
      /* lines of constant y=i : from (0,i) to (N,i) */
      ctx.beginPath(); ctx.moveTo(g.CX-i*g.hw, g.BaseY-i*g.hh); ctx.lineTo(g.CX+(N-i)*g.hw, g.BaseY-(N+i)*g.hh); ctx.stroke();
    }
    /* axis numbers minimal — exactly like the community image: "1" + every 10 on the two LOWER edges only */
    ctx.font='700 11px monospace';
    ctx.fillStyle='#7A86A0'; ctx.textAlign='center'; ctx.fillText('1',g.CX,g.BaseY+14);
    for(let i=10;i<=N;i+=10){
      ctx.fillStyle='#6fb7ff'; ctx.textAlign='left';
      ctx.fillText(String(i),g.CX+i*g.hw+5,g.BaseY-i*g.hh+4);
      ctx.fillStyle='#7ddf8f'; ctx.textAlign='right';
      ctx.fillText(String(i),g.CX-i*g.hw-5,g.BaseY-i*g.hh+4);
    }
    /* chest/cleared marks as diamonds; coordinate label "x,y" (1-based) on CHESTS only */
    const lf=Math.max(7.5,Math.min(14,g.cs*0.55));
    for(const k in marks){ const m=marks[k]; if(!FILL[m]) continue; const a=k.split(','), x=+a[0], y=+a[1];
      if(isNaN(x)||isNaN(y)||x<0||x>=N||y<0||y>=N) continue;
      cellPath(g,x,y); ctx.fillStyle=FILL[m]; ctx.globalAlpha=m===2?.6:.95; ctx.fill(); ctx.globalAlpha=1;
      if(m!==1) continue;
      const px=g.CX+(x-y)*g.hw, py=g.BaseY-(x+y)*g.hh-2*g.hh;
      const label=(x+1)+','+(y+1);
      ctx.font='700 '+lf+'px monospace'; ctx.textAlign='center';
      const tw=ctx.measureText(label).width;
      ctx.fillStyle='rgba(6,8,12,.78)'; ctx.fillRect(px-tw/2-2,py-lf-4,tw+4,lf+3);
      ctx.fillStyle='#ffd2d6';
      ctx.fillText(label,px,py-3);
    }
    /* trace overlay on top, translucent — grid & marks stay visible through it */
    if(trImg){ ctx.globalAlpha=trT.a; ctx.drawImage(trImg,trT.x,trT.y,trImg.width*trT.s,trImg.height*trT.s); ctx.globalAlpha=1; }
    stats();
  }
  /* drag = pan (scrolls the wrapper), clean tap = mark, 2-finger pinch / Ctrl+wheel = zoom.
     Pointer events cover mouse + touch. */
  const wrap=cv.parentElement;
  /* zoom anchored at viewport point (ax,ay) relative to wrap, so the spot under
     your fingers/cursor stays put instead of the map jumping to a corner */
  function setZoom(nz,ax,ay){ nz=Math.max(8,Math.min(56,Math.round(nz)));
    if(nz===zoom) return;
    const g0=geom(); const rw=wrap.getBoundingClientRect();
    if(ax===undefined){ ax=rw.width/2; ay=rw.height/2; }
    const fx=(wrap.scrollLeft+ax)/g0.W, fy=(wrap.scrollTop+ay)/g0.H;
    zoom=nz; store.set('islandZoom',zoom); draw();
    const g1=geom();
    wrap.scrollLeft=fx*g1.W-ax; wrap.scrollTop=fy*g1.H-ay;
  }
  let pd=null, pinch=null; const ptrs=new Map();
  cv.onpointerdown=e=>{ ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptrs.size===2){ const a=[...ptrs.values()];
      pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,z:zoom,s0:trT.s,x0:trT.x,y0:trT.y}; pd=null; }
    else if(ptrs.size===1) pd={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,sl:wrap.scrollLeft,st:wrap.scrollTop,moved:false};
    try{cv.setPointerCapture(e.pointerId);}catch(err){} };
  cv.onpointermove=e=>{ const p=ptrs.get(e.pointerId); if(p){ p.x=e.clientX; p.y=e.clientY; }
    if(pinch&&ptrs.size===2){ const a=[...ptrs.values()];
      const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
      if(trAdj&&trImg){ /* pinch scales the trace image around the pinch midpoint */
        const r=cv.getBoundingClientRect();
        const mx=(a[0].x+a[1].x)/2-r.left, my=(a[0].y+a[1].y)/2-r.top, f=d/pinch.d;
        trT.s=pinch.s0*f; trT.x=mx-(mx-pinch.x0)*f; trT.y=my-(my-pinch.y0)*f; draw(); return; }
      const rw=wrap.getBoundingClientRect();
      setZoom(pinch.z*d/pinch.d,(a[0].x+a[1].x)/2-rw.left,(a[0].y+a[1].y)/2-rw.top); return; }
    if(!pd) return; const dx=e.clientX-pd.x, dy=e.clientY-pd.y;
    if(Math.abs(dx)>5||Math.abs(dy)>5) pd.moved=true;
    if(pd.moved){
      if(trAdj&&trImg){ trT.x+=e.clientX-pd.lx; trT.y+=e.clientY-pd.ly; pd.lx=e.clientX; pd.ly=e.clientY; draw(); }
      else { wrap.scrollLeft=pd.sl-dx; wrap.scrollTop=pd.st-dy; } } };
  cv.onpointerup=e=>{ ptrs.delete(e.pointerId);
    if(pinch){ if(ptrs.size<2) pinch=null; pd=null; return; }
    const wasTap=pd&&!pd.moved; pd=null;
    if(!wasTap||trAdj) return; /* no marking while adjusting the trace image */
    const r=cv.getBoundingClientRect(); const g=geom();
    const px=e.clientX-r.left-g.CX, py=g.BaseY-(e.clientY-r.top);
    const x=Math.floor((px/g.hw+py/g.hh)/2), y=Math.floor((py/g.hh-px/g.hw)/2);
    if(x<0||x>=N||y<0||y>=N) return;
    const k=x+','+y;
    if(mode===0) delete marks[k]; else marks[k]=mode;
    store.set('islandMarks',marks); draw();
  };
  cv.onpointercancel=e=>{ ptrs.delete(e.pointerId); pd=null; if(ptrs.size<2) pinch=null; };
  wrap.addEventListener('wheel',e=>{
    if(trAdj&&trImg){ /* adjust mode: any wheel scales the trace image around the cursor */
      e.preventDefault(); const r=cv.getBoundingClientRect();
      const mx=e.clientX-r.left, my=e.clientY-r.top, f=e.deltaY<0?1.1:1/1.1;
      trT.s*=f; trT.x=mx-(mx-trT.x)*f; trT.y=my-(my-trT.y)*f; draw(); return; }
    if(!e.ctrlKey) return; e.preventDefault();
    const rw=wrap.getBoundingClientRect();
    setZoom(zoom*(e.deltaY<0?1.2:1/1.2),e.clientX-rw.left,e.clientY-rw.top); },{passive:false});
  $$('#isl_mode button',el).forEach(b=>b.onclick=()=>{ mode=+b.dataset.m; $$('#isl_mode button',el).forEach(x=>x.classList.toggle('active',x===b)); });
  $('#isl_zi',el).onclick=()=>setZoom(zoom+6);
  $('#isl_zo',el).onclick=()=>setZoom(zoom-6);
  /* trace-image controls */
  const fi=$('#isl_file',el), ib=$('#isl_imgbtn',el), fitb=$('#isl_imgfit',el),
        al=$('#isl_alpha',el), delb=$('#isl_imgdel',el), hint=$('#isl_imghint',el);
  function trUI(){ const on=!!trImg;
    fitb.style.display=on?'':'none'; delb.style.display=on?'':'none'; al.style.display=on?'':'none';
    hint.style.display=(on&&trAdj)?'':'none';
    fitb.textContent='🖼 Atur gambar: '+(trAdj?'ON':'OFF');
    fitb.style.borderColor=trAdj?'var(--accent)':''; fitb.style.color=trAdj?'var(--accent)':''; }
  if(ib){ ib.onclick=()=>fi.click();
    fi.onchange=()=>{ const f=fi.files&&fi.files[0]; if(!f) return;
      const img=new Image();
      img.onload=()=>{ trImg=img; const g=geom();
        trT.s=(g.W*0.92)/img.width; trT.x=(g.W-img.width*trT.s)/2; trT.y=(g.H-img.height*trT.s)/2;
        trT.a=(parseInt(al.value)||45)/100; trAdj=true; trUI(); draw(); };
      img.src=URL.createObjectURL(f); fi.value=''; };
    fitb.onclick=()=>{ trAdj=!trAdj; trUI(); };
    al.oninput=()=>{ trT.a=(parseInt(al.value)||45)/100; draw(); };
    delb.onclick=()=>{ trImg=null; trAdj=false; trUI(); draw(); };
  }
  $('#isl_clear',el).onclick=()=>{ if(!confirm('Kembalikan Peta Pulauku ke template komunitas ('+((typeof ISLAND_SEED!=='undefined')?ISLAND_SEED.length:0)+' titik)? Semua editanmu dihapus.')) return;
    marks={}; if(typeof ISLAND_SEED!=='undefined') ISLAND_SEED.forEach(p=>{ marks[p[0]+','+p[1]]=1; });
    store.set('islandMarks',marks); store.set('islandSeedV',3); draw(); };
  const sd=$('#isl_seed',el); if(sd&&typeof ISLAND_SEED!=='undefined') sd.onclick=()=>{
    if(!confirm('Muat '+ISLAND_SEED.length+' titik peti dari peta komunitas sebagai template awal? (Perkiraan ±1-2 kotak — sesuaikan dengan pulaumu. Tanda yang sudah ada tidak ditimpa.)')) return;
    let added=0; ISLAND_SEED.forEach(p=>{ const k=p[0]+','+p[1]; if(marks[k]===undefined){ marks[k]=1; added++; } });
    store.set('islandMarks',marks); draw();
  };
  /* community map: clean tap = zoom 100→180→260%, drag = pan */
  const ref=$('#isl_ref',el); if(ref){ const Z=[100,180,260]; let zi=0, rp=null;
    const rw=ref.parentElement; ref.draggable=false; ref.style.touchAction='none';
    ref.onpointerdown=e=>{ rp={x:e.clientX,y:e.clientY,sl:rw.scrollLeft,st:rw.scrollTop,moved:false}; try{ref.setPointerCapture(e.pointerId);}catch(err){} e.preventDefault(); };
    ref.onpointermove=e=>{ if(!rp) return; const dx=e.clientX-rp.x, dy=e.clientY-rp.y;
      if(Math.abs(dx)>5||Math.abs(dy)>5) rp.moved=true;
      if(rp.moved){ rw.scrollLeft=rp.sl-dx; rw.scrollTop=rp.st-dy; } };
    ref.onpointerup=()=>{ const tap=rp&&!rp.moved; rp=null; if(!tap) return;
      zi=(zi+1)%Z.length; ref.style.width=Z[zi]+'%'; ref.style.cursor=zi===Z.length-1?'zoom-out':'zoom-in'; };
    ref.onpointercancel=()=>{ rp=null; };
  }
  draw();
}

/* ============ KODE ============ */
function renderKode(){
  const el=$('[data-tab=kode]');
  const {p}=profileAge();
  el.innerHTML=pageHead('Gift Code','Redeem langsung lewat server resmi game \u2014 hadiah masuk mail in-game.')
    +card('Redeem','\u2726',
      `<label class="fl">Player ID</label><input id="cd_fid" value="${esc(p.pid||'')}" inputmode="numeric">
       <label class="fl">Kode</label><input id="cd_code" placeholder="mis. VIP777" autocapitalize="characters">
       <div class="row" style="margin-top:12px"><button class="btn" id="cd_go">Redeem</button></div><div id="cd_out"></div>`,null,true)
    +card('Kode Aktif (live)','\u25c9',
      `<p class="muted small">Diambil live dari kingshot.net + kingshotwiki.com. Kode baru otomatis di-redeem ke Player ID-mu.</p>
       <div class="row" style="margin-bottom:10px"><button class="btn sec sm" id="cd_refresh">\u21bb Muat ulang</button><button class="btn sm" id="cd_all">\u26a1 Redeem semua (paksa)</button><button class="btn sm" id="cd_allprof">\ud83d\udc65 Redeem ke semua profil</button></div>
       <div id="cd_live"><div class="muted small">\u23f3 Memuat kode aktif\u2026</div></div>
       <div id="cd_auto"></div>
       <div id="cd_allprof_out"></div>
       <p class="muted small" style="margin-top:8px">Kode resmi hanya dari Century Games. "Generator kode" = scam.</p>`);
  $('#cd_go',el).onclick=()=>redeemUI();
  $('#cd_refresh',el).onclick=()=>fetchCodesUI();
  $('#cd_all',el).onclick=()=>redeemAllUI();
  $('#cd_allprof',el).onclick=()=>redeemAllProfilesUI();
  fetchCodesUI(); /* auto-load on open; chains into auto-redeem of new codes */
}
/* Redeem semua kode live ke SEMUA profil tersimpan (loop pid × code). Tidak menyentuh
   codesDone (per-profil) — itu ditangani auto-redeem saat tiap profil aktif. */
async function redeemAllProfilesUI(){
  const out=$('#cd_allprof_out'); const btn=$('#cd_allprof'); if(btn&&btn.disabled) return;
  const profs=store.get('profiles',[]).filter(p=>p&&p.pid);
  if(!profs.length){ out.innerHTML='<div class="alert warn small">Belum ada profil tersimpan (tab Profil).</div>'; return; }
  if(!_liveCodes.length){ await fetchCodesUI(); }
  if(!_liveCodes.length){ out.innerHTML='<div class="alert warn small">Tidak ada kode untuk di-redeem.</div>'; return; }
  if(_codesFallback){ out.innerHTML='<div class="alert warn small">Daftar live gagal dimuat — redeem manual dari tabel.</div>'; return; }
  if(btn) btn.disabled=true;
  out.innerHTML='<div class="alert inf small">⏳ Redeem '+_liveCodes.length+' kode ke '+profs.length+' profil…</div>';
  let html='';
  for(const pr of profs){
    html+=`<div class="lbl" style="margin:10px 0 4px">${esc(pr.nick||'(tanpa nama)')} · ${esc(pr.pid)}</div>`;
    for(const g of _liveCodes){ let r; try{ r=await ksRedeem(pr.pid,g.code); }catch(e){ r={cls:'bad',txt:'gagal'}; }
      html+=`<div class="kv"><span class="mono">${esc(g.code)}</span><b style="color:${r.cls==='ok'?'var(--profit)':r.cls==='warn'?'var(--warn)':'var(--loss)'}">${esc(r.txt)}</b></div>`;
      out.innerHTML=html; await new Promise(s=>setTimeout(s,350)); }
  }
  out.innerHTML=html+'<div class="muted small" style="margin-top:6px">Hadiah masuk mail in-game tiap akun.</div>';
  if(btn) btn.disabled=false;
}
async function redeemUI(){
  const out=$('#cd_out'),fid=($('#cd_fid').value||'').trim(),code=($('#cd_code').value||'').trim();
  const btn=$('#cd_go'); if(btn&&btn.disabled) return; /* guard double-click */
  if(!fid||!code){ out.innerHTML='<div class="alert warn small">Isi Player ID & kode dulu.</div>'; return; }
  if(btn) btn.disabled=true;
  out.innerHTML='<div class="alert inf small">\u23f3 Memproses\u2026</div>';
  try{ const r=await ksRedeem(fid,code); out.innerHTML=`<div class="alert ${r.cls} small">${esc(r.txt)}${r.cls==='ok'?' \u2014 cek mail in-game.':''}</div>`; }
  catch(e){ out.innerHTML='<div class="alert bad small">Gagal terhubung. Redeem di game (avatar\u2192Settings\u2192Gift Code).</div>'; }
  if(btn) btn.disabled=false;
}
let _liveCodes=[],_codesFallback=false;
async function fetchCodesUI(){
  const host=$('#cd_live'); if(!host) return;
  host.innerHTML='<div class="muted small">\u23f3 Memuat kode aktif\u2026</div>';
  const codes=await ksLiveCodes();
  if(!codes){ _liveCodes=GIFT_CODES.map(([c,e])=>({code:c,exp:e})); _codesFallback=true;
    host.innerHTML='<div class="alert warn small">Gagal ambil otomatis (offline/proxy diblokir). Daftar cadangan:</div>'+codeTable(_liveCodes); wireCodes(host); return; }
  _liveCodes=codes; _codesFallback=false;
  host.innerHTML=`<div class="alert ok small">\u2705 <b class="num">${codes.length}</b> kode aktif (live).</div>`+codeTable(codes); wireCodes(host);
  autoRedeemNew();
}
function codeTable(codes){
  const done=store.get('codesDone',{});
  return '<div class="scrollx"><table><thead><tr><th>Kode</th><th>Berlaku</th><th></th></tr></thead><tbody>'+
    (codes.length?codes.map(g=>{ const d=done[g.code.toLowerCase()];
      const st=d&&(d.r==='ok'||d.r==='used')?' <span class="small" style="color:var(--profit)">\u2714</span>':'';
      return `<tr><td><b class="mono">${esc(g.code)}</b>${st}</td><td class="small">s/d ${esc(g.exp)}</td><td><button class="btn ghost sm useco" data-c="${esc(g.code)}">pakai</button></td></tr>`;}).join(''):'<tr><td colspan="3" class="muted small">Tidak ada kode aktif.</td></tr>')+'</tbody></table></div>';
}
/* Auto-redeem: runs after every live fetch. Only hits the API for codes without a
   recorded ok/used result (failed ones retry after 12h) \u2014 so reopening the tab is free. */
async function autoRedeemNew(){
  const host=$('#cd_auto'); if(!host||_codesFallback||!_liveCodes.length) return;
  const {p}=profileAge(); const fid=((p&&p.pid)||'').trim();
  if(!fid){ host.innerHTML='<div class="alert inf small">Hubungkan Player ID (tab Profil) untuk auto-redeem kode baru.</div>'; return; }
  const done=store.get('codesDone',{}); const RETRY=12*3600*1000;
  const todo=_liveCodes.filter(g=>{ const d=done[g.code.toLowerCase()];
    return !d||(d.r!=='ok'&&d.r!=='used'&&Date.now()-d.t>RETRY); });
  if(!todo.length){ host.innerHTML='<div class="muted small">\u2714 Semua kode aktif sudah pernah di-redeem.</div>'; return; }
  host.innerHTML='<div class="alert inf small">\u23f3 Auto-redeem '+todo.length+' kode baru\u2026</div>';
  const res=[];
  for(const g of todo){ let r; try{ r=await ksRedeem(fid,g.code); }catch(e){ r={cls:'bad',txt:'gagal'}; }
    done[g.code.toLowerCase()]={r:r.cls==='ok'?'ok':(r.txt==='Sudah dipakai'?'used':r.cls),t:Date.now()};
    res.push([g.code,r]); }
  store.set('codesDone',done);
  host.innerHTML='<div class="lbl" style="margin:8px 0 4px">Auto-redeem kode baru</div>'
    +res.map(([c,r])=>`<div class="kv"><span class="mono">${esc(c)}</span><b style="color:${r.cls==='ok'?'var(--profit)':r.cls==='warn'?'var(--warn)':'var(--loss)'}">${esc(r.txt)}</b></div>`).join('')
    +'<div class="muted small" style="margin-top:4px">Hadiah masuk mail in-game.</div>';
  const lv=$('#cd_live'); if(lv){ lv.innerHTML=`<div class="alert ok small">\u2705 <b class="num">${_liveCodes.length}</b> kode aktif (live).</div>`+codeTable(_liveCodes); wireCodes(lv); }
}
function wireCodes(host){ $$('.useco',host).forEach(b=>b.onclick=()=>{ $('#cd_code').value=b.dataset.c; window.scrollTo(0,0); $('#cd_code').focus(); }); }
async function redeemAllUI(){
  const out=$('#cd_out'),fid=($('#cd_fid').value||'').trim();
  const btn=$('#cd_all'); if(btn&&btn.disabled) return; /* guard double-click */
  if(!fid){ out.innerHTML='<div class="alert warn small">Isi Player ID dulu.</div>'; return; }
  if(!_liveCodes.length){ await fetchCodesUI(); }
  if(!_liveCodes.length){ out.innerHTML='<div class="alert warn small">Tidak ada kode untuk di-redeem.</div>'; return; }
  if(_codesFallback){ out.innerHTML='<div class="alert warn small">Daftar live gagal dimuat \u2014 daftar cadangan mungkin kedaluwarsa. Redeem manual satu-satu dari tabel.</div>'; return; }
  if(btn) btn.disabled=true;
  out.innerHTML='<div class="alert inf small">\u23f3 Redeem '+_liveCodes.length+' kode\u2026</div>';
  const done=store.get('codesDone',{});
  const res=[];
  for(const g of _liveCodes){ let r; try{ r=await ksRedeem(fid,g.code); }catch(e){ r={cls:'bad',txt:'gagal'}; }
    done[g.code.toLowerCase()]={r:r.cls==='ok'?'ok':(r.txt==='Sudah dipakai'?'used':r.cls),t:Date.now()};
    res.push([g.code,r]); }
  store.set('codesDone',done);
  out.innerHTML='<div class="lbl" style="margin:8px 0 4px">Hasil redeem otomatis</div>'+res.map(([c,r])=>`<div class="kv"><span class="mono">${esc(c)}</span><b style="color:${r.cls==='ok'?'var(--profit)':r.cls==='warn'?'var(--warn)':'var(--loss)'}">${esc(r.txt)}</b></div>`).join('');
  if(btn) btn.disabled=false;
}

/* ============ PROFIL (login / settings) ============ */
function renderProfil(){
  const el=$('[data-tab=profil]');
  const p=store.get('profile',{kingdom:'',pid:'',start:'',tc:''});
  const {age,tc}=profileAge();
  const _profs=store.get('profiles',[]); const _ap=_ksActivePid();
  const _profListHtml=(_profs.map(pr=>{ const isA=pr.pid===_ap;
    return `<div class="kv" style="align-items:center"><span>${isA?'<b style="color:var(--accent)">\u25cf </b>':''}<b>${esc(pr.nick||'(tanpa nama)')}</b> <span class="muted small">#${esc(pr.kingdom||'?')} \u00b7 ${esc(pr.pid)}</span></span>`
      +`<span class="row" style="gap:6px">${isA?'<span class="muted small">aktif</span>':`<button class="btn sec sm" data-sw="${esc(pr.pid)}">Pakai</button>`}`
      +`${_profs.length>1?`<button class="btn ghost sm" data-rm="${esc(pr.pid)}" style="color:var(--loss);border-color:rgba(255,70,85,.45)">Hapus</button>`:''}</span></div>`;
    }).join(''))
    +`<label class="fl" style="margin-top:10px">Tambah Player ID</label><div class="row"><input id="pf_add" inputmode="numeric" placeholder="mis. 12345678" style="flex:1"><button class="btn sec sm" id="pf_addbtn">\uff0b Tambah</button></div><div id="pf_addstatus" class="muted small"></div>`;
  el.innerHTML=pageHead('Profil & Koneksi','Hubungkan Player ID sekali \u2014 app baca Kingdom, TC & tanggal server otomatis dan mengingatnya.')
    +card('Profil Tersimpan (multi-akun)','\ud83d\udc65',_profListHtml)
    +card('Player ID (login)','\u25c9',
      `<label class="fl">Player ID</label><input id="pf_id" value="${esc(p.pid||'')}" inputmode="numeric" placeholder="mis. 12345678">
       <div class="row" style="margin-top:12px"><button class="btn" id="pf_detect">\u26a1 Hubungkan & Deteksi</button>${p.pid?'<button class="btn ghost sm" id="pf_logout" style="color:var(--loss);border-color:rgba(255,70,85,.45)">\u23fb Logout</button>':''}</div>
       <div id="pf_status"></div>`,null,true)
    +card('Data Server','\u2691',
      `<div class="grid2"><div><label class="fl">Kingdom #</label><input id="pf_k" value="${esc(p.kingdom||'')}" readonly tabindex="-1" placeholder="otomatis" style="opacity:.6;cursor:not-allowed"></div><div><label class="fl">Level TC</label><input id="pf_tc" type="number" value="${esc(p.tc||'')}" readonly tabindex="-1" placeholder="otomatis" style="opacity:.6;cursor:not-allowed"></div></div>
       <label class="fl">Tanggal server buka (Hari 0)</label><input id="pf_start" type="date" value="${esc(p.start||'')}"${p.start?' readonly tabindex="-1" style="opacity:.6;cursor:not-allowed"':''}>
       <div class="alert inf small">\ud83d\udd12 Kingdom, TC & tanggal server terisi OTOMATIS dari Player ID \u2014 tekan "Hubungkan & Deteksi" untuk memperbarui.</div>
       ${p.start?'':'<div class="alert warn small">Tanggal server belum terdeteksi. Manual: buka Monument \u2192 misi "Beast Hunting", tanggal selesai \u2212 2 hari = Hari 0.</div>'}
       <label class="fl" style="margin-top:10px">Gaya main (per server ini)</label>
       <div class="seg" id="pf_mode" style="margin:2px 0">
         <button data-m="f2p"${curMode()==='f2p'?' class="active"':''}>\ud83c\udd93 F2P</button>
         <button data-m="p2w"${curMode()==='p2w'?' class="active"':''}>\ud83d\udcb3 P2W / Spender</button>
       </div>
       <div class="muted small">Ubah panduan sesuai server: F2P (hemat, hindari spend) vs P2W (kejar leaderboard, lead rally, belanja terarah). Tersimpan per-profil \u2014 cocok kalau main >1 server.</div>
       <div class="row" style="margin-top:10px"><button class="btn" id="pf_save">Simpan</button></div>`)
    +card('Jam Event Alliance','\u23f0',
      `<p class="muted small">Jam berikut diatur R4/R5 alliance (tanya pengumuman). Isi sekali \u2014 app beri hitung mundur di tab Sekarang. Hari = perkiraan, jam pasti cek tab Events di game.</p>
       <div class="alert inf small">Jam diisi dalam zona <b>${tzInfo().label}</b> (ikut toggle ${tzInfo().label}/... di kanan atas). Ganti toggle = jam ikut dikonversi otomatis.</div>
       ${SETTABLE_EVENTS.map(ev=>{const days=ev.daily?'tiap hari':esc((ev.note||'').split('\u00b7')[0].trim());return `<label class="fl">${ev.gi} ${esc(ev.n)} <span class="dim" style="font-weight:400;text-transform:none;letter-spacing:0">\u2014 ${days} \u00b7 ${tzInfo().label}</span></label><input id="et_${ev.id}" type="time" value="${esc(wibToDisp(evtTimes()[ev.id]||''))}">`;}).join('')}
       <div class="row" style="margin-top:12px"><button class="btn" id="et_save">Simpan jam</button></div>`)
    +((age!=null&&age>=1)?card('Status','\u25c8',
      `<div class="stats">
        <div class="stat acc"><div class="sl">Umur Server</div><div class="sv">${age}<span style="font-size:13px"> hari</span></div></div>
        <div class="stat"><div class="sl">Generasi Hero</div><div class="sv sm">${genForAge(age)}</div></div>
        <div class="stat"><div class="sl">Town Center</div><div class="sv">TC${tc||'?'}</div></div>
        <div class="stat ${truegoldClass(age,tc)}"><div class="sl">Age of Truegold</div><div class="sv sm">${65-age>0?'~'+(65-age)+' hari':'tercapai'}</div></div>
       </div>${truegoldAlert(age,tc)}
       <h3>Milestone berikutnya</h3><div class="scrollx"><table><thead><tr><th>H</th><th>Event</th><th>Tgl</th><th>Sisa</th></tr></thead><tbody>
       ${MILESTONES.filter(m=>m.d>age).sort((a,b)=>a.d-b.d).slice(0,6).map(m=>{const {start}=profileAge();return `<tr><td class="num">~${m.d}</td><td><b>${esc(m.name)}</b><div class="muted small">${esc(m.note||'')}</div></td><td class="small">${addDaysFmt(start,m.d)}</td><td class="num">${m.d-age}h</td></tr>`;}).join('')}</tbody></table></div>`):'')
    +card('Jam Server (lanjutan)','\u25cb',
      `<p class="muted small">App ikut waktu server (UTC) \u2014 reset 07:00 WIB. Sinkron otomatis saat online. Kalau meleset, geser manual (menit):</p>
       <div class="row"><input id="pf_nudge" type="number" step="1" value="${esc(ksClock.nudge)}" style="width:100px"><button class="btn sec sm" id="pf_nudgeset">Terapkan</button><span id="pf_synstat" class="muted small">${ksClock.synced?'\u2713 tersinkron server':'pakai jam perangkat'}</span></div>`)
    +card('Notifikasi otomatis','◉',notifBody())
    +card('Sinkron Otomatis Antar Perangkat','🔁',syncBody())
    +card('Backup & Pindah Perangkat','💾',
      `<p class="muted small">Semua data (profil, checklist, jam alliance, progres) tersimpan di browser INI saja. Ganti HP/browser = data hilang. Export dulu, lalu Import di perangkat baru.</p>
       <div class="row"><button class="btn sec sm" id="bk_export">⬇ Export data</button><button class="btn sec sm" id="bk_import">⬆ Import data</button><input type="file" id="bk_file" accept=".json" style="display:none"></div>
       <div id="bk_status"></div>`);

  /* multi-profil: switch / hapus / tambah */
  $$('[data-sw]',el).forEach(b=>b.onclick=()=>setActiveProfile(b.dataset.sw));
  $$('[data-rm]',el).forEach(b=>b.onclick=()=>{
    if(!confirm('Hapus profil '+b.dataset.rm+' dari daftar? Data tersimpan untuk ID ini tetap ada di perangkat (bisa ditambahkan lagi).')) return;
    let ps=store.get('profiles',[]).filter(p=>p.pid!==b.dataset.rm); store.set('profiles',ps);
    if(_ksActivePid()===b.dataset.rm&&ps[0]) setActiveProfile(ps[0].pid);
    else { renderProfil(); if(typeof updateSideProf==='function') updateSideProf(); }
  });
  const _ab=$('#pf_addbtn',el); if(_ab) _ab.onclick=async()=>{
    const v=($('#pf_add',el).value||'').trim(); const st=$('#pf_addstatus',el);
    if(!v){ st.textContent='Isi Player ID.'; return; }
    if(store.get('profiles',[]).some(p=>p.pid===v)){ st.textContent='ID sudah ada di daftar.'; return; }
    st.textContent='⏳ Cek ke server…'; let meta={pid:v,nick:'',kingdom:'',tc:'',start:''};
    try{ const j=await ksPlayerLookup(v); if(j&&j.code===0&&j.data){ const d=j.data; meta.nick=d.nickname||''; meta.kingdom=String(d.kid||''); meta.tc=String(d.stove_lv||'');
      /* tanggal buka ikut diambil DI SINI — tanpa ini profil baru dipakai tanpa umur
         server, dan tab Sekarang/kalender/HoG kosong sampai user tekan "Deteksi" */
      if(meta.kingdom) meta.start=(await fetchKingdomDate(meta.kingdom))||''; } }catch(e){}
    const ps=store.get('profiles',[]); ps.push(meta); store.set('profiles',ps);
    renderProfil(); if(typeof updateSideProf==='function') updateSideProf();
  };
  $('#pf_detect',el).onclick=()=>autoDetectUI();
  const lo=$('#pf_logout',el); if(lo) lo.onclick=()=>{
    if(!confirm('Logout? Player ID dihapus dari perangkat ini. (Jam event alliance & checklist tetap tersimpan.)')) return;
    const pr=store.get('profile',{});
    store.set('profile',{eventTimes:pr.eventTimes||{},bearTime:pr.bearTime||''}); /* keep alliance times — they're alliance settings, not identity */
    renderProfil(); if(typeof updateSideProf==='function') updateSideProf();
  };
  $$('#pf_mode button',el).forEach(b=>b.onclick=()=>{ const pr=store.get('profile',{}); pr.mode=b.dataset.m; store.set('profile',pr); renderProfil(); if(typeof updateSideProf==='function') updateSideProf(); });
  $('#pf_save',el).onclick=()=>saveProfile();
  const ets=$('#et_save',el); if(ets) ets.onclick=()=>{ const pr=store.get('profile',{}); const et=Object.assign({},pr.eventTimes||{}); SETTABLE_EVENTS.forEach(ev=>{ const inp=$('#et_'+ev.id,el); if(inp) et[ev.id]=dispToWib(inp.value); }); pr.eventTimes=et; pr.bearTime=et.bear||''; store.set('profile',pr); renderProfil(); };
  $('#pf_nudgeset',el).onclick=()=>{ ksClock.setNudge($('#pf_nudge').value); renderTopClock(); renderProfil(); };
  /* backup / restore: every ks_* localStorage key */
  const be=$('#bk_export',el); if(be) be.onclick=()=>{
    const data={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.indexOf('ks_')===0) data[k]=localStorage.getItem(k); }
    const d=ksClock.now().toISOString().slice(0,10);
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));
    a.download='kingshot13-backup-'+d+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    const st=$('#bk_status',el); if(st) st.innerHTML='<div class="alert ok small">✅ File backup diunduh — simpan/kirim ke perangkat baru.</div>';
  };
  const bi=$('#bk_import',el), bf=$('#bk_file',el);
  if(bi&&bf){ bi.onclick=()=>bf.click();
    bf.onchange=()=>{ const f=bf.files&&bf.files[0]; if(!f) return;
      const r=new FileReader();
      r.onload=()=>{ const st=$('#bk_status');
        try{ const data=JSON.parse(r.result); let n=0;
          for(const k in data){ if(k.indexOf('ks_')===0&&typeof data[k]==='string'){ localStorage.setItem(k,data[k]); n++; } }
          if(!n) throw new Error('no ks_ keys');
          if(st) st.innerHTML='<div class="alert ok small">✅ <b>'+n+'</b> data dipulihkan — memuat ulang…</div>';
          setTimeout(()=>location.reload(),700);
        }catch(e){ if(st) st.innerHTML='<div class="alert bad small">File backup tidak valid.</div>'; }
      };
      r.readAsText(f);
    };
  }
  wireNotif(el);
  /* Daftar Pengunjung dipindah ke tab Admin (renderAdmin) — owner only */
  /* sync wiring */
  const sm=$('#sy_make',el); if(sm) sm.onclick=async()=>{ sm.disabled=true; const st=$('#sy_status');
    if(st) st.innerHTML='<div class="alert inf small">⏳ Membuat slot sinkron…</div>';
    const code=await ksSync.enable();
    if(code) renderProfil();
    else { if(st) st.innerHTML='<div class="alert bad small">Gagal terhubung ke layanan sinkron — coba lagi nanti.</div>'; sm.disabled=false; } };
  const sj=$('#sy_join',el); if(sj) sj.onclick=async()=>{ const st=$('#sy_status'); const code=($('#sy_code').value||'').trim();
    if(!code){ $('#sy_code').focus(); return; }
    if(st) st.innerHTML='<div class="alert inf small">⏳ Menghubungkan…</div>';
    const r=await ksSync.connect(code);
    if(r==='applied'){ if(st) st.innerHTML='<div class="alert ok small">✅ Terhubung — data perangkat lain diterapkan. Memuat ulang…</div>'; setTimeout(()=>location.reload(),800); }
    else if(r==='pushed'){ if(st) st.innerHTML='<div class="alert ok small">✅ Terhubung — slot masih kosong, data perangkat INI yang diunggah.</div>'; setTimeout(()=>renderProfil(),1200); }
    else if(st) st.innerHTML='<div class="alert bad small">Gagal menghubungkan (kode salah / jaringan).</div>'; };
  const syn=$('#sy_now',el); if(syn) syn.onclick=async()=>{ const st=$('#sy_status');
    if(st) st.innerHTML='<div class="alert inf small">⏳ Sinkron…</div>';
    const r=await ksSync.pull();
    if(r==='applied'){ if(st) st.innerHTML='<div class="alert ok small">✅ Data lebih baru dari perangkat lain diterapkan — memuat ulang…</div>'; setTimeout(()=>location.reload(),800); return; }
    const ok=await ksSync.push();
    if(st) st.innerHTML=ok?'<div class="alert ok small">✅ Tersinkron (data perangkat ini terunggah).</div>':'<div class="alert bad small">Gagal — cek koneksi, akan dicoba lagi otomatis.</div>'; };
  const so=$('#sy_off',el); if(so) so.onclick=()=>{ if(!confirm('Putuskan sinkron di perangkat INI? Data lokal tetap ada; perangkat lain tidak terpengaruh.')) return; ksSync.disconnect(); renderProfil(); };
  const ss=$('#sy_show',el); if(ss) ss.onclick=()=>{ ss.select(); ss.setSelectionRange(0,99);
    try{ document.execCommand('copy'); const st=$('#sy_status'); if(st) st.innerHTML='<div class="alert ok small">📋 Kode disalin — tempel di perangkat lain.</div>'; }catch(e){} };
}
function syncBody(){
  const m=ksSync.meta();
  if(!m||!m.code) return `
    <p class="muted small">Hubungkan 2+ perangkat dengan satu KODE SINKRON: perubahan otomatis diunggah (±4 dtk), dan diambil tiap app dibuka. Data dititipkan di layanan publik (textdb.online) di balik kode acak rahasia — JANGAN bagikan kode ke orang lain.</p>
    <div class="row" style="margin-bottom:12px"><button class="btn" id="sy_make">⚡ Aktifkan — buat kode baru (perangkat pertama)</button></div>
    <label class="fl">Sudah punya kode dari perangkat lain?</label>
    <div class="row"><input id="sy_code" placeholder="KS2-…" autocapitalize="characters" style="flex:1"><button class="btn sec sm" id="sy_join">Hubungkan</button></div>
    <div id="sy_status"></div>`;
  const last=m.at?new Date(m.at).toLocaleString('id-ID'):'—';
  return `
    <div class="alert ok small">✅ Sinkron AKTIF · terakhir: ${esc(last)}${m.err?' · <b style="color:var(--warn)">gangguan jaringan — dicoba lagi otomatis</b>':''}</div>
    <label class="fl">Kode sinkron (ketuk untuk salin, masukkan di perangkat lain)</label>
    <input id="sy_show" readonly value="${esc(m.code)}" style="font-family:var(--font-mono);letter-spacing:.04em">
    <div class="row" style="margin-top:10px">
      <button class="btn sec sm" id="sy_now">↻ Sinkron sekarang</button>
      <button class="btn ghost sm" id="sy_off" style="margin-left:auto;color:var(--loss);border-color:rgba(255,70,85,.4)">Putuskan</button>
    </div>
    <p class="muted small" style="margin-top:8px">Ambil-data saat app dibuka + tiap 5 menit · unggah otomatis setelah perubahan. Export manual tetap ada sebagai cadangan.</p>
    <div id="sy_status"></div>`;
}
function truegoldClass(age,tc){ const d=65-age; if(tc>=30)return 'ok'; if(d<=0)return 'crit'; if(d<15)return 'warn'; return ''; }
function truegoldAlert(age,tc){
  const d=65-age;
  if(tc>=30) return '<div class="alert ok small">\u2705 TC30 tercapai \u2014 siap Truegold & KvK.</div>';
  if(d<=0&&tc<30) return `<div class="alert bad small">\u26a0 Age of Truegold lewat tapi TC masih ${tc||'?'}. Kebut TC ke 30.</div>`;
  if(d>0&&tc>0){ const per=d/(30-tc); return `<div class="alert ${per<3?'bad':per<6?'warn':'ok'} small">Menuju Age of Truegold (butuh TC30) sisa <b>${d} hari</b>. Kamu TC${tc} \u2192 ~${per.toFixed(1)} hari/level. ${per<3?'Ketat! Jangan biarkan antrian kosong.':per<6?'Jaga ritme upgrade.':'On-track.'}</div>`; }
  return '';
}
/* Selaraskan koneksi Player ID dgn multi-profil: perbarui entri ks_profiles
   (nama/kingdom/TC/server), jadikan ID itu profil AKTIF (slot = ID yg dipakai),
   lalu simpan objek profile di bawah slot itu. */
function connectProfileTo(fid,d,openDate){
  try{
    let profs=store.get('profiles',[]); let e=profs.find(p=>p.pid===fid);
    const meta={pid:fid,nick:(d&&d.nickname)||(e&&e.nick)||'',kingdom:String((d&&d.kid)||(e&&e.kingdom)||''),tc:String((d&&d.stove_lv)||(e&&e.tc)||''),start:openDate||(e&&e.start)||''};
    if(e) Object.assign(e,meta); else profs.push(meta);
    store.set('profiles',profs);
    localStorage.setItem('ks_activePid',JSON.stringify(fid));
  }catch(err){}
  const oldP=store.get('profile',{});
  store.set('profile',Object.assign({},oldP,{pid:fid,nick:(d&&d.nickname)||oldP.nick||'',kingdom:String((d&&d.kid)||oldP.kingdom||''),tc:String((d&&d.stove_lv)||oldP.tc||''),start:openDate||oldP.start||''}));
}
/* Auto-deteksi nama/Kingdom/TC untuk profil yg belum ber-nama (saat load, non-blok). */
async function autoDetectProfiles(){
  /* Refresh nick/Kingdom/TC dari server game. TC & Kingdom BISA berubah seiring waktu
     (TC naik) → JANGAN skip profil yang sudah punya nama; refresh tiap buka app. */
  const profs=store.get('profiles',[]); let changed=false;
  const apid=(typeof _ksActivePid==='function')?_ksActivePid():'';
  const moved=new Set();   /* pid yang PINDAH kingdom → tanggal buka lama tak berlaku lagi */
  for(const p of profs){ if(!p.pid) continue;
    try{ const j=await ksPlayerLookup(p.pid);
      if(j&&j.code===0&&j.data){
        if(!p.nick && j.data.nickname) p.nick=j.data.nickname;      /* nama: isi kalau kosong (jangan timpa kustom) */
        const nk=String(j.data.kid||'');                             /* Kingdom & TC: selalu segarkan (otoritatif) */
        if(nk){
          /* Kingdom beda = SERVER LAIN = tanggal buka lain. Selalu rekonsiliasi tanggal
             buka: seed/cache = instan (nyaris tanpa network), jadi murah tiap load.
             Tanggal PASTI dari API bersifat OTORITATIF → menang atas start tersimpan
             (perkiraan lama / tanggal UTC salah / manual keliru) supaya umur & HoG akurat.
             Perkiraan (offline) hanya mengisi start yg masih kosong; ditandai startEst
             agar di-refresh lagi lain kali sampai dapat tanggal pasti. */
          const kchanged=(nk!==String(p.kingdom||''));
          if(kchanged) moved.add(p.pid);
          const nd=await fetchKingdomDate(nk);
          if(nd){ if(!window._kdateEst){ if(p.start!==nd){ p.start=nd; changed=true; } if(p.startEst){ delete p.startEst; changed=true; } }
            else if(kchanged||!p.start){ p.start=nd; p.startEst=true; changed=true; } }   /* pindah / kosong: terima perkiraan (jangan simpan tanggal server LAMA); sama-kingdom: perkiraan tak menimpa tanggal yg sudah ada */
          else if(kchanged){ if(p.start){ p.start=''; changed=true; } if(p.startEst){ delete p.startEst; changed=true; } }   /* pindah tapi tak diketahui → kosongkan */
          p.kingdom=nk;
        }
        const nt=String(j.data.stove_lv||''); if(nt) p.tc=nt;
        changed=true; } }catch(e){} }
  if(changed){ store.set('profiles',profs);
    /* sinkronkan ke profil AKTIF (sumber tampilan profileAge) — kalau tidak, TC di layar tetap basi */
    const act=profs.find(p=>p.pid===apid);
    if(act){ const cur=store.get('profile',{});
      /* pindah kingdom → meta yang menang (walau kosong; umur tak diketahui lebih baik
         daripada umur salah). Selain itu tanggal di slot dipertahankan. */
      const st=moved.has(act.pid)?(act.start||''):(act.start||cur.start||'');
      store.set('profile',Object.assign({},cur,{nick:cur.nick||act.nick||'',kingdom:act.kingdom||cur.kingdom||'',tc:act.tc||cur.tc||'',start:st})); }
    if(typeof updateSideProf==='function') updateSideProf();
    const lt=store.get('lastTab','sekarang'), fn=window['render'+lt.charAt(0).toUpperCase()+lt.slice(1)];
    if((lt==='profil'||lt==='sekarang')&&typeof fn==='function') fn(); }
}
function saveProfile(){
  const old=store.get('profile',{});
  const v=(id,prop)=>{ const e=$(id); return e?(e.value||'').trim():(old[prop]||''); };
  const np=Object.assign({},old,{kingdom:v('#pf_k','kingdom'),pid:v('#pf_id','pid'),start:v('#pf_start','start'),tc:v('#pf_tc','tc')});
  store.set('profile',np);
  /* cerminkan ke daftar meta — kalau tidak, tanggal yang diisi manual di sini tak
     dikenal oleh seedProfileFromMeta/autoDetectProfiles dan bisa tertimpa balik */
  try{ const profs=store.get('profiles',[]); const e=profs.find(x=>x&&String(x.pid)===String(np.pid));
    if(e){ e.kingdom=np.kingdom||e.kingdom; e.tc=np.tc||e.tc; if(np.start) e.start=np.start; store.set('profiles',profs); } }catch(err){}
  renderProfil();
}
async function autoDetectUI(){
  const st=$('#pf_status'),fid=($('#pf_id').value||'').trim();
  if(!fid){ st.innerHTML='<div class="alert warn small">Isi Player ID dulu.</div>'; return; }
  st.innerHTML='<div class="alert inf small">\u23f3 Menghubungi server game\u2026</div>';
  try{
    const j=await ksPlayerLookup(fid);
    if(j.code!==0||!j.data){ st.innerHTML='<div class="alert bad small">Player ID tidak ditemukan ('+esc(j.msg||'error')+').</div>'; return; }
    const d=j.data;
    let dateMsg='';
    const openDate=await fetchKingdomDate(d.kid);
    if(openDate) dateMsg=' \u00b7 server buka '+esc(openDate)+(window._kdateEst?' <span style="color:var(--warn)">(perkiraan \u00b12-3 hari \u2014 offline)</span>':'');
    else dateMsg=' \u00b7 <span style="color:var(--warn)">tanggal buka tak ketemu, isi manual</span>';
    /* save via multi-profil helper (sejajarkan slot aktif = ID ini + isi nama) */
    connectProfileTo(fid,d,openDate);
    renderProfil(); renderTopClock();
    const st2=$('#pf_status'); if(st2) st2.innerHTML='<div class="alert ok small">\u2705 <b>'+esc(d.nickname)+'</b> \u00b7 Kingdom #'+esc(d.kid)+' \u00b7 TC '+esc(d.stove_lv)+dateMsg+'</div>';
  }catch(e){ const stE=$('#pf_status'); if(stE) stE.innerHTML='<div class="alert bad small">Gagal menghubungi server (offline/diblokir). Isi manual saja.</div>'; }
}
/* (removed dead updateHeaderSub \u2014 the Companion topbar has no #hdrsub element) */

/* ============ INIT ============ */
function initAppStars(){
  var c=document.getElementById('app_stars'); if(!c||!c.getContext) return;
  var ctx=c.getContext('2d'), stars=[], raf, reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function rs(){ c.width=window.innerWidth; c.height=window.innerHeight; }
  function seed(){ stars=[]; var n=Math.max(45,Math.min(110,Math.floor(c.width*c.height/14000)));
    for(var i=0;i<n;i++) stars.push({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.1+0.2,sp:Math.random()*0.006+0.001,ph:Math.random()*6.283}); }
  function paint(t){ ctx.clearRect(0,0,c.width,c.height);
    for(var i=0;i<stars.length;i++){ var s=stars[i]; var a=reduce?0.5:(0.25+0.45*Math.sin(t*s.sp+s.ph)); if(a<0)a=0;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,6.283); ctx.fillStyle='rgba(150,190,255,'+a+')'; ctx.fill(); } }
  function loop(t){ paint(t); raf=requestAnimationFrame(loop); }
  rs(); seed(); if(reduce){ paint(0); } else { raf=requestAnimationFrame(loop); }
  window.addEventListener('resize',function(){ rs(); seed(); if(reduce) paint(0); });
}
function injectFavicon(){
  try{
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#0d1219"/><path fill="#6b93f2" d="M3 8.6l3.6 2.8L12 4l5.4 7.4L21 8.6l-1.7 8.8H4.7L3 8.6z"/><rect x="5" y="18.2" width="14" height="1.9" rx=".4" fill="#6b93f2"/></svg>';
    var l=document.querySelector('link[rel="icon"]')||document.createElement('link');
    l.rel='icon'; l.type='image/svg+xml'; l.href='data:image/svg+xml,'+encodeURIComponent(svg);
    if(!l.parentNode) document.head.appendChild(l);
  }catch(e){}
}
function init(){
  injectFavicon();
  initAppStars();
  migrateProfiles();
  ksClock.load();
  /* Derivasi tanggal buka diperbaiki (UTC+8) — buang cache kdates lama yg dihitung
     pakai tanggal UTC (bisa meleset 1 hari utk server yg buka sore UTC, mis. 2184).
     PENTING: `profile.start` yg TERSIMPAN juga bisa memakai tanggal UTC lama; cache
     bersih saja tak cukup (autoDetect hanya refresh saat kingdom berubah). Selaraskan
     ulang start tiap profil dari seed KINGDOM_DATES yg sudah benar. */
  if(store.get('kdatesVer',0)<2){ store.set('kdates',{}); store.set('kdatesVer',2);
    try{
      const _profs=store.get('profiles',[])||[]; let _ch=false;
      _profs.forEach(p=>{ if(!p) return; const s=KINGDOM_DATES[String(p.kingdom||'')]; if(s&&p.start!==s){ p.start=s; _ch=true; } });
      if(_ch) store.set('profiles',_profs);
      const _ap=store.get('profile',{})||{}; const _s=KINGDOM_DATES[String(_ap.kingdom||'')];
      if(_s&&_ap.start!==_s){ _ap.start=_s; store.set('profile',_ap); }
    }catch(e){}
  }
  Object.assign(KINGDOM_DATES,store.get('kdates',{}));
  buildNav();
  const g=$('#gear'); if(g) g.onclick=()=>activate('profil'); /* gear removed from topbar (profile lives bottom-left) */
  $('#brand').onclick=()=>activate('sekarang');
  const tzb=$('#tztoggle'); if(tzb){ tzb.textContent=DISPLAY_TZ; tzb.onclick=()=>setTZ(DISPLAY_TZ==='WIB'?'UTC':'WIB'); }
  const last=store.get('lastTab','sekarang');
  activate(['sekarang','hero','event','castle','bangun','pets','island','kode','kalender','kalkulator','dukung','profil'].includes(last)?last:'sekarang');
  renderTopClock();
  _lastGameDay=ksClock.now().toISOString().slice(0,10);
  if(typeof autoDetectProfiles==='function') autoDetectProfiles(); /* isi nama/Kingdom/TC profil (non-blok) */
  setInterval(tickClock,1000);
  ksClock.sync().then(ok=>{ if(ok){ const nd=ksClock.now().toISOString().slice(0,10); const changed=nd!==_lastGameDay; _lastGameDay=nd; renderTopClock();
    /* only force a re-render if the sync actually moved us to a different game day — otherwise it would wipe in-progress typing */
    if(changed){ const ae=document.activeElement; if(!ae||!/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) activate(store.get('lastTab','sekarang')); }
  } });
  /* bumper splash: tahan ~2.4s biar animasi starfield + shimmer terlihat, lalu fade */
  const sp=document.getElementById('splash');
  if(sp){ const t0=window.__splashT0||Date.now();
    setTimeout(()=>{ sp.classList.add('off'); setTimeout(()=>sp.remove(),600); },Math.max(0,2400-(Date.now()-t0))); }
  showOnboard(); /* first-run: pilih bahasa + jam + Player ID (muncul saat splash memudar) */
  setTimeout(()=>{ if(typeof ksVisitorPing==='function') ksVisitorPing(); },5000); /* daftar pengunjung (1×/hari) */
  /* jaring pengaman EN di perangkat lambat: render async menyusul → terjemahkan ulang */
  if(window.__getLang&&window.__getLang()==='en') [1200,3000,6000,10000].forEach(t=>setTimeout(()=>{ if(window.__translate) window.__translate(); },t));
  /* cross-device sync: pull on open + every 5 min; re-render only when newer data applied */
  if(typeof ksSync!=='undefined'&&ksSync.on()){
    const onPull=r=>{ if(r!=='applied') return;
      const ae=document.activeElement; if(!ae||!/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){ activate(store.get('lastTab','sekarang')); if(typeof updateSideProf==='function') updateSideProf(); } };
    ksSync.pull().then(onPull);
    setInterval(()=>ksSync.pull().then(onPull),5*60000);
  }
}
/* ATURAN TETAP layar masuk (first-run): pilih Bahasa + Jam + Player ID (submit =
   auto-deteksi Kingdom/TC/tanggal server) — supaya tak perlu mengisi lagi di dalam.
   Label bilingual karena tampil SEBELUM bahasa dipilih. Per-perangkat — tidak disinkron. */
function showOnboard(){
  if(document.getElementById('onboard')) return;
  /* GATE: tampil terus sampai bahasa+jam dipilih DAN Player ID terhubung */
  if(store.get('onboard',0)&&(store.get('profile',{})||{}).pid) return;
  const d=document.createElement('div'); d.id='onboard';
  d.innerHTML=`<div class="ob-box">
    <div class="ob-logo"><svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path fill="currentColor" d="M2 8.2l4.3 3.4L12 3l5.7 8.6L22 8.2l-2 10.4H4L2 8.2z"/><rect x="4" y="19.4" width="16" height="2.2" rx=".4" fill="currentColor"/></svg></div>
    <div class="ob-wm"><span class="ob-br">[</span><span class="ob-tt">INDONenen<b class="ob13">13</b></span><span class="ob-br">]</span></div>
    <div class="ob-s">F2P Companion · Tilubelas Gaming Network</div>
    <div class="ob-l">Bahasa / Language</div>
    <div class="ob-row" id="ob_lang"><button data-v="id" class="active">🇮🇩 Indonesia</button><button data-v="en">🇬🇧 English</button></div>
    <div class="ob-l">Jam / Clock</div>
    <div class="ob-row" id="ob_tz"><button data-v="WIB" class="active">WIB (UTC+7)</button><button data-v="UTC">UTC</button></div>
    <div class="ob-l">Player ID</div>
    <input id="ob_pid" inputmode="numeric" autocomplete="off" placeholder="cth / e.g. 330300846" class="ob-in">
    <div class="ob-hint">Kingdom, TC & umur server terdeteksi otomatis / auto-detected · ID ada di profil dalam game / see your in-game profile</div>
    <div class="ob-err" id="ob_err"></div>
    <button class="ob-go" id="ob_go">MULAI →</button>
    <button class="ob-skip" id="ob_skip" style="display:none">Lanjut tanpa ID / Continue without ID</button>
  </div>`;
  document.body.appendChild(d);
  /* tombol mencerminkan preferensi TERSIMPAN (gate bisa muncul ulang), dan pilihan
     DITERAPKAN LANGSUNG saat disentuh — MULAI tak pernah menimpa pilihan user */
  const curLang=(window.__getLang&&window.__getLang())||'id';
  const curTz=(typeof DISPLAY_TZ!=='undefined')?DISPLAY_TZ:'WIB';
  const mark=(id,v)=>d.querySelectorAll('#'+id+' button').forEach(x=>x.classList.toggle('active',x.dataset.v===v));
  mark('ob_lang',curLang); mark('ob_tz',curTz);
  d.querySelector('#ob_go').textContent=curLang==='en'?'START →':'MULAI →';
  d.querySelectorAll('#ob_lang button').forEach(b=>b.onclick=()=>{
    mark('ob_lang',b.dataset.v);
    d.querySelector('#ob_go').textContent=b.dataset.v==='en'?'START →':'MULAI →';
    if(window.setLang) window.setLang(b.dataset.v); /* langsung terasa */
  });
  d.querySelectorAll('#ob_tz button').forEach(b=>b.onclick=()=>{
    mark('ob_tz',b.dataset.v);
    if(typeof setTZ==='function') setTZ(b.dataset.v);
  });
  const finish=()=>{
    store.set('onboard',1);
    if(typeof activate==='function') activate(store.get('lastTab','sekarang')); /* render ulang dgn profil baru */
    if(typeof updateSideProf==='function') updateSideProf();
    /* perangkat lambat: render async (advisory/jadwal live) menyusul — terjemahkan ulang */
    if(window.__getLang&&window.__getLang()==='en') [800,2500,6000].forEach(t=>setTimeout(()=>{ if(window.__translate) window.__translate(); },t));
    d.classList.add('off'); setTimeout(()=>d.remove(),450);
  };
  const go=d.querySelector('#ob_go'), err=d.querySelector('#ob_err');
  go.onclick=async()=>{
    const fid=(d.querySelector('#ob_pid').value||'').trim();
    if(!fid){ err.textContent='Isi Player ID, atau pilih Lewati / Enter your Player ID, or Skip.'; return; }
    const lbl=go.textContent; go.disabled=true; go.textContent='⏳ …'; err.textContent='';
    try{
      const j=await ksPlayerLookup(fid);
      if(j.code!==0||!j.data) throw new Error('notfound');
      const dd=j.data;
      const openDate=await fetchKingdomDate(dd.kid);
      connectProfileTo(fid,dd,openDate);
      finish();
    }catch(e){
      go.disabled=false; go.textContent=lbl;
      err.textContent='Player ID tidak ditemukan / gagal terhubung — periksa ID lalu coba lagi. (Not found / connection failed — check the ID and retry.)';
      d.querySelector('#ob_skip').style.display=''; /* pintu darurat hanya saat gagal */
    }
  };
  d.querySelector('#ob_skip').onclick=()=>finish();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

/* ============ TRACKER CARD ============ */
function buildTrackerCard(){
  const trk=store.get('trackProg',{});
  let total=0,done=0;
  TRACKER.forEach((g,gi)=>g.items.forEach((it,ii)=>{total++; if(trk['t'+gi+'_'+ii])done++;}));
  let body='<p class="muted small">Centang yang sudah tercapai \u2014 tersimpan otomatis di perangkatmu. <b id="trk_count" class="num">'+done+'</b>/'+total+' selesai.</p>';
  TRACKER.forEach((g,gi)=>{ body+='<div class="lbl" style="margin:14px 0 4px">'+esc(g.g)+'</div>';
    g.items.forEach((it,ii)=>{ const id='t'+gi+'_'+ii,on=!!trk[id];
      body+='<label class="check'+(on?' done':'')+'" data-trk="'+id+'"><input type="checkbox" '+(on?'checked':'')+'><div><div class="t">'+esc(it[0])+'</div><div class="d">'+esc(it[1])+'</div></div></label>'; }); });
  return card('Progres Pribadi','\u2713',body,done+'/'+total,true);
}
function wireTracker(el){
  $$('[data-trk]',el).forEach(lb=>{ lb.querySelector('input').onchange=e=>{ const t=store.get('trackProg',{}); t[lb.dataset.trk]=e.target.checked; store.set('trackProg',t); lb.classList.toggle('done',e.target.checked);
    /* count only CURRENT tracker ids (stored object may hold stale keys from older versions) */
    let n=0,total=0; TRACKER.forEach((g,gi)=>g.items.forEach((it,ii)=>{ total++; if(t['t'+gi+'_'+ii]) n++; }));
    const c=$('#trk_count',el); if(c){ c.textContent=n; const meta=c.closest('.card')?.querySelector('.card-h .meta'); if(meta) meta.textContent=n+'/'+total; }
  }; });
}

/* ============ NOTIFICATIONS ============ */
function notifSupported(){ return typeof Notification!=='undefined'; }
function notifBody(){
  const on=store.get('notifOn',false); const sup=notifSupported();
  return '<p class="muted small">Pengingat muncul saat app TERBUKA di browser: 30 menit sebelum reset 07:00 WIB (kalau checklist harian belum selesai) & 30 menit sebelum battle KvK (19:00 WIB). Untuk alarm walau app DITUTUP, pakai pengingat kalender di HP.</p>'
    +'<div class="row"><button class="btn '+(on?'sec ':'')+'sm" id="nf_toggle">'+(on?'\u2713 Notifikasi AKTIF (matikan)':'Aktifkan notifikasi')+'</button><span id="nf_stat" class="muted small"></span></div>'
    +(!sup?'<div class="alert warn small">Browser ini tak dukung notifikasi (sering terjadi kalau buka file langsung tanpa server). Pakai alarm kalender HP.</div>':'');
}
function wireNotif(el){
  const b=$('#nf_toggle',el); if(!b) return;
  b.onclick=()=>{ const st=$('#nf_stat',el);
    if(!notifSupported()){ if(st)st.textContent='tak didukung di mode ini'; return; }
    if(store.get('notifOn',false)){ store.set('notifOn',false); renderProfil(); return; }
    Notification.requestPermission().then(p=>{ if(p==='granted'){ store.set('notifOn',true); renderProfil(); } else if(st)st.textContent='izin ditolak'; }).catch(()=>{ if(st)st.textContent='gagal'; });
  };
}
function checkTimedNotif(){
  if(!store.get('notifOn',false)||!notifSupported()||Notification.permission!=='granted') return;
  const {start,age}=profileAge(); if(age==null) return;
  const flags=store.get('notifFlags',{}); const now=ksClock.now().getTime(); const dkey=ksClock.now().toISOString().slice(0,10);
  /* prune stale per-day flags so the store doesn't grow forever */
  let pruned=false; for(const k in flags){ const m=k.match(/(\d{4}-\d{2}-\d{2})$/); if(m&&m[1]<dkey){ delete flags[k]; pruned=true; } }
  if(pruned) store.set('notifFlags',flags);
  const left=nextResetUTC()-now;
  if(left>0&&left<=30*60000){ const stt=store.get('daily',{checked:{}});
    const dn=stt.date===dkey?Object.values(stt.checked||{}).filter(Boolean).length:0; /* stale store = nothing done today */
    const key='reset-'+dkey;
    if(dn<DAILY_TASKS.length&&flags[key]!==1){ flags[key]=1; store.set('notifFlags',flags);
      try{ new Notification('Reset 07:00 WIB '+Math.round(left/60000)+' menit lagi',{body:'Masih '+(DAILY_TASKS.length-dn)+' tugas harian belum selesai.'}); }catch(e){} } }
  activeAdvisories(start,age).filter(a=>a.tpl.battleWIB&&a.di===a.tpl.len-1).forEach(a=>{ const bl=battleUTC()-now; const key='battle-'+a.type+'-'+dkey;
    if(bl>0&&bl<=30*60000&&flags[key]!==1){ flags[key]=1; store.set('notifFlags',flags);
      try{ new Notification(a.tpl.name.split('(')[0].trim()+' battle '+Math.round(bl/60000)+' menit lagi (19:00 WIB)',{body:'Pasang formasi, shield, siap rally.'}); }catch(e){} } });
  const et=evtTimes();
  SETTABLE_EVENTS.forEach(ev=>{ const t=et[ev.id]; if(!t) return; const nx=nextRecurUTC(ev,t); if(!nx) return; const bl=nx-now;
    const key='evt-'+ev.id+'-'+new Date(nx).toISOString().slice(0,10); /* key by OCCURRENCE date (30-min window can cross UTC midnight) */
    if(bl>0&&bl<=30*60000&&flags[key]!==1){ flags[key]=1; store.set('notifFlags',flags);
      try{ new Notification(ev.n+' '+Math.round(bl/60000)+' menit lagi',{body:'Jam alliance — siapkan rally/garrison.'}); }catch(e){} } });
}
