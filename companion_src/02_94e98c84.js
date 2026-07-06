/* ============================================================
   KINGSHOT COMPANION — APP (nav, live clock, renderers, init)
   ============================================================ */
const NAV=[
  {id:'sekarang',gi:'\u25d0',label:'Sekarang'},
  {id:'hero',gi:'\u25ce',label:'Hero'},
  {id:'event',gi:'\u2694',label:'Event'},
  {id:'bangun',gi:'\u25a3',label:'Bangun'},
  {id:'pets',gi:'\u2b22',label:'Pets'},
  {id:'island',gi:'\ud83c\udfdd',label:'Island'},
  {id:'kode',gi:'\u2726',label:'Kode'},
];

function navBtnHTML(n,cls){ return `<button class="navbtn" data-go="${n.id}"><span class="gi">${n.gi}</span><span class="nl">${esc(n.label)}</span></button>`; }
function updateSideProf(){
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
function buildNav(){
  $('#navlist').innerHTML=NAV.map(n=>navBtnHTML(n)).join('');
  /* mobile bottom-nav: Profil FIRST (bottom-LEFT — the single login/settings access on phones) */
  $('#mobnav').innerHTML=[{id:'profil',gi:'👤',label:'Profil'}].concat(NAV).map(n=>navBtnHTML(n)).join('');
  $$('[data-go]').forEach(b=>b.onclick=()=>activate(b.dataset.go));
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
    ${rosterAny()?(function(){const inf=rosterBest('Infantry'),cav=rosterBest('Cavalry'),arc=rosterBest('Archer'),list=[inf,cav,arc].filter(Boolean),ld=list.slice().sort((a,b)=>rosterStar(b.n)-rosterStar(a.n))[0],c=(l,h)=>l+': '+(h?esc(h.n)+' '+rosterStar(h.n)+'\u2605':'\u2014');return `<div class="lrow"><span class="lk">Punyamu</span>${c('Inf',inf)} \u00b7 ${c('Cav',cav)} \u00b7 ${c('Arc',arc)}${ld?' \u00b7 \ud83d\udc51 leader '+esc(ld.n):''}</div>`;})():''}
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
  if(age!=null&&age<1) age=null; /* future start date = treat as not connected */
  const w=dispNow(); const clock=pad(w.getUTCHours())+':'+pad(w.getUTCMinutes())+':'+pad(w.getUTCSeconds());
  const left=nextResetUTC()-ksClock.now().getTime();
  const hud=`<div class="nowhud">
    <div class="wmk">${age!=null?'H'+age:'KS'}</div>
    <span class="corner c1"></span><span class="corner c2"></span>
    <div class="inner">
      <div class="lbl" style="color:var(--accent);margin-bottom:8px">${age!=null?'Server Day \u00b7 Kingdom #'+esc(p.kingdom||'?'):'KINGSHOT13'}</div>
      <div class="dayrow">
        ${age!=null?`<div class="bigday">H${age}<small>${tc?'TC'+tc:''}</small></div>`:''}
        <div class="bigclock" id="hud_clock">${clock}<span class="wib" style="font-size:13px;color:var(--fg-mute)"> ${tzInfo().label}</span></div>
      </div>
      <div class="resetline">\u23f3 Reset harian ${tzInfo().reset} ${tzInfo().label} dalam <b id="hud_reset">${hms(left)}</b>${ksClock.synced?' \u00b7 <span style="color:var(--profit)">jam server tersinkron</span>':' \u00b7 jam perangkat'}</div>
    </div></div>`;

  if(age==null){
    el.innerHTML=hud+card('Mulai di sini','\u25b6',
      `<p class="muted">Masukkan Player ID sekali (seperti login) \u2014 app baca Kingdom, level TC & tanggal server otomatis, lalu memberi panduan "apa yang harus dilakukan sekarang".</p>
       <button class="btn" data-go="profil">Hubungkan Player ID \u2192</button>`,null,true);
    $$('[data-go]',el).forEach(b=>b.onclick=()=>activate(b.dataset.go));
    return;
  }

  /* active event advisories */
  const adv=activeAdvisories(start,age);
  const advHTML=adv.length? adv.map(a=>`<div class="alert ${a.cls} small"><b>${EV_EMOJI[a.type]||'\u25c6'} ${esc(a.name.split('(')[0].trim())} \u2014 ${a.status}:</b> ${a.lines[1]||a.lines[0]||''}</div>`).join('')
    : '<div class="muted small">Tidak ada event skor aktif. Fokus rutin & bangun pondasi.</div>';

  /* today lineup: daily bear + active combat */
  const by=k=>SITUATIONS.find(s=>s.key===k);
  let lineHTML=lineupCard(by('bear-trap'),age);
  const map={kvk:'kvk-rally'}; const seen=new Set();
  adv.forEach(a=>{ const sk=map[a.type]; if(sk&&!seen.has(a.type)){ seen.add(a.type); lineHTML+=lineupCard(by(sk),age); } });

  const plan=phasePlan(age,tc);
  const todayMs=MILESTONES.filter(m=>m.d===age);

  /* daily checklist */
  const today=ksClock.now().toISOString().slice(0,10);
  let stD=store.get('daily',{date:today,checked:{}}); if(stD.date!==today){ stD={date:today,checked:{}}; store.set('daily',stD); }
  const doneCount=Object.values(stD.checked).filter(Boolean).length;

  el.innerHTML=hud
    +(todayMs.length?card('Terbuka hari ini','\u2691',todayMs.map(m=>`<div class="alert ok small"><b>${esc(m.name)}</b> \u2014 ${esc(m.note||'')}</div>`).join(''),'milestone'):'')
    +card('Hitung Mundur Event','\u23f1',
      `<div class="kv"><span>\u23f3 Reset harian ${tzInfo().reset}</span><b class="hot mono" id="ev_reset">${hms(left)}</b></div>
       <div class="cdbar"><span class="cdfill" id="cdf_reset"></span></div>
       ${(function(){const et=evtTimes();const rows=SETTABLE_EVENTS.map(ev=>{const t=et[ev.id];if(!t)return '';const nx=nextRecurUTC(ev,t);if(!nx)return '';return `<div class="kv"><span>${ev.gi} ${esc(ev.n)} ${esc(evtTimeDisp(t))}</span><b class="hot mono ev-cd" data-ev="${ev.id}">${hms(nx-ksClock.now().getTime())}</b></div><div class="cdbar"><span class="cdfill cdf-ev" data-ev="${ev.id}"></span></div>`;}).filter(Boolean);return rows.length?rows.join(''):'<div class="kv"><span>\ud83d\udc3b Jam event alliance</span><span class="small muted">set jam di tab Profil</span></div>';})()}
       ${adv.filter(a=>a.tpl&&a.tpl.battleWIB&&a.di===a.tpl.len-1).map(a=>`<div class="kv"><span>\u2694 ${esc(a.name.split('(')[0].trim())} \u2014 battle ${tzInfo().battle}</span><b class="hot mono" id="ev_battle">${hms(battleUTC()-ksClock.now().getTime())}</b></div>`).join('')}
       <div class="lbl" style="margin:12px 0 4px">Mingguan terjadwal</div>
       ${RECURRING_WEEKLY.map(r=>{const nx=nextWibDay(r.dows,r.settable?evtTimes()[r.id]:null);return `<div class="kv"><span>${r.gi} ${esc(r.n)}<div class="dim small">${esc(r.note)}</div></span><b>${nx.days===0?'hari ini':nx.days+' hari lagi'} \u00b7 ${esc(nx.label)}</b></div>`;}).join('')}
       <div class="lbl" style="margin:12px 0 4px">Harian / rotasi</div>
       ${RECURRING_DAILY.map(r=>`<div class="kv"><span>${r.gi} ${esc(r.n)}</span><span class="small muted" style="text-align:right">${esc(r.note)}</span></div>`).join('')}
       <div class="muted small" style="margin-top:8px">Jam pasti per-kingdom \u2014 cek tab Events di game. Tanggal mingguan = perkiraan hari berikutnya.</div>`,'live \u00b7 semua event',true)
    +card('Lakukan SEKARANG','\u25c9',
      `<div class="lbl" style="margin-bottom:6px">Event skor aktif</div>${advHTML}
       <div id="now_live"></div>
       <div class="lbl" style="margin:16px 0 4px">Lineup hari ini \u2014 ikut event aktif</div>${lineHTML}`,'auto \u00b7 reset '+tzInfo().reset,true)
    +card('Fokus fase ini','\u25c8',plan.slice(0,4).map(x=>`<div class="check note"><div class="d" style="color:var(--fg)">${x}</div></div>`).join(''))
    +card('Checklist Harian','\u2713',
      `<p class="muted small">Reset otomatis tiap 07:00 WIB. Selesai <b id="dc_count" class="num">${doneCount}</b>/${DAILY_TASKS.length}. <button class="btn ghost sm" id="dc_reset">reset</button></p>
       <div class="cdbar" style="margin:0 0 12px"><span class="cdfill" id="dc_bar" style="width:${Math.round(100*doneCount/(DAILY_TASKS.length||1))}%"></span></div><div id="dc_list"></div>
       <div class="lbl" style="margin:18px 0 4px">Mingguan / event</div>${WEEKLY_TASKS.map(([t,d])=>`<div class="check note"><div><div class="t">${t}</div><div class="d">${d}</div></div></div>`).join('')}`)
    +`<div class="card"><div class="card-b"><div class="lbl" style="margin-bottom:8px">Buka cepat</div><div class="qgrid">
        <div class="qbtn" data-go="hero"><span class="qi">\u25ce</span><span class="ql">Hero & Lineup</span></div>
        <div class="qbtn" data-go="event"><span class="qi">\u2694</span><span class="ql">Event & Kalender</span></div>
        <div class="qbtn" data-go="bangun"><span class="qi">\u25a3</span><span class="ql">Bangun & Progres</span></div>
        <div class="qbtn" data-go="kode"><span class="qi">\u2726</span><span class="ql">Gift Code</span></div>
      </div></div></div>`;

  /* daily checklist wiring */
  const list=$('#dc_list',el);
  DAILY_TASKS.forEach(([t,d],i)=>{
    const id='d'+i,on=!!stD.checked[id];
    const div=document.createElement('label'); div.className='check'+(on?' done':'');
    div.innerHTML=`<input type="checkbox" ${on?'checked':''}><div><div class="t">${esc(t)}</div><div class="d">${esc(d)}</div></div>`;
    div.querySelector('input').onchange=e=>{ stD.checked[id]=e.target.checked; store.set('daily',stD); div.classList.toggle('done',e.target.checked);
      const dc=Object.values(stD.checked).filter(Boolean).length; $('#dc_count').textContent=dc;
      const bar=$('#dc_bar'); if(bar) bar.style.width=Math.round(100*dc/(DAILY_TASKS.length||1))+'%'; };
    list.appendChild(div);
  });
  $('#dc_reset',el).onclick=()=>{ store.set('daily',{date:today,checked:{}}); renderSekarang(); };
  $$('[data-go]',el).forEach(b=>b.onclick=()=>activate(b.dataset.go));
  fillNowLive(age);
}
/* "Lakukan SEKARANG" ikut menampilkan event mingguan kingdom yang berjalan HARI INI
   (rotasi global kingshot.net, di-gate umur server) — bukan cuma event skor. */
async function fillNowLive(age){
  const host=$('#now_live'); if(!host) return;
  try{ if(typeof ksLiveEvents==='function') await ksLiveEvents(); }catch(e){}
  const wk=(typeof wkEventsOnDate==='function')?wkEventsOnDate(todayMidnight()):[];
  const open=wk.filter(e=>{ const min=(typeof WEEKLY_MIN!=='undefined')?WEEKLY_MIN[e.titleKey]:null;
    return !(min!=null&&age!=null&&age<min); });
  const h2=$('#now_live'); if(!h2) return; /* tab may have changed during fetch */
  if(!open.length){ h2.innerHTML=''; return; }
  h2.innerHTML='<div class="lbl" style="margin:14px 0 4px">Event kingdom berjalan hari ini</div>'
    +open.map(e=>{ const g=(typeof WEEKLY_GUIDE!=='undefined'&&WEEKLY_GUIDE[e.titleKey])||WEEKLY_GUIDE_DEFAULT;
      return `<div class="check note"><div><div class="t">${esc(e.title)}</div><div class="d">${esc(g)}</div></div></div>`; }).join('')
    +'<div class="muted small" style="margin-top:4px">Rotasi global kingshot.net — kingdom muda bisa beda; acuan final tab Events in-game. Detail: tab Event → 📡 Jadwal Live.</div>';
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
