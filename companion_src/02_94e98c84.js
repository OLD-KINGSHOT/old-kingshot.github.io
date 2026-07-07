/* ============================================================
   KINGSHOT COMPANION — APP (nav, live clock, renderers, init)
   ============================================================ */
const NAV=[
  {id:'sekarang',gi:'\u25d0',label:'Sekarang'},
  {id:'hero',gi:'\u25ce',label:'Hero'},
  {id:'event',gi:'\u2694',label:'Event'},
  {id:'castle',gi:'\ud83c\udff0',label:'Castle'},
  {id:'bangun',gi:'\u25a3',label:'Bangun'},
  {id:'pets',gi:'\u2b22',label:'Pets'},
  {id:'island',gi:'\ud83c\udfdd',label:'Island'},
  {id:'kode',gi:'\u2726',label:'Kode'},
  {id:'kalender',gi:'\u2691',label:'Kalender'},
  {id:'kalkulator',gi:'\ud83e\uddee',label:'Kalkulator'},
  {id:'dukung',gi:'\u2764',label:'Dukung'},
];

function navBtnHTML(n,cls){ return `<button class="navbtn" data-go="${n.id}"><span class="gi">${n.gi}</span><span class="nl">${esc(n.label)}</span></button>`; }
function updateBrandCredit(){
  /* Auto-update kredit brand dari profil aktif — ganti nama in-game = brand ikut berubah.
     Fallback ke kredit statis pembuat kalau profil kosong. */
  const by=$('#brandby'); if(!by) return;
  const p=store.get('profile',{});
  const nm=(p.nick||p.name||'').trim()||'indonenen#13';
  const pid=(''+(p.pid||p.id||'')).trim()||'33030846';
  const kd=(''+(p.kingdom||'')).trim()||'2114';
  by.textContent='powered by '+nm+' · ID '+pid+' · server #'+kd;
}
function updateSideProf(){
  updateBrandCredit();
  const sub=$('#sp_sub'); if(!sub) return;
  const p=store.get('profile',{});
  sub.textContent=p.pid?('#'+(p.kingdom||'?')+' · '+p.pid):'belum terhubung';
  const b=$('#sideprof'); if(b) b.classList.toggle('on',!!p.pid);
  /* Multi-profil: dropdown switcher (tampil bila ≥2 profil) */
  const sel=$('#profSwitch'); if(sel){
    const profs=(typeof store.get==='function')?store.get('profiles',[]):[];
    const ap=(typeof _ksActivePid==='function')?_ksActivePid():'';
    if(profs.length>1){
      sel.style.display='';
      sel.innerHTML=profs.map(pr=>`<option value="${esc(pr.pid)}"${pr.pid===ap?' selected':''}>${esc(pr.nick||'(tanpa nama)')} · ${esc(pr.pid)}</option>`).join('');
      sel.onchange=()=>{ if(typeof setActiveProfile==='function') setActiveProfile(sel.value); };
    } else { sel.style.display='none'; }
  }
}
/* Geser nav seperti trackpad: drag mouse/pen + roda vertikal → scroll horizontal.
   Hanya menggeser nav itu sendiri (tidak menyentuh scroll halaman / elemen lain).
   Touch pakai scroll native (sudah mulus). Klik ditahan kalau barusan men-drag. */
function makeDragScroll(nav){
  if(!nav||nav._drag) return; nav._drag=true;
  var down=false,startX=0,startL=0,moved=false;
  nav.addEventListener('pointerdown',function(e){ if(e.pointerType==='touch'||(e.button&&e.button!==0)) return; down=true; moved=false; startX=e.clientX; startL=nav.scrollLeft; try{nav.setPointerCapture(e.pointerId);}catch(_){} });
  nav.addEventListener('pointermove',function(e){ if(!down) return; var dx=e.clientX-startX; if(Math.abs(dx)>4) moved=true; nav.scrollLeft=startL-dx; });
  var up=function(e){ if(!down) return; down=false; try{nav.releasePointerCapture(e.pointerId);}catch(_){} };
  nav.addEventListener('pointerup',up); nav.addEventListener('pointercancel',up);
  nav.addEventListener('click',function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); moved=false; } },true);
  nav.addEventListener('wheel',function(e){ if(nav.scrollWidth>nav.clientWidth+2 && Math.abs(e.deltaY)>=Math.abs(e.deltaX)){ nav.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
}
function buildNav(){
  $('#navlist').innerHTML=NAV.map(n=>navBtnHTML(n)).join('');
  /* mobile bottom-nav: Profil FIRST (bottom-LEFT — the single login/settings access on phones) */
  $('#mobnav').innerHTML=[{id:'profil',gi:'👤',label:'Profil'}].concat(NAV).map(n=>navBtnHTML(n)).join('');
  $$('[data-go]').forEach(b=>b.onclick=()=>activate(b.dataset.go));
  makeDragScroll($('#mobnav')); makeDragScroll($('#navlist'));
  const sp=$('#sideprof'); if(sp) sp.onclick=()=>activate('profil');
  updateSideProf();
}
function activate(id){
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  $$('[data-go]').forEach(b=>b.classList.toggle('active',b.dataset.go===id));
  const sp=$('#sideprof'); if(sp) sp.classList.toggle('active',id==='profil');
  updateSideProf();
  store.set('lastTab',id);
  const fn=window['render'+id.charAt(0).toUpperCase()+id.slice(1)];
  if(typeof fn==='function') fn();
  window.scrollTo(0,0);
  /* mobile bottom-nav: geser tombol aktif ke tengah biar tak "hilang" saat banyak tab */
  const ab=document.querySelector('#mobnav [data-go="'+id+'"]');
  if(ab&&ab.scrollIntoView){ try{ ab.scrollIntoView({inline:'center',block:'nearest'}); }catch(e){} }
}

/* ============ LIVE CLOCK (topbar) ============ */
function clockEventChips(){
  const {start,age}=profileAge(); if(age==null||age<1) return '';
  const chips=[]; const active=activeAdvisories(start,age); const activeTypes=new Set(active.map(a=>a.type));
  active.forEach(a=>{
    let s=`<b>${EV_EMOJI[a.type]||'\u25c6'} ${a.tpl.name.split('(')[0].trim()} D${a.di+1}/${a.len||a.tpl.len}</b>`;
    if(a.tpl.battleWIB&&a.di===a.tpl.len-1){ const bl=battleUTC()-ksClock.now().getTime(); s+=' \u00b7 <span class="hot">\u2694 battle '+(bl>0?hms(bl):'live')+'</span>'; }
    chips.push(s);
  });
  const nextEv=predictedEvents(start,age).filter(pp=>pp.day>age&&!activeTypes.has(pp.type)).sort((x,y)=>x.day-y.day)[0];
  if(nextEv){ const t=EVENT_TEMPLATES[nextEv.type]; if(t) chips.push((EV_EMOJI[nextEv.type]||'\u25c6')+' '+t.name.split('(')[0].trim()+' H-'+(nextEv.day-age)); }
  return chips.join(' \u00b7 ');
}
function renderTopClock(){
  const w=dispNow();
  const clock=pad(w.getUTCHours())+':'+pad(w.getUTCMinutes())+':'+pad(w.getUTCSeconds());
  const datestr=ID_DOW[w.getUTCDay()].slice(0,3)+' '+w.getUTCDate()+' '+ID_MON[w.getUTCMonth()];
  const left=nextResetUTC()-ksClock.now().getTime();
  const star=ksClock.synced?'':'<span class="nosync" title="pakai jam perangkat">*</span>';
  const chips=clockEventChips();
  $('#clk').innerHTML=`${clock}<span class="wib"> ${tzInfo().label}${star}</span>`;
  $('#clkmeta').innerHTML=`${datestr} \u00b7 <span class="hot">reset ${tzInfo().reset} ${hms(left)}</span>${chips?' \u00b7 '+chips:''}`;
  const eng=$('#engine'); if(eng){ eng.classList.toggle('off',!ksClock.synced); eng.firstChild.textContent=ksClock.synced?'LIVE \u00b7 SYNC':'LIVE'; }
}
let _lastGameDay=null;
function tickClock(){
  renderTopClock();
  const hc=$('#hud_clock'),hr=$('#hud_reset');
  if(hc){ const w=dispNow(); hc.textContent=pad(w.getUTCHours())+':'+pad(w.getUTCMinutes())+':'+pad(w.getUTCSeconds()); }
  if(hr) hr.textContent=hms(nextResetUTC()-ksClock.now().getTime());
  const er=$('#ev_reset'); if(er) er.textContent=hms(nextResetUTC()-ksClock.now().getTime());
  const eb=$('#ev_battle'); if(eb){ const bd=battleUTC()-ksClock.now().getTime(); eb.textContent=bd>0?hms(bd):'LIVE'; }
  const et=evtTimes(); const _n=ksClock.now().getTime();
  const _blink=(el,rem)=>{ if(el) el.classList.toggle('cd-hot',rem>0&&rem<60000); };
  $$('.sk-cd').forEach(function(e){ var t=+e.dataset.t; if(!t)return; var s=Math.max(0,Math.floor((t-_n)/1000)); var d=Math.floor(s/86400); s-=d*86400; var h=Math.floor(s/3600); s-=h*3600; var m=Math.floor(s/60); var u=e.dataset.u; e.textContent=u==='d'?String(d):pad(u==='h'?h:m); });
  $$('.ev-cd').forEach(b=>{ const ev=SETTABLE_EVENTS.find(e=>e.id===b.dataset.ev); const t=ev&&et[ev.id]; const nx=t?nextRecurUTC(ev,t):null; if(nx){ b.textContent=hms(nx-_n); _blink(b,nx-_n); } });
  /* progress bars (Sekarang countdown card) */
  const fr=$('#cdf_reset'); if(fr){ const rem=nextResetUTC()-_n; fr.style.width=Math.max(0,Math.min(100,100*(86400000-rem)/86400000))+'%'; }
  $$('.cdf-ev').forEach(f=>{ const ev=SETTABLE_EVENTS.find(e=>e.id===f.dataset.ev); const t=ev&&et[ev.id]; const nx=t?nextRecurUTC(ev,t):null; if(!nx)return; const tot=(ev.daily?1:7)*86400000; const rem=nx-_n; f.style.width=Math.max(0,Math.min(100,100*(tot-rem)/tot))+'%'; });
  _blink($('#ev_reset'),nextResetUTC()-_n); _blink($('#hud_reset'),nextResetUTC()-_n);
  const gd=ksClock.now().toISOString().slice(0,10);
  if(_lastGameDay===null) _lastGameDay=gd;
  else if(gd!==_lastGameDay){ _lastGameDay=gd;
    const ae=document.activeElement; /* don't wipe in-progress typing at rollover */
    if(!ae||!/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) activate(store.get('lastTab','sekarang'));
  }
  if(typeof checkTimedNotif==='function') checkTimedNotif();
}

/* ============ SHARED COMPONENTS ============ */
function pageHead(title,sub){ return `<div class="pagehead"><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>`; }
function ratioBar(r){
  const seg=(c,v)=>v>0?`<span class="${c}" style="flex:${v}">${v>=12?v+'%':''}</span>`:'';
  return `<div class="rbar">${seg('inf',r.inf)}${seg('cav',r.cav)}${seg('arc',r.arc)}</div>
    <div class="rleg"><b class="inf">\u25b0</b> ${r.inf}% Inf \u00b7 <b class="cav">\u25b0</b> ${r.cav}% Cav \u00b7 <b class="arc">\u25b0</b> ${r.arc}% Archer</div>`;
}
/* ── Roster pemain (hero + ★, tersimpan & sinkron via ks_roster) ── */
function rosterGet(){ return store.get('roster',{}); }
function rosterStar(n){ return +(rosterGet()[n]||0); }
function rosterAny(){ const r=rosterGet(); for(const k in r){ if(+r[k]>0) return true; } return false; }
function rosterBest(ty){ const r=rosterGet(); return HEROES.filter(h=>h.ty===ty&&+r[h.n]>0).sort((a,b)=>r[b.n]-r[a.n])[0]||null; }
function lineupCard(s,age){
  const heroes=s.heroes.map(h=>{ const st=rosterStar(h.n); return `<span class="hc">${esc(h.n)}${h.note?' <small>('+esc(h.note)+')</small>':''}${st?' <span class="pill f2p">'+st+'★</span>':''}</span>`; }).join(s.pick?'<span class="dim small" style="align-self:center">atau</span>':'');
  /* Bear Hunt: rasio bergeser ke archer tiap generasi — otomatis sesuai umur server */
  let ratio=s.ratio, ratioNote='';
  if(s.key==='bear-trap'&&age!=null){
    ratio = age>=197?{inf:1,cav:10,arc:89} : age>=113?{inf:10,cav:10,arc:80} : age>=50?{inf:10,cav:20,arc:70} : {inf:10,cav:30,arc:60};
    ratioNote=` <span class="dim small">(${genForAge(age)}${age>=197?' · min 5.000 infantry · tes 1/10/89 vs 10/10/80 di march preview':''} — bergeser ke archer tiap gen)</span>`;
  }
  const gate=(age!=null&&s.minDay>0&&age<s.minDay)?`<div class="alert warn small" style="margin:0 0 8px">\u23f3 Belum aktif \u2014 mulai ~hari ${s.minDay} (server hari ${age}). Simpan persiapan.</div>`:'';
  return `<div class="lcard">
    <div class="lh"><span class="nm">${s.icon} ${esc(s.name)}${s.sub?' <span class="dim" style="font-weight:400">'+esc(s.sub)+'</span>':''}</span><span class="rolechip ${s.kind}">${esc(s.role)}</span></div>
    ${gate}${s.free?'<div class="dim small" style="margin-bottom:4px">Khusus Arena: 5 hero BEBAS kelas (aturan march tidak berlaku).</div>':'<div class="dim small" style="margin-bottom:4px">⚔ 1 march: max 3 hero, SATU per kelas (Inf/Cav/Arc) — 2 Archer (mis. Yeonwoo+Amane) TIDAK BISA bareng.</div>'}${s.role==='Joiner'?'<div class="dim small" style="margin-bottom:4px">Joiner → cuma hero SLOT-1 yang dihitung (skill Expedition #1).</div>':''}${s.pick?'<div class="dim small" style="margin-bottom:2px">Cukup SATU hero — pilih salah satu (taruh di slot-1):</div>':''}<div class="herochips">${heroes}</div>${ratioBar(ratio)}${ratioNote}
    ${s.table?`<div class="scrollx" style="margin-top:9px"><table class="ltbl"><tbody>${s.table.map((row,ri)=>`<tr>${row.map((c,ci)=>ri===0?`<th>${esc(c)}</th>`:(ci===0?`<td><b>${esc(c)}</b></td>`:`<td class="small">${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`:''}
    <div class="lrow up"><span class="lk">Skill\u2191</span>${esc(s.skillUp)}</div>
    ${rosterAny()?(function(){const inf=rosterBest('Infantry'),cav=rosterBest('Cavalry'),arc=rosterBest('Archer'),list=[inf,cav,arc].filter(Boolean),ld=list.slice().sort((a,b)=>rosterStar(b.n)-rosterStar(a.n))[0],c=(l,h)=>l+': '+(h?esc(h.n)+' '+rosterStar(h.n)+'\u2605':'\u2014');return `<div class="lrow"><span class="lk">Punyamu</span>${c('Inf',inf)} \u00b7 ${c('Cav',cav)} \u00b7 ${c('Arc',arc)}${ld?' \u00b7 \ud83d\udc51 leader '+esc(ld.n):''}</div>`;})():(age!=null&&typeof heroLeadersInline==='function'?`<div class="lrow"><span class="lk">Leader gen</span>${heroLeadersInline(age)}</div>`:'')}
    <div class="lrow"><span class="lk">Lakukan</span>${Array.isArray(s.do)?'<ul class="doul">'+s.do.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':esc(s.do)}</div>
  </div>`;
}
function card(title,gi,bodyHTML,meta,hud){
  return `<div class="card${hud?' hud':''}"><div class="card-h"><h2>${gi?`<span class="gi">${gi}</span>`:''}${title}</h2>${meta?`<span class="meta">${meta}</span>`:''}</div><div class="card-b">${bodyHTML}</div></div>`;
}

/* ============ SEKARANG (now dashboard) ============ */
function renderSekarang(){
  const el=$('[data-tab=sekarang]');
  let {p,start,age,tc}=profileAge();
  if(age!=null&&age<1) age=null;
  const w=dispNow(); const clock=pad(w.getUTCHours())+':'+pad(w.getUTCMinutes())+':'+pad(w.getUTCSeconds());
  const left=nextResetUTC()-ksClock.now().getTime();

  if(age==null){
    el.innerHTML='<div class="sk"><div class="card profile"><div style="display:flex;align-items:center;gap:12px"><div class="crest">⚔</div><div><div class="pf-name">KINGSHOT13</div><div class="pf-meta"><span class="badge">Belum terhubung</span></div></div></div></div>'
      +'<div class="card" style="padding:18px 20px;margin-top:14px"><p style="color:var(--sk-ink-soft);margin:0 0 12px">Masukkan Player ID sekali (seperti login) — app baca Kingdom, TC & umur server otomatis, lalu memberi panduan "siapkan event".</p><button class="btn" data-go="profil">Hubungkan Player ID →</button></div></div>';
    $$('[data-go]',el).forEach(b=>b.onclick=()=>activate(b.dataset.go));
    return;
  }

  const gen=(typeof genForAge==='function')?genForAge(age):'';
  const nm=esc(p.nick||p.name||'Governor');
  const pid=esc(p.pid||p.id||'—');

  /* ---- profile header ---- */
  const header='<div class="card profile"><div style="display:flex;align-items:center;gap:12px">'
    +'<div class="crest">⚔</div><div>'
    +'<div class="pf-name">'+nm+' <span class="pf-idn">ID '+pid+'</span></div>'
    +'<div class="pf-meta"><span class="badge acc">Kingdom #'+esc(p.kingdom||'?')+'</span>'
    +'<span class="badge">Umur server: Hari ke-'+age+'</span>'
    +(tc?'<span class="badge">TC '+tc+'</span>':'')
    +(gen?'<span class="badge">'+esc(gen)+'</span>':'')
    +'<span class="badge" style="'+(isP2W()?'color:#ffb64a;border-color:rgba(255,182,74,.45)':'color:#5bd6a0;border-color:rgba(91,214,160,.45)')+'">'+(isP2W()?'💳 P2W':'🆓 F2P')+'</span>'
    +'</div></div></div>'
    +'<div class="pf-clock"><span class="clk tabular" id="hud_clock">'+clock+' <span style="color:var(--sk-ink-faint)">'+tzInfo().label+'</span></span>'
    +'<span class="reset"><span class="dot"></span> Reset '+tzInfo().reset+' dalam <b class="tabular" id="hud_reset">'+hms(left)+'</b></span></div></div>';

  /* ---- Siapkan Berikutnya: prep hero + gift card ---- */
  const preds=predictedEvents(start,age).slice().sort((a,b)=>a.day-b.day);
  const isActive=pp=>{const l=(EVENT_TEMPLATES[pp.type]&&EVENT_TEMPLATES[pp.type].len)||1; return pp.day<=age&&age<pp.day+(pp.type==='hog'?(HOG_DETAIL.iters[hogCurIdx(age)]?HOG_DETAIL.iters[hogCurIdx(age)].stages.length:l):l);};
  let nextEv=preds.find(pp=>pp.day>age)||preds.find(isActive)||preds[0];
  let heroHTML='';
  if(nextEv){
    const tpl=EVENT_TEMPLATES[nextEv.type]||{};
    const dleft=Math.max(0,nextEv.day-age);
    const target=new Date(nextEv.date+'T00:00:00Z').getTime();
    let steps=[],heroLine='',nameSuffix='',durTxt=tpl.len?tpl.len+' hari':'';
    if(nextEv.type==='hog'){
      const idx=hogCurIdx(age),it=HOG_DETAIL.iters[idx],no=Math.floor((nextEv.day-6)/14)+1;
      nameSuffix=' #'+no;
      if(it){ heroLine='Hero musim <b>'+esc(it.hero)+'</b> — cukup <b>'+esc(it.rank)+'</b> untuk shard'; durTxt=it.stages.length+' hari'; }
      steps=['<b>TAHAN gem</b> — Roulette D2 = 90.000/spin','<b>TAHAN Widget</b> — D5 = 100.000 (terbesar)','<b>Stage troop T9</b> — promote di hari Train Troops'];
    } else { steps=[tpl.hold?('<b>TAHAN:</b> '+esc(tpl.hold)):'Siapkan item sesuai tema event.']; }
    heroHTML='<div class="card hero"><div class="tagrow"><span class="chip prep">Prep · H-'+dleft+'</span>'+(durTxt?'<span class="chip">Durasi '+durTxt+'</span>':'')+'</div>'
      +'<h1>'+esc((tpl.name||nextEv.type).split('(')[0].trim())+nameSuffix+'</h1>'
      +'<div class="sub">Mulai <b>H'+nextEv.day+' · '+esc(addDaysFmt(start,nextEv.day))+'</b>'+(heroLine?' · '+heroLine:'')+'</div>'
      +'<div class="grid"><div class="count tabular">'
      +'<div class="u"><div class="n sk-cd" data-t="'+target+'" data-u="d">'+dleft+'</div><div class="l">hari</div></div>'
      +'<div class="u"><div class="n sk-cd" data-t="'+target+'" data-u="h">--</div><div class="l">jam</div></div>'
      +'<div class="u"><div class="n sk-cd" data-t="'+target+'" data-u="m">--</div><div class="l">menit</div></div></div>'
      +'<div class="prep-list">'+steps.map((s,i)=>'<div class="p"><i>'+(i+1)+'</i><div>'+s+'</div></div>').join('')+'</div></div></div>';
  }
  const giftHTML='<div class="card giftcard"><div class="gc-head">🎟️ Gift Code'
    +'<span class="gc-id">ID <b>'+pid+'</b><button class="cpy" data-c="'+pid+'">salin</button></span></div>'
    +'<div class="gc-list" id="sk_codes"><div class="gc-note">⏳ Memuat kode aktif…</div></div>'
    +'<div class="gc-note">Otomatis dari kingshot.net · <b>Redeem</b> menukar kode ke Player ID kamu (hadiah masuk mail in-game).</div></div>';
  const prepSection='<div class="eyebrow"><h2>Siapkan Berikutnya</h2><span class="hint">event terdekat + tukar kode</span></div>'
    +'<div class="prep-row">'+heroHTML+giftHTML+'</div>';

  /* ---- Event Kamu ---- */
  const adv=activeAdvisories(start,age); const advTypes=new Set(adv.map(a=>a.type));
  const ratioBarHTML=r=>{ if(!r) return ''; const seg=(w,c)=>'<i style="width:'+w+'%;background:var(--'+c+')"></i>';
    return '<div class="ratio"><div class="rbar">'+seg(r.inf,'sk-inf')+seg(r.cav,'sk-cav')+seg(r.arc,'sk-arc')+'</div>'
      +'<div class="rlabels"><span><b style="color:var(--sk-inf)">'+r.inf+'%</b> Inf</span><span><b style="color:var(--sk-cav)">'+r.cav+'%</b> Cav</span><span><b style="color:var(--sk-arc)">'+r.arc+'%</b> Arc</span></div></div>'; };
  const sit=k=>SITUATIONS.find(s=>s.key===k);
  const et=evtTimes();
  const heroesLine=s=>s&&s.heroes?s.heroes.map(h=>esc(h.n)).join(' / '):'';
  const bearGen=(function(){ const s=sit('bear-trap'); if(!s) return null; let r=s.ratio; if(age>=197)r={inf:1,cav:10,arc:89};else if(age>=113)r={inf:10,cav:10,arc:80};else if(age>=50)r={inf:10,cav:20,arc:70};else r={inf:10,cav:30,arc:60}; return {s,r}; })();
  /* bear cooldown state */
  const today=ksClock.now().toISOString().slice(0,10);
  let bd=store.get('bearDone',{date:today,done:false}); if(bd.date!==today){ bd={date:today,done:false}; store.set('bearDone',bd); }
  const _tz=(typeof tzInfo==='function')?tzInfo().label:'WIB';
  const timesetHTML=(id,label)=>{ const t=et[id]; const saved=!!t; const disp=(typeof wibToDisp==='function')?wibToDisp(t||''):(t||'');
    return '<div class="timeset'+(saved?' saved':'')+'" data-ts="'+id+'"><div class="lbl2">⏰ '+label+' <span style="color:var(--sk-ink-faint)">(diatur aliansi · '+_tz+')</span></div>'
      +'<div class="row"><input type="time" value="'+esc(disp||'')+'" id="ts-'+id+'"><button data-set="'+id+'">Simpan</button></div>'
      +'<div class="saved-row">✓ <span class="cd">'+esc(disp||'')+'</span> '+_tz+'<button class="edit" data-edit="'+id+'">ubah</button></div></div>'; };
  let cardsHTML='';
  /* Bear Trap */
  if(bearGen){ const done=bd.done;
    cardsHTML+='<div class="card ev"'+(done?' style="opacity:.6"':'')+'><div class="top"><span class="ico">🐻</span><div><div class="nm">Bear Trap</div><div class="when">harian · 1×/siklus</div></div>'
      +(done?'<span class="pill next">Sudah ikut</span>':'<span class="pill '+(et.bear?'live':'set')+'">'+(et.bear?'Terjadwal':'Atur jam')+'</span>')+'</div>'
      +'<div class="lineup"><span class="lbl">Hero</span> <b>'+heroesLine(bearGen.s)+'</b> <span class="pick">pilih 1 · slot-1</span></div>'
      +ratioBarHTML(bearGen.r)
      +(done?'<div class="do">✓ Sudah ikut hari ini — <b>muncul lagi siklus depan</b> (reset 07:00).</div>'
             :timesetHTML('bear','Jam trap')+'<label class="check note" style="margin-top:8px;cursor:pointer"><input type="checkbox" id="bear_done"> <span>Tandai sudah ikut trap hari ini</span></label>')
      +'</div>';
  }
  /* Viking */
  { const s=sit('viking'); if(s){
    cardsHTML+='<div class="card ev"><div class="top"><span class="ico">⚔️</span><div><div class="nm">Viking Vengeance</div><div class="when">tiap 2 minggu · 20 stage</div></div>'
      +'<span class="pill '+(et.viking?'live':'set')+'">'+(et.viking?'Terjadwal':'Atur jam')+'</span></div>'
      +'<div class="lineup"><span class="lbl">Hero</span> <b>'+heroesLine(s)+'</b> <span class="pick">kirim (kill)</span></div>'
      +ratioBarHTML(s.ratio)
      +'<div class="do"><b>Kosongkan rumah</b> + support anggota online. Stage 7/14/17 = skor besar.</div>'
      +timesetHTML('viking','Jam Viking')+'</div>';
  }}
  /* Next HoG (solo) */
  if(nextEv&&nextEv.type==='hog'){ const it=HOG_DETAIL.iters[hogCurIdx(age)]; const no=Math.floor((nextEv.day-6)/14)+1;
    cardsHTML+='<div class="card ev"><div class="top"><span class="ico">🏛</span><div><div class="nm">Hall of Governors #'+no+'</div><div class="when">H'+nextEv.day+' · ~'+Math.max(0,nextEv.day-age)+' hari</div></div><span class="pill prep">Prep</span></div>'
      +(it?'<div class="lineup"><span class="lbl">Hero musim</span> <b>'+esc(it.hero)+'</b> <span class="pick">'+esc(it.rank)+' → shard</span></div>':'')
      +'<div class="do">Solo · leaderboard. Tahan <b>gem, Widget, troop T9</b> untuk hari temanya.</div></div>';
  }
  /* Weekly recurring (first 1-2) */
  (typeof RECURRING_WEEKLY!=='undefined'?RECURRING_WEEKLY:[]).filter(function(r){return r.id!=='viking';}).slice(0,2).forEach(function(r){
    const nx=(typeof nextWibDay==='function')?nextWibDay(r.dows,r.settable?et[r.id]:null):null;
    cardsHTML+='<div class="card ev"><div class="top"><span class="ico">'+(r.gi||'◆')+'</span><div><div class="nm">'+esc(r.n)+'</div><div class="when">'+(nx?(nx.days===0?'hari ini':nx.days+' hari lagi')+' · '+esc(nx.label):esc((r.note||'').split('·')[0].trim()))+'</div></div><span class="pill next">Mingguan</span></div>'
      +'<div class="do">'+esc(r.note||'')+'</div></div>';
  });
  const eventSection='<div class="eyebrow"><h2>Event Kamu</h2><span class="hint">jam Bear & Viking kamu atur sendiri</span></div><div class="cards">'+cardsHTML+'</div>';

  /* ---- Hari Ini: top-5 + ring ---- */
  let stD=store.get('daily',{date:today,checked:{}}); if(stD.date!==today){ stD={date:today,checked:{}}; store.set('daily',stD); }
  const doneCount=Object.values(stD.checked).filter(Boolean).length;
  const TOTAL=DAILY_TASKS.length;
  const R=52,C=2*Math.PI*R,off=C*(1-doneCount/(TOTAL||1));
  const todaySection='<div class="eyebrow"><h2>Hari Ini</h2><span class="hint">rutinitas inti · reset 07:00</span></div>'
    +'<div class="today"><div class="card"><div id="sk_acts"></div><div class="more" id="sk_more">Lihat semua '+TOTAL+' tugas →</div></div>'
    +'<div class="card ring-wrap"><div class="ring"><svg width="120" height="120" viewbox="0 0 120 120"><circle cx="60" cy="60" r="'+R+'" fill="none" stroke="var(--sk-surface-2)" stroke-width="10"></circle><circle cx="60" cy="60" r="'+R+'" fill="none" stroke="var(--sk-accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" id="sk_ring"></circle></svg><div class="val tabular"><span id="sk_done">'+doneCount+'</span><small>/ '+TOTAL+' selesai</small></div></div><div class="cap">Habiskan rutinitas sebelum reset — momentum harian F2P.</div></div></div>';

  /* ---- tiles ---- */
  const tiles='<div class="eyebrow"><h2>Buka Cepat</h2></div><div class="tiles">'
    +'<div class="card tile" data-go="hero"><span class="ti">◎</span><span class="tl">Hero & Lineup</span></div>'
    +'<div class="card tile" data-go="event"><span class="ti">⚔</span><span class="tl">Event & Kalender</span></div>'
    +'<div class="card tile" data-go="bangun"><span class="ti">▣</span><span class="tl">Bangun & Progres</span></div>'
    +'<div class="card tile" data-go="kode"><span class="ti">🎟️</span><span class="tl">Gift Code</span></div></div>';

  el.innerHTML='<div class="sk">'+header+prepSection+eventSection+'<div id="now_live"></div>'+todaySection+tiles+'</div>';

  /* ---- wiring ---- */
  /* daily checklist: render top-5, expandable to all */
  const actsHost=$('#sk_acts',el); let expanded=false;
  const drawActs=()=>{ const items=expanded?DAILY_TASKS:DAILY_TASKS.slice(0,5);
    actsHost.innerHTML=items.map(([t,d],i)=>{ const id='d'+i,on=!!stD.checked[id];
      return '<div class="act'+(on?' done':'')+'" data-i="'+i+'"><span class="cb"></span><div><div class="t">'+esc(t)+'</div><div class="d">'+esc(d)+'</div></div></div>';
    }).join('');
    $$('.act',actsHost).forEach(a=>{ a.onclick=()=>{ const i=a.dataset.i; const now=!stD.checked['d'+i]; stD.checked['d'+i]=now; store.set('daily',stD); a.classList.toggle('done',now);
      const dc=Object.values(stD.checked).filter(Boolean).length; const ds=$('#sk_done'); if(ds)ds.textContent=dc; const rg=$('#sk_ring'); if(rg)rg.style.strokeDashoffset=(C*(1-dc/(TOTAL||1))).toFixed(1); }; });
  };
  drawActs();
  const moreBtn=$('#sk_more',el); if(moreBtn) moreBtn.onclick=()=>{ expanded=!expanded; moreBtn.textContent=expanded?'Tampilkan lebih sedikit ↑':('Lihat semua '+TOTAL+' tugas →'); drawActs(); };

  /* time inputs */
  $$('[data-set]',el).forEach(b=>b.onclick=()=>{ const id=b.dataset.set; let v=($('#ts-'+id,el)||{}).value; if(!v)return; v=(typeof dispToWib==='function')?dispToWib(v):v; const pr=store.get('profile',{}); const t=Object.assign({},pr.eventTimes||{}); t[id]=v; pr.eventTimes=t; if(id==='bear')pr.bearTime=v; store.set('profile',pr); renderSekarang(); });
  $$('[data-edit]',el).forEach(b=>b.onclick=()=>{ const id=b.dataset.edit; const pr=store.get('profile',{}); const t=Object.assign({},pr.eventTimes||{}); delete t[id]; pr.eventTimes=t; if(id==='bear')pr.bearTime=''; store.set('profile',pr); renderSekarang(); });
  /* bear cooldown toggle */
  const bdc=$('#bear_done',el); if(bdc) bdc.onchange=()=>{ store.set('bearDone',{date:today,done:bdc.checked}); renderSekarang(); };
  /* gift copy/redeem */
  $$('.cpy',el).forEach(b=>b.onclick=()=>{ try{navigator.clipboard.writeText(b.dataset.c);}catch(e){} const o=b.textContent;b.textContent='ok';setTimeout(()=>b.textContent=o,1200); });
  /* tiles + go */
  $$('[data-go]',el).forEach(b=>b.onclick=()=>activate(b.dataset.go));
  /* async: fill gift codes */
  (async function(){ let codes=null; try{ codes=await ksLiveCodes(); }catch(e){} const host=$('#sk_codes',el); if(!host) return;
    if(!codes||!codes.length){ host.innerHTML='<div class="gc-note">Tak ada kode aktif / gagal memuat. Cek tab Gift Code.</div>'; return; }
    host.innerHTML=codes.slice(0,4).map(g=>'<div class="gc-row"><code>'+esc(g.code)+'</code><span class="exp">'+(g.exp&&g.exp!=='-'?'s/d '+esc(g.exp):'')+'</span><button class="redeem" data-code="'+esc(g.code)+'">Redeem</button></div>').join('');
    $$('.redeem',host).forEach(b=>b.onclick=async()=>{ const fid=(p.pid||p.id||'').toString(); if(!fid){ activate('kode'); return; } b.textContent='…'; b.disabled=true; try{ const r=await ksRedeem(fid,b.dataset.code); b.textContent=r&&r.cls==='ok'?'✓ ok':(r?r.txt:'gagal'); if(r&&r.cls==='ok')b.classList.add('done'); }catch(e){ b.textContent='gagal'; } setTimeout(()=>{b.textContent='Redeem';b.disabled=false;b.classList.remove('done');},2000); });
  })();
  fillNowLive(age);
}

/* "Lakukan SEKARANG" ikut menampilkan event mingguan kingdom yang berjalan HARI INI
   (rotasi global kingshot.net, di-gate umur server) — bukan cuma event skor. */
async function fillNowLive(age){
  const host=$('#now_live'); if(!host) return;
  try{ if(typeof ksLiveEvents==='function') await ksLiveEvents(); }catch(e){}
  const wk=(typeof wkEventsOnDate==='function')?wkEventsOnDate(todayMidnight()):[];
  const open=wk.filter(function(e){ var min=(typeof WEEKLY_MIN!=='undefined')?WEEKLY_MIN[e.titleKey]:null; return !(min!=null&&age!=null&&age<min); });
  const h2=$('#now_live'); if(!h2) return; /* tab may have changed during fetch */
  if(!open.length){ h2.innerHTML=''; return; }
  h2.innerHTML='<div class="eyebrow"><h2>Event Kingdom Minggu Ini</h2><span class="hint">rotasi live kingshot.net · berjalan hari ini</span></div>'
    +'<div class="cards">'+open.map(function(e){ var g=(typeof WEEKLY_GUIDE!=='undefined'&&WEEKLY_GUIDE[e.titleKey])||WEEKLY_GUIDE_DEFAULT;
      return '<div class="card ev"><div class="top"><span class="ico">📡</span><div><div class="nm">'+esc(e.title)+'</div><div class="when">berjalan hari ini</div></div><span class="pill live">Aktif</span></div><div class="do">'+esc(g)+'</div></div>'; }).join('')+'</div>'
    +'<div class="muted small" style="margin-top:8px">Rotasi global kingshot.net — kingdom muda bisa beda; acuan final tab Events in-game. Detail: tab Event → 📡 Jadwal Live.</div>';
  if(window.__getLang&&window.__getLang()==='en'&&window.__translate) window.__translate();
}

/* ============ HERO ============ */
function renderHero(){
  const el=$('[data-tab=hero]');
  const {start,age}=profileAge();
  const gen=age!=null?genForAge(age):null;
  const order={S:0,A:1,B:2,C:3,Gen6:4};
  const sorted=[...HEROES].sort((a,b)=>order[a.t]-order[b.t]||a.n.localeCompare(b.n));
  let curPhase=age==null?0:HERO_TARGETS.findIndex(ph=>age<ph.maxDay); if(curPhase<0)curPhase=HERO_TARGETS.length-1;

  /* now lineup */
  const by=k=>SITUATIONS.find(s=>s.key===k);
  let nowHTML;
  if(age==null) nowHTML='<div class="alert inf small">Hubungkan Player ID di tab Profil untuk lineup hari ini.</div>';
  else{ nowHTML='<div class="lbl" style="margin-bottom:4px">Rally harian (selalu)</div>'+lineupCard(by('bear-trap'),age);
    const seen=new Set(); activeAdvisories(start,age).forEach(a=>{ if(a.type==='kvk'&&!seen.has('kvk')){ seen.add('kvk'); nowHTML+='<div class="lbl" style="margin:10px 0 4px">Event combat aktif</div>'+lineupCard(by('kvk-rally'),age); } });
  }

  const ruleBox=`<div class="alert ok small"><b>Cara baca skill hero</b> — tiap hero punya 2 set skill terpisah (manual beda, bisa di-maks dua-duanya):<br>• <b>EXPEDITION</b> = dipakai di rally, garrison, Bear Hunt, KvK, semua tempur lapangan. <b>Ini yang utama untuk F2P.</b><br>• <b>CONQUEST</b> = HANYA Arena & Campaign. Skill pertamanya = "Ultimate" (otomatis). Tak main Arena → tabung manualnya.</div>
  <div class="alert inf small"><b>JOINER</b> (kamu ikut rally orang lain): cuma <b>skill Expedition PERTAMA</b> (bendera hijau) yang dihitung → maks itu ke Lv5 (butuh 4★). Skill ke-2/3, gear, & widget joiner <b>SIA-SIA</b> — jangan buang resource ke situ. <b>LEADER / GARRISON</b> (hero kamu deploy penuh): naikkan <b>semua 3 skill Expedition</b>.</div>`;

  el.innerHTML=pageHead('Hero & Lineup','Satu sumber data \u2014 jawab "event ini pakai hero apa", siapa diprioritaskan, dan skill mana dinaikkan / ditahan.')
    +`<div class="subnav" id="herosub">
        <button data-sub="lineup">\u25ce Lineup</button>
        <button data-sub="prioritas">\u2605 Prioritas</button>
        <button data-sub="daftar">\u25a4 Daftar</button>
      </div><div id="herobody"></div>`;

  function sub(which){
    $$('#herosub button',el).forEach(b=>b.classList.toggle('active',b.dataset.sub===which));
    store.set('heroSub',which);
    const body=$('#herobody',el); let html='';
    if(which==='lineup'){
      html=card('Hero per Situasi','\u25ce',
          `<p class="muted small">Pilih situasi \u2192 hero, formasi troop & skill. (Lineup "hari ini" ada di tab Sekarang.)</p>
           <div class="seg" id="sitpick"></div><div id="sitcard"></div>`);
    } else if(which==='prioritas'){
      html=card('Skill di-MAX per hero','\u25c6',
          `<div class="alert ok small"><b>EXPEDITION</b> = semua mode lapangan (rally, garrison, Bear Hunt, PvP, gather). <b>CONQUEST</b> = Arena/Campaign saja.<br><b>Join rally \u2192 cuma skill #1.</b> Leader/garrison \u2192 max SEMUA skill Expedition. Arena \u2192 Ultimate (Conquest #1) Lv5\u21928\u219210.</div>
           <div class="scrollx"><table><thead><tr><th>Hero</th><th>Skill di-MAX (nama in-game)</th><th>Peran</th></tr></thead><tbody>
           ${SKILL_MAX.map(([h,c,s,r])=>`<tr><td><b>${esc(h)}</b></td><td class="small">${s}</td><td class="small muted">${esc(r)}</td></tr>`).join('')}
           </tbody></table></div>
           <div class="alert bad small">\u26d4 Boros buku #1: naikkan skill 2/3 / gear / widget hero JOINER (cuma skill #1 kepakai). Juga Conquest kalau tak main Arena.</div>
           <div class="alert inf small">\ud83d\udca1 Sisa buku Expedition \u2192 hero biru <b>Forrest & Olive</b> (skill gathering kayu & roti) = bottleneck resource F2P. Buku Conquest: TABUNG kalau tak main Arena.</div>`)
        +card('Prioritas Hero \u2014 naikkan dulu','\u2605',
          ruleBox+HERO_PRIORITY.map(h=>`<div class="lcard" style="padding:11px 13px">
            <div class="lh"><span class="nm" style="font-size:13px">#${h.rank} ${esc(h.name)}</span><span class="rolechip ${/[Gg]arrison/.test(h.role)?'garrison':(/Support|ekonomi/.test(h.role)?'defense':'rally')}">${esc(h.role)}</span><span class="tag">${esc(h.troop)} \u00b7 ${esc(h.star)}</span></div>
            <div class="lrow up"><span class="lk">Expedition</span>${esc(h.exped)}</div>
            <div class="lrow no"><span class="lk">Conquest</span>${esc(h.conq)}</div>
            <div class="muted small" style="margin-top:5px">${esc(h.why)}</div></div>`).join(''))
        +card('Kombo Joiner (effect_op)','\u25ce',
          `<div class="alert ok small">${JOINER_COMBO.rule}</div>
           <div class="lbl" style="margin:12px 0 4px">Kombo OFFENSIVE \u2014 rally nyerang</div>
           ${JOINER_COMBO.off.map(x=>`<div class="check note"><div class="d" style="color:var(--fg)">${esc(x)}</div></div>`).join('')}
           <div class="lbl" style="margin:14px 0 4px">Kombo DEFENSIVE \u2014 garrison</div>
           ${JOINER_COMBO.def.map(x=>`<div class="check note"><div class="d" style="color:var(--fg)">${esc(x)}</div></div>`).join('')}
           <div class="alert warn small">${JOINER_COMBO.note}</div>
           <h3>Kode effect_op tiap hero</h3>
           <div class="scrollx"><table><thead><tr><th>Kode</th><th>Efek</th><th>Hero</th></tr></thead><tbody>
           ${EFFECT_OP.map(([c,e,h])=>`<tr><td><b class="mono">${esc(c)}</b></td><td class="small">${esc(e)}</td><td class="small muted">${esc(h)}</td></tr>`).join('')}</tbody></table></div>`)
        +card('Prioritas Investasi F2P','\u25c8',
          `<p class="muted small">Fokus maksimal 3 hero. Bintang > rarity (Epic 5\u2605 kalahkan Mythic 1\u2605).</p>
           ${F2P_ORDER.map(([t,d])=>`<div class="check note"><div><div class="t">${esc(t)}</div><div class="d">${esc(d)}</div></div></div>`).join('')}`)
        +card('Target Bintang & Skill per Fase','\u25c9',
          HERO_TARGETS.map((ph,i)=>`<details ${i===curPhase?'open':''}><summary>${esc(ph.phase)} ${(age!=null&&i===curPhase)?'<span class="pill f2p" style="margin-left:auto">fase kamu</span>':''}</summary><div class="dt">
            <div class="scrollx"><table><thead><tr><th>Hero</th><th>\u2605</th><th>Skill di-MAX</th><th>Aksi</th></tr></thead><tbody>
            ${ph.rows.map(([h,st,sk,act])=>`<tr><td><b>${esc(h)}</b></td><td>${esc(st)}</td><td class="small">${esc(sk)}</td><td class="small muted">${esc(act)}</td></tr>`).join('')}
            </tbody></table></div><div class="alert inf small">${esc(ph.note)}</div></div></details>`).join(''))
        +card('Shard & Bintang','\u25c6',
          `<div class="scrollx"><table><tbody>${STAR_SKILL_GATE.map(([s,v])=>`<tr><td><b>${esc(s)}</b></td><td class="small">${esc(v)}</td></tr>`).join('')}</tbody></table></div>
           <div class="muted small" style="margin-top:8px">Shard = naik BINTANG (buka level skill). 4\u2605 = breakpoint kunci (skill Lv5). Biaya shard PER naik-bintang: \u21921\u2605=10, \u21922\u2605=40, \u21923\u2605=115, \u21924\u2605=300, \u21925\u2605=600. Kumulatif: 4\u2605=465, 5\u2605=1.065. (kingshot.net) Mythic = shard Gold; Epic = Purple.</div>`)
        +card('Hero Roulette — pengaman gem','★',
          `<div class="alert bad small"><b>Trap gem #1.</b> 1 spin ≈ <b>1.500 gem</b> (13.500/10-spin). Milestone 5/15/35/70/120 spin (chest ke-120 = 50 fragment). Clear penuh 120-spin ≈ <b>162.000 gem</b> (≈ 5 bln nabung).</div>
           <div class="small muted">• <b>1 Lucky Token gratis/hari</b> selama event (3 hari) — tabung, tak kedaluwarsa.<br>• Milestone TIDAK reset harian → kalau kejar harus 1 hari. F2P: pakai token gratis + milestone murah (5/15) saja.<br>• <b>JANGAN spin Saul (Gen 1)</b> — target Zoe (Gen 2), lalu Petra (Gen 3).<br>• Spin di hari skor (HoG / Strongest Governor D2) = dapat poin event sekaligus.</div>
           <div class="alert inf small">Hero Hall (Platinum/Gold Key) = sistem terpisah → tabung key untuk Champagne Fair.</div>`);
    } else {
      html=card('Tier List','\u25a4',
          `<div class="row" style="margin-bottom:10px"><button class="btn ghost sm" data-fil="all">Semua</button><button class="btn ghost sm" data-fil="f2p">F2P</button><button class="btn ghost sm" data-fil="now">Tersedia kini</button></div>
           ${age!=null?`<div class="alert inf small">Server hari ${age} \u2192 generasi aktif <b>${gen}</b>.</div>`:''}
           <div class="alert ok small">⭐ <b>Set ★ hero yang kamu punya</b> di kolom "★ Punya" (0-5) → lineup di tab Lineup & Sekarang otomatis pakai hero terkuatmu + tunjuk leader.</div><div class="scrollx"><table><thead><tr><th>Hero</th><th>Tier</th><th>Tipe</th><th>Gen</th><th>★ Punya</th><th>Catatan</th></tr></thead><tbody id="herobody2"></tbody></table></div>`)
        +card('Hero Awal Server (Gen 1)','\u25cb',
          `<div class="scrollx"><table><thead><tr><th>Hero</th><th>Rarity</th><th>Cara dapat</th><th>Catatan</th></tr></thead><tbody>
           ${EARLY_HEROES.map(([n,r,c,note])=>`<tr><td><b>${esc(n)}</b></td><td class="small">${esc(r)}</td><td class="small">${esc(c)}</td><td class="small muted">${esc(note)}</td></tr>`).join('')}</tbody></table></div>`)
        +card('Build Detail per Hero','\u25a4',
          HERO_DETAIL.concat(HERO_DETAIL_ADV).map(h=>`<details><summary>${esc(h.n)} <span class="dim small" style="font-weight:400">\u00b7 ${esc(h.ty)} \u00b7 ${esc(h.role)}</span></summary><div class="dt">
            <div class="kv"><span>Sumber</span><b>${esc(h.gen)}</b></div><div class="kv"><span>Target \u2605</span><b>${esc(h.star)}</b></div>
            <div class="small" style="margin-top:6px"><b>Urutan naik skill (ke Lv5):</b><ol style="margin:4px 0 4px 18px;padding:0">${h.skills.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div>
            <div class="kv"><span>Exclusive Gear</span><b>${esc(h.gear)}</b></div><div class="muted small" style="margin-top:4px">${esc(h.note)}</div></div></details>`).join(''))
        +card('Segitiga Pasukan & Formasi','\u2694',
          `<div class="alert inf small">Infantry > Cavalry > Archer > Infantry. Tipe sama dalam formasi = +20% stat. Scout dulu, bawa counter.</div>
           <div class="scrollx"><table><thead><tr><th>Situasi</th><th>Inf / Cav / Archer</th></tr></thead><tbody>
           ${FORMATIONS.map(([a,b])=>`<tr><td>${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}</tbody></table></div>
           <div class="alert warn small">Gen 4+ pakai 1/10/89 tapi infantry tetap \u2265 5.000. Jangan pernah 0% suatu tipe.</div>`);
    }
    body.innerHTML=html;
    if(which==='lineup'){
      const sp=$('#sitpick',body),sc=$('#sitcard',body);
      sp.innerHTML=SITUATIONS.map(s=>`<button data-sit="${s.key}">${s.icon} ${esc(s.name)}</button>`).join('');
      const show=k=>{ const s=SITUATIONS.find(x=>x.key===k)||SITUATIONS[0]; sc.innerHTML=lineupCard(s,age); $$('#sitpick button',body).forEach(b=>b.classList.toggle('active',b.dataset.sit===s.key)); store.set('lastSit',s.key); };
      $$('#sitpick button',body).forEach(b=>b.onclick=()=>show(b.dataset.sit));
      show(store.get('lastSit','bear-trap'));
    }
    if(which==='daftar'){
      const fill=f=>{ const ag=profileAge().age;
        $('#herobody2',body).innerHTML=sorted.filter(h=>{ if(f==='f2p')return h.f2p; if(f==='now')return ag==null?true:(GEN_DAY[HERO_GEN[h.n]||1]<=ag); return true; }).map(h=>{
          const tc={S:'s',A:'a',B:'b',C:'c',Gen6:'gen6'}[h.t]; const g=HERO_GEN[h.n]||1; const cur=rosterStar(h.n);
          return `<tr><td><b>${esc(h.n)}</b> ${h.f2p?'<span class="pill f2p">F2P</span>':''}</td><td><span class="pill ${tc}">${h.t}</span></td><td class="small">${esc(h.ty)}</td><td class="small">Gen ${g}</td><td><select class="rost" data-h="${esc(h.n)}">${[0,1,2,3,4,5].map(n=>`<option value="${n}"${n===cur?' selected':''}>${n?n+'★':'—'}</option>`).join('')}</select></td><td class="small muted">${esc(h.note)}</td></tr>`;
        }).join('');
        $$('select.rost',body).forEach(sel=>sel.onchange=()=>{ const r=store.get('roster',{}); const v=+sel.value; if(v) r[sel.dataset.h]=v; else delete r[sel.dataset.h]; store.set('roster',r); }); };
      $$('[data-fil]',body).forEach(b=>b.onclick=()=>{ $$('[data-fil]',body).forEach(x=>x.classList.remove('active')); b.classList.add('active'); fill(b.dataset.fil); });
      fill('all');
    }
  }
  $$('#herosub button',el).forEach(b=>b.onclick=()=>sub(b.dataset.sub));
  let s0=store.get('heroSub','lineup'); if(!['lineup','prioritas','daftar'].includes(s0))s0='lineup';
  sub(s0);
}
