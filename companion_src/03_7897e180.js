/* ============================================================
   KINGSHOT COMPANION — ENGINE (utils, clock, API, advisories)
   Reuses proven logic: official player API + MD5 sign, UTC clock sync,
   event advisory engine, gift-code live fetch + redeem.
   ============================================================ */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const fmt=n=>{n=Number(n)||0;return n.toLocaleString('id-ID');};
const esc=v=>(''+(v==null?'':v)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parseNum=v=>{ if(v==null) return 0; v=(''+v).replace(/[.\s]/g,'').replace(/,/g,'.'); const n=parseFloat(v); return isNaN(n)?0:n; };
/* ── Multi-profil: kunci per-profil disimpan ks_p_<pid>_<key>; sisanya global.
   (lastSit sengaja TIDAK per-profil — ephemeral & ada di ksSync._skip.) ── */
const PROFILE_KEYS=new Set(['profile','roster','trackProg','buildDone','codesDone',
  'islandMarks','islandSeedV','daily','events','notifFlags','evLog','tcOwned','tcBuffs']);
function _ksActivePid(){ try{ return JSON.parse(localStorage.getItem('ks_activePid'))||''; }catch(e){ return ''; } }
function _ksRealKey(k){ return PROFILE_KEYS.has(k) ? ('p_'+_ksActivePid()+'_'+k) : k; }
const store={
  get(k,d){ try{const v=localStorage.getItem('ks_'+_ksRealKey(k));return v==null?d:JSON.parse(v);}catch(e){return d;} },
  set(k,v){ const rk=_ksRealKey(k); try{localStorage.setItem('ks_'+rk,JSON.stringify(v));}catch(e){}
    if(typeof ksSync!=='undefined'&&ksSync._skip.indexOf('ks_'+rk)<0) ksSync.schedule(); }
};
/* Identitas server hidup di DUA tempat: daftar global `profiles` (meta: pid/nick/
   kingdom/tc/start) dan objek `profile` per-slot yang dibaca profileAge(). Profil
   yang lahir cuma sebagai meta (lewat "+ Tambah" atau datang via sync) punya slot
   KOSONG → begitu dipakai, umur server & jadwal HoG hilang. Isi field identitas yang
   masih kosong dari meta; setelan per-profil (mode, eventTimes) tidak disentuh, dan
   slot yang sudah terisi menang (dia yang paling tahu servernya sendiri). */
function seedProfileFromMeta(pid){
  try{
    const meta=(store.get('profiles',[])||[]).find(x=>x&&String(x.pid)===String(pid));
    if(!meta) return;
    const cur=store.get('profile',{})||{}; const next=Object.assign({},cur); let changed=false;
    ['pid','nick','kingdom','tc','start'].forEach(k=>{
      const v=(k==='pid')?String(pid):meta[k];
      if(v&&!next[k]){ next[k]=v; changed=true; }
    });
    if(changed) store.set('profile',next);
  }catch(e){}
}
/* Profil aktif & migrasi sekali-jalan (idempotent). */
function setActiveProfile(pid){ pid=String(pid); try{ localStorage.setItem('ks_activePid',JSON.stringify(pid)); }catch(e){}
  seedProfileFromMeta(pid);   /* HARUS setelah activePid diganti — store menulis ke slot baru */
  /* kalender tiap server punya umur sendiri — jangan buka server baru di bulan yang
     kebetulan lagi di-scroll pada server lama */
  if(typeof _calOffset!=='undefined') _calOffset=0;
  if(typeof activate==='function') activate(store.get('lastTab','sekarang')); }
function migrateProfiles(){
  try{
    if(localStorage.getItem('ks_profilesV')) return;            /* sudah migrasi */
    /* profil sudah ada (mis. datang via sync di perangkat baru) → jangan clobber */
    if(localStorage.getItem('ks_profiles')){ localStorage.setItem('ks_profilesV','1'); return; }
    let oldProfile={}; try{ oldProfile=JSON.parse(localStorage.getItem('ks_profile')||'{}')||{}; }catch(e){}
    const pid0=String(oldProfile.pid||'330300846');
    /* pindahkan data per-profil lama → slot pid0 (jika belum ada) */
    PROFILE_KEYS.forEach(k=>{ const oldK='ks_'+k, newK='ks_p_'+pid0+'_'+k;
      const ov=localStorage.getItem(oldK);
      if(ov!=null && localStorage.getItem(newK)==null){ localStorage.setItem(newK,ov); localStorage.removeItem(oldK); }
    });
    /* daftar profil: pid0 (pakai meta lama) + 3 seed unik */
    const seeds=['343522603','344771670','330300846'];
    const order=[pid0].concat(seeds.filter(s=>s!==pid0));
    const profiles=order.map(p=>p===pid0
      ? {pid:pid0,nick:oldProfile.nick||'',kingdom:oldProfile.kingdom||'',tc:oldProfile.tc||'',start:oldProfile.start||''}
      : {pid:p,nick:'',kingdom:'',tc:'',start:''});
    localStorage.setItem('ks_profiles',JSON.stringify(profiles));
    if(localStorage.getItem('ks_activePid')==null) localStorage.setItem('ks_activePid',JSON.stringify(pid0));
    localStorage.setItem('ks_profilesV','1');
  }catch(e){ console.warn('migrateProfiles',e); }
}
/* Island TERPISAH PER PROFIL: tiap profil auto-seed template komunitas (titik merah/peti)
   sebagai dasar, lalu edit (collected/cactus/path) tersimpan khusus profil itu via store
   yang sudah sadar-profil. Tidak ada base bersama / penyatuan (hindari kehilangan data). */

/* ── Sinkron otomatis antar perangkat ──
   Backend: textdb.online (gratis, tanpa daftar, CORS penuh) — satu "kode sinkron"
   acak 128-bit = satu slot data bersama. Perangkat dengan kode sama saling sinkron:
   PULL saat app dibuka, PUSH (debounce 4 dtk) tiap ada perubahan tersimpan.
   Strategi konflik: last-write-wins per snapshot (cukup untuk 1 pemain multi-HP).
   Kunci volatil (cache yang bisa diambil ulang / preferensi per-perangkat) di-skip. */
const ksSync={
  _skip:['ks_syncMeta','ks_liveEvents','ks_kdates','ks_clockOffset','ks_clockSyncAt','ks_clockNudge','ks_islandZoom','ks_lang','ks_lastTab','ks_evSub','ks_lastSit','ks_onboard','ks_tz','ks_visitPing','ks_activePid','ks_profilesV'],
  _t:null,
  meta(){ try{ return JSON.parse(localStorage.getItem('ks_syncMeta')||'null'); }catch(e){ return null; } },
  _saveMeta(m){ try{ localStorage.setItem('ks_syncMeta',JSON.stringify(m)); }catch(e){} },
  on(){ const m=this.meta(); return !!(m&&m.code); },
  newCode(){ const a=new Uint8Array(16); crypto.getRandomValues(a);
    return 'KS2-'+Array.from(a,b=>('0'+b.toString(16)).slice(-2)).join('').toUpperCase(); },
  collect(){ const data={};
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i);
      if(k&&k.indexOf('ks_')===0&&this._skip.indexOf(k)<0) data[k]=localStorage.getItem(k); }
    return data; },
  schedule(){ if(!this.on()) return; clearTimeout(this._t);
    this._t=setTimeout(()=>this.push(),4000); },
  /* server sendiri (Cloudflare Worker + D1) = jalur UTAMA; textdb = cadangan */
  async _apiGet(code){ try{
    const r=await Promise.race([fetch(KS_DATA_API+'/sync/'+encodeURIComponent(code)+'?t='+Date.now()),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('t')),9000))]);
    if(!r.ok) return null; const tx=(await r.text()).trim(); if(!tx) return null;
    const j=JSON.parse(tx); return (j&&j.data)?j:null; }catch(e){ return null; } },
  async _apiPut(code,payload){ try{
    const r=await Promise.race([fetch(KS_DATA_API+'/sync/'+encodeURIComponent(code),{method:'PUT',body:JSON.stringify(payload)}),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('t')),9000))]);
    return r.ok; }catch(e){ return false; } },
  async _tdbGet(code){ try{
    const r=await fetch('https://textdb.online/'+encodeURIComponent(code)+'?t='+Date.now());
    if(!r.ok) return null; const tx=(await r.text()).trim(); if(!tx) return null;
    const j=JSON.parse(tx); return (j&&j.data)?j:null; }catch(e){ return null; } },
  async _tdbPut(code,payload){ try{
    const r=await fetch('https://textdb.online/update',{method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:'key='+encodeURIComponent(code)+'&value='+encodeURIComponent(JSON.stringify(payload))});
    return r.ok; }catch(e){ return false; } },
  async push(){
    const m=this.meta(); if(!m||!m.code) return false;
    const payload={_v:1,ts:Date.now(),data:this.collect()};
    const okApi=await this._apiPut(m.code,payload);
    const ok=okApi||await this._tdbPut(m.code,payload);
    if(ok){ m.ts=payload.ts; m.at=Date.now(); m.err=''; this._saveMeta(m); this._badge(); return true; }
    m.err='push'; this._saveMeta(m); this._badge(); return false;
  },
  /* returns: 'off' | 'applied' | 'current' | 'empty' | 'err' */
  async pull(){
    const m=this.meta(); if(!m||!m.code) return 'off';
    const api=await this._apiGet(m.code);
    const tdb=api?null:await this._tdbGet(m.code); /* cadangan hanya kalau server kosong/gagal */
    const j=api||tdb;
    if(!j){ /* dua-duanya kosong ≠ error jaringan; anggap slot kosong */
      m.at=Date.now(); this._saveMeta(m); this._badge(); return 'empty'; }
    /* migrasi: data lama hanya ada di textdb → angkat ke server */
    if(!api&&tdb) this._apiPut(m.code,tdb);
    if((j.ts||0)>(m.ts||0)){
      for(const k in j.data){ if(k.indexOf('ks_')===0&&this._skip.indexOf(k)<0&&typeof j.data[k]==='string') localStorage.setItem(k,j.data[k]); }
      m.ts=j.ts; m.at=Date.now(); m.err=''; this._saveMeta(m); this._badge();
      return 'applied';
    }
    m.at=Date.now(); m.err=''; this._saveMeta(m); this._badge();
    return 'current';
  },
  async enable(){ const code=this.newCode(); this._saveMeta({code,ts:0,at:0,err:''});
    const ok=await this.push(); if(!ok){ localStorage.removeItem('ks_syncMeta'); return null; } return code; },
  async connect(code){ code=(code||'').trim(); if(!code) return 'bad';
    this._saveMeta({code,ts:0,at:0,err:''});
    const res=await this.pull();
    if(res==='err'){ localStorage.removeItem('ks_syncMeta'); return 'err'; }
    if(res==='empty'){ await this.push(); return 'pushed'; } /* slot kosong → unggah data lokal */
    return res; /* 'applied' */
  },
  disconnect(){ clearTimeout(this._t); localStorage.removeItem('ks_syncMeta'); this._badge(); },
  _badge(){ const b=document.getElementById('syncbadge'); if(!b) return;
    const m=this.meta();
    b.textContent=!m?'':(m.err?'🔁⚠':'🔁'); b.title=!m?'':(m.err?'Sinkron: gangguan jaringan':'Sinkron aktif'); }
};
function pad(n){return String(n).padStart(2,'0');}
const ID_MON=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const ID_MON_FULL=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const ID_DOW=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const WIB_OFFSET_MS=7*3600000;
const KVK_BATTLE_UTC_HOUR=12;

/* ── Authoritative clock (server UTC; daily reset 00:00 UTC = 07:00 WIB) ── */
const ksClock={
  offset:0, nudge:0, synced:false,
  load(){ this.nudge=Number(store.get('clockNudge',0))||0;
    /* Offset tersimpan hanya dipercaya kalau (a) dibuat oleh aturan KORROBORASI
       yang baru (clockOffsetV=2) dan (b) umurnya < 24 jam (jam perangkat bisa
       sudah dibetulkan sejak itu). Penanda versi itu penting: offset dari aturan
       LAMA bisa berasal dari satu sumber yang salah — persis yang terjadi 21 Jul
       2026, saat timeapi.io meleset -9 menit dan nilainya mengendap di perangkat
       user. Tanpa pembatalan ini, offset beracun itu tetap hidup 24 jam dan tiap
       redeem gagal walau kodenya sudah benar. */
    const v=Number(store.get('clockOffsetV',0))||0;
    const at=Number(store.get('clockSyncAt',0))||0;
    if(v>=2&&at&&Date.now()-at<86400000){ this.offset=Number(store.get('clockOffset',0))||0; this.synced=true; }
    else { this.offset=0; this.synced=false; }
  },
  now(){ return new Date(Date.now()+this.offset+this.nudge*60000); },
  /* Waktu untuk MENANDATANGANI permintaan API — offset server saja, TANPA nudge.
     nudge = koreksi manual milik user untuk TAMPILAN/hitungan tanggal; kalau ikut
     masuk ke sign, `time` yang dikirim jadi bergeser sesuai selera user. */
  signNow(){ return Date.now()+this.offset; },
  setNudge(min){ this.nudge=Number(min)||0; store.set('clockNudge',this.nudge); },
  _race(u){ return Promise.race([fetch(u),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),6000))]); },
  _applyOffset(off){ if(!isFinite(off)) return false; this.offset=off;
    store.set('clockOffset',off); store.set('clockSyncAt',Date.now()); store.set('clockOffsetV',2); this.synced=true; return true; },
  /* sync gagal = tak ada yang lebih tahu dari jam perangkat. Buang offset yang
     tak terkonfirmasi, jangan biarkan nilai lama menyetir tanda tangan API. */
  _dropOffset(){ this.offset=0; this.synced=false; store.set('clockOffset',0); store.set('clockOffsetV',0); },
  /* Ukur SATU sumber → offset (waktu server − jam perangkat), dikoreksi dengan
     titik tengah round-trip supaya latensi jaringan tak terhitung sebagai selisih. */
  async _probe(fn){
    try{
      const t0=Date.now(); const v=await fn.call(this); const t1=Date.now();
      if(typeof v!=='number'||!isFinite(v)) return null;
      return v-(t0+t1)/2;
    }catch(e){ return null; }
  },
  /* Sumber-sumber independen. Waktu selalu diambil dari BODY, tak pernah dari
     header `Date`: header itu bukan CORS-safelisted dan tidak di-expose, jadi di
     browser selalu null — app dulu mengandalkannya dan diam-diam gagal terus. */
  _sources:[
    async function(){ const r=await this._race(KS_DATA_API+'/time'); const j=await r.json();
      return (j&&typeof j.now==='number')?j.now:NaN; },
    /* cloudflare cdn-cgi/trace: teks "ts=<epoch detik>", CORS terbuka, akurat */
    async function(){ const r=await this._race('https://cloudflare.com/cdn-cgi/trace'); const t=await r.text();
      const m=String(t).match(/ts=([\d.]+)/); return m?Math.round(parseFloat(m[1])*1000):NaN; },
    async function(){ const r=await this._race('https://timeapi.io/api/time/current/zone?timeZone=UTC'); const j=await r.json();
      if(j&&j.year) return Date.UTC(j.year,(j.month||1)-1,j.day||1,j.hour||0,j.minute||0,j.seconds||0,j.milliSeconds||0);
      if(j&&j.dateTime) return Date.parse(j.dateTime.replace(/(\.\d{3})\d*$/,'$1')+'Z');
      return NaN; },
  ],
  /* Dua sumber dianggap sepakat bila selisihnya <= 30 detik. */
  _agreeMs:30000,
  /* Sinkronisasi butuh KORROBORASI: minimal dua sumber independen yang sepakat.

     Kenapa seketat itu — jendela `time` API gift code Century menyempit dari
     ±24 jam jadi ~±5 menit (terukur 21 Jul 2026: ±300 dtk diterima, ±600 dtk
     ditolak "time Expired"). Pada tanggal itu /time worker produksi balas 404
     dan satu-satunya sumber tersisa, timeapi.io, meleset -554 detik: app memasang
     offset -9 menit dan SEMUA redeem gagal, padahal jam perangkat sudah benar.
     Dengan jendela sesempit ini, offset SALAH lebih berbahaya daripada tanpa
     offset — kalau ragu, percayai jam perangkat. */
  async sync(){
    const offs=(await Promise.all(this._sources.map(f=>this._probe(f))))
      .filter(o=>o!==null&&isFinite(o));
    /* ambil kelompok terbesar yang saling sepakat — bukan rata-rata, supaya satu
       sumber menyimpang tak bisa menarik hasilnya */
    let best=[];
    for(const c of offs){ const grp=offs.filter(o=>Math.abs(o-c)<=this._agreeMs);
      if(grp.length>best.length) best=grp; }
    if(best.length<2){ this._dropOffset(); return false; }
    const sorted=best.slice().sort((a,b)=>a-b);
    return this._applyOffset(sorted[Math.floor(sorted.length/2)]);
  }
};
function daysBetween(a,b){ return Math.floor((b-a)/86400000); }
function todayMidnight(){ const n=ksClock.now(); return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate())); }
function wibNow(){ return new Date(ksClock.now().getTime()+WIB_OFFSET_MS); }
function nextResetUTC(){ const n=ksClock.now(); return Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate()+1); }
function battleUTC(){ const n=ksClock.now(); return Date.UTC(n.getUTCFullYear(),n.getUTCMonth(),n.getUTCDate(),KVK_BATTLE_UTC_HOUR); }
/* ── Alliance-set event times (R4/R5 announce the hour) ──
   Stored as profile.eventTimes[id] = "HH:MM" in WIB. Events come from the
   RECURRING_* data flagged settable:true (daily=every day; else dows). */
const SETTABLE_EVENTS=(typeof RECURRING_DAILY!=='undefined'?RECURRING_DAILY:[]).concat(typeof RECURRING_WEEKLY!=='undefined'?RECURRING_WEEKLY:[]).filter(e=>e&&e.settable);
function evtTimes(){ const p=store.get('profile',{}); const t=Object.assign({},p.eventTimes||{}); if(p.bearTime&&t.bear===undefined) t.bear=p.bearTime; /* migrate old single field */ return t; }
/* Gaya main per-profil: 'f2p' (default) atau 'p2w'. User main 2 server (1 F2P, 1 P2W). */
function curMode(){ return (store.get('profile',{}).mode==='p2w')?'p2w':'f2p'; }
function isP2W(){ return curMode()==='p2w'; }
/* Next occurrence (UTC ms) of a settable event at its WIB time. */
function nextRecurUTC(ev,hhmm){ if(!ev||!hhmm) return null; const a=hhmm.split(':'); const wh=parseInt(a[0]); const wm=parseInt(a[1])||0; if(isNaN(wh)) return null;
  const days=ev.daily?[0,1,2,3,4,5,6]:(ev.dows||[]); if(!days.length) return null; const now=ksClock.now().getTime(); let best=null;
  for(let off=0;off<=8;off++){ const wib=new Date(ksClock.now().getTime()+WIB_OFFSET_MS+off*86400000); if(days.indexOf(wib.getUTCDay())>=0){ const t=Date.UTC(wib.getUTCFullYear(),wib.getUTCMonth(),wib.getUTCDate(),wh-7,wm,0); if(t>now&&(best===null||t<best)) best=t; } }
  return best; }
/* Show a WIB-entered time in the active display timezone. */
function evtTimeDisp(hhmm){ if(!hhmm) return ''; if(DISPLAY_TZ!=='UTC') return hhmm+' WIB'; const a=hhmm.split(':'); const h=(((parseInt(a[0])||0)-7)%24+24)%24; return pad(h)+':'+pad(parseInt(a[1])||0)+' UTC'; }
/* ── Display timezone: WIB (default) ⇄ UTC. Reset = 00:00 UTC = 07:00 WIB; KvK battle = 12:00 UTC = 19:00 WIB. ── */
let DISPLAY_TZ=store.get('tz','WIB');
const TZINFO={ WIB:{off:7*3600000,label:'WIB',reset:'07:00',battle:'19:00'}, UTC:{off:0,label:'UTC',reset:'00:00',battle:'12:00'} };
function tzInfo(){ return TZINFO[DISPLAY_TZ]||TZINFO.WIB; }
function dispNow(){ return new Date(ksClock.now().getTime()+tzInfo().off); }
function setTZ(t){ DISPLAY_TZ=(t==='UTC')?'UTC':'WIB'; store.set('tz',DISPLAY_TZ); const b=document.getElementById('tztoggle'); if(b) b.textContent=DISPLAY_TZ; if(typeof renderTopClock==='function') renderTopClock(); if(typeof activate==='function') activate(store.get('lastTab','sekarang')); }
function hms(ms){ if(ms<0)ms=0; const s=Math.floor(ms/1000); return pad(Math.floor(s/3600))+':'+pad(Math.floor(s/60)%60)+':'+pad(s%60); }
/* KONVENSI HARI SERVER (sejak 2026-06-11): 1-based, sama dengan game —
   hari server buka = Hari ke-1. Terverifikasi via HoG-2 Kingdom #2114:
   model "HoG mulai hari 6, siklus 14" + buka 27 Mei → HoG-2 = H20 = 15 Juni,
   persis seperti yang tampil in-game (konvensi lama 0-based meleset 1 hari).
   addDaysFmt/ISO menerima NOMOR HARI 1-based → tanggal = start + (n-1). */
function addDaysFmt(start,n){ const d=new Date(start.getTime()+(n-1)*86400000); return d.getUTCDate()+' '+ID_MON[d.getUTCMonth()]+' '+d.getUTCFullYear(); }
function addDaysISO(start,n){ const d=new Date(start.getTime()+(n-1)*86400000); return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate()); }
function nextWibDay(dows,hhmm){ const wib=wibNow(); const cur=wib.getUTCDay(); let best=99; for(const dw of dows){ let add=(dw-cur+7)%7;
  if(add===0&&hhmm){ const a=hhmm.split(':'); const evMin=(+a[0])*60+(+a[1]||0); if(wib.getUTCHours()*60+wib.getUTCMinutes()>=evMin) add=7; } /* today's occurrence already passed */
  if(add<best)best=add; } const d=new Date(wib.getTime()+best*86400000); return {days:best,date:d,label:ID_DOW[d.getUTCDay()].slice(0,3)+' '+d.getUTCDate()+' '+ID_MON[d.getUTCMonth()]}; }
function utcToWibTime(hhmm){ if(!hhmm) return hhmm; const a=hhmm.split(':'); return pad(((+a[0])+7)%24)+':'+pad(+a[1]||0); }
/* Jam event disimpan internal dalam WIB. Konversi ke/dari zona TAMPILAN aktif (WIB⇄UTC)
   supaya input jam mengikuti toggle — hilangkan kebingungan "ini UTC atau lokal". */
function wibToDisp(hhmm){ if(!hhmm||DISPLAY_TZ!=='UTC') return hhmm; const a=hhmm.split(':'); return pad((((parseInt(a[0])||0)-7)%24+24)%24)+':'+pad(parseInt(a[1])||0); }
function dispToWib(hhmm){ if(!hhmm||DISPLAY_TZ!=='UTC') return hhmm; const a=hhmm.split(':'); return pad(((parseInt(a[0])||0)+7)%24)+':'+pad(parseInt(a[1])||0); }
function profileAge(){ const p=store.get('profile',{}); if(!p.start) return {p,start:null,age:null,tc:0}; const start=new Date(p.start+'T00:00:00Z'); return {p,start,age:daysBetween(start,todayMidnight())+1,tc:parseInt(p.tc)||0}; }

/* ── MD5 (for signing official API) ── */
function md5(str){
  function rh(n){let s='',j;for(j=0;j<=3;j++)s+=((n>>(j*8+4))&0x0F).toString(16)+((n>>(j*8))&0x0F).toString(16);return s;}
  function ad(x,y){const l=(x&0xFFFF)+(y&0xFFFF);const m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF);}
  function rl(n,c){return(n<<c)|(n>>>(32-c));}
  function cmn(q,a,b,x,s,t){return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
  function c2b(s){const bin=[],mask=(1<<8)-1;let i;for(i=0;i<s.length*8;i+=8)bin[i>>5]|=(s.charCodeAt(i/8)&mask)<<(i%32);return bin;}
  const x=c2b(str),len=str.length*8;
  x[len>>5]|=0x80<<(len%32); x[(((len+64)>>>9)<<4)+14]=len;
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878,i;
  for(i=0;i<x.length;i+=16){
    const oa=a,ob=b,oc=c,od=d;
    a=ff(a,b,c,d,x[i+0],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
    a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
    a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
    a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
    a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i+0],20,-373897302);
    a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
    a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
    a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
    a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
    a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
    a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i+0],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
    a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
    a=ii(a,b,c,d,x[i+0],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
    a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
    a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
    a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
    a=ad(a,oa);b=ad(b,ob);c=ad(c,oc);d=ad(d,od);
  }
  return rh(a)+rh(b)+rh(c)+rh(d);
}

/* ── Player API: DIHAPUS OLEH CENTURY (terverifikasi 21 Jul 2026) ──
   /api/player sekarang balas 404, dan halaman 404-nya tidak mengirim header
   CORS — di browser fetch-nya REJECT, bukan sekadar gagal. Itulah "Gagal
   terhubung" yang muncul saat redeem. Situs gift-code resmi Century juga sudah
   tidak memanggilnya sama sekali: mereka kini meminta user MENGETIK Kingdom.
   Jadi nickname/Kingdom/TC tidak bisa lagi dideteksi dari Player ID.

   Fungsi dipertahankan (dipanggil dari beberapa tempat) tapi gagal LOKAL —
   menembak endpoint mati tiap app dibuka cuma menambah jeda dan error konsol. */
const KS_PLAYER_API_GONE=true;
async function ksPlayerLookup(){
  throw new Error('ksPlayerLookup: /api/player dihapus Century — Kingdom harus diisi manual');
}
async function fetchKingdomDate(kid){
  /* flag "ini cuma perkiraan" harus menggambarkan lookup INI — dulu hanya di-reset di
     cabang fallback, padahal jalur seed/cache/exact return lebih dulu, jadi label
     "(perkiraan ±2-3 hari)" nempel dari server sebelumnya. */
  window._kdateEst=false;
  if(KINGDOM_DATES[String(kid)]) return KINGDOM_DATES[String(kid)];
  const cached=store.get('kdates',{}); if(cached[String(kid)]) return cached[String(kid)];
  const target='https://kingshot.net/api/kingdom-tracker?kingdomId='+kid;
  /* jalur 1 = server sendiri (KS_PROXIES[0]); proxy publik hanya cadangan */
  for(const px of KS_PROXIES){
    try{
      const r=await ksFT(px(target)); const j=await r.json();
      const srv=j&&j.data&&j.data.servers&&j.data.servers[0];
      if(srv&&srv.openTime){ const dt=new Date(srv.openTime);   /* Hari-1 = tanggal buka menurut TANGGAL UTC (terverifikasi K2114: HoG#2=day20=15 Jun ⇒ day1=27 Mei = tanggal UTC openTime). K2184 17:45Z ⇒ 11 Jun; umur/HoG dihitung server-wide, sama utk semua ID di server itu. */
        const iso=dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)+'-'+pad(dt.getUTCDate());
        KINGDOM_DATES[String(kid)]=iso; cached[String(kid)]=iso; store.set('kdates',cached); return iso; }
    }catch(e){}
  }
  /* offline fallback: interpolate from the embedded anchor table (±2-3 hari).
     NOT cached, so a later online lookup replaces it with the exact date. */
  if(typeof KINGDOM_ANCHORS!=='undefined'&&KINGDOM_ANCHORS.length>1){
    const k=+kid, A=KINGDOM_ANCHORS;
    if(k>=A[0][0]){
      let t;
      if(k>A[A.length-1][0]){ /* newer than the table: extrapolate the last slope */
        const a=A[A.length-2], b=A[A.length-1];
        t=Date.parse(b[1])+(Date.parse(b[1])-Date.parse(a[1]))*(k-b[0])/(b[0]-a[0]);
      }else{
        let lo=A[0], hi=A[A.length-1];
        for(const p of A){ if(p[0]<=k) lo=p; if(p[0]>=k){ hi=p; break; } }
        t=hi[0]===lo[0]?Date.parse(lo[1])
          :Date.parse(lo[1])+(Date.parse(hi[1])-Date.parse(lo[1]))*(k-lo[0])/(hi[0]-lo[0]);
      }
      const dt=new Date(t); window._kdateEst=true;   /* tanggal UTC, konsisten dgn jalur exact */
      return dt.getUTCFullYear()+'-'+pad(dt.getUTCMonth()+1)+'-'+pad(dt.getUTCDate());
    }
  }
  return null;
}
/* Redeem one code. Returns {cls,txt}. */
/* Protokol Century per 21 Jul 2026, disadap langsung dari situs resmi
   ks-giftcode.centurygame.com lalu direproduksi dari nol:

     POST /api/gift_code   sign=<md5>&fid=..&cdk=..&kid=..&time=<epoch DETIK>
     sign = md5( params urut abjad, "k=v" digabung "&", + KS_SALT )

   Tiga perubahan dari protokol lama:
   - Langkah "login" ke /api/player DIHAPUS oleh Century. Endpoint-nya kini 404,
     dan halaman 404-nya tidak mengirim header CORS, jadi di browser fetch-nya
     REJECT \u2014 itulah "Gagal terhubung" yang muncul ke user (dari CLI cuma
     kelihatan 404 biasa karena CORS tidak ditegakkan di sana).
   - `kid` (Kingdom) jadi wajib; tanpa/salah \u2192 40020 USER INFO ERROR.
   - `time` dalam DETIK; kalau dikirim milidetik \u2192 msg "time Expired". */
async function ksRedeem(fid,code,kid){
  kid=String(kid==null?'':kid).trim();
  /* gagal cepat: tanpa kid server pasti menolak, jangan buang jatah rate limit
     (30/menit) dan jangan tampilkan error server yang membingungkan. */
  if(!kid) return {cls:'warn',txt:'Isi Kingdom (nomor server) dulu \u2014 redeem sekarang wajib pakai Kingdom'};
  const p={cdk:String(code),fid:String(fid),kid,time:Math.floor(ksClock.signNow()/1000)};
  /* sign dihitung dari nilai MENTAH (bukan yang ter-encode), sesuai request asli */
  const s=md5(Object.keys(p).sort().map(k=>k+'='+p[k]).join('&')+KS_SALT);
  const body='sign='+s+'&'+Object.keys(p).map(k=>k+'='+encodeURIComponent(p[k])).join('&');
  const r=await fetch(KS_GIFT_API,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const j=await r.json();
  const m=String(j.msg==null?'':j.msg).toUpperCase();   /* msg can come back as the NUMBER 40004 -> String() first, else .toUpperCase() throws */
  const ec=Number(j.err_code)||0;
  /* `done:true` = jangan pernah dicoba ulang untuk karakter ini (lihat ksMarkCode).
     Dipisah dari `cls` karena cls hanya mengatur warna di UI. */
  if(j.code===0||m.includes('SUCCESS')) return {cls:'ok',txt:'Berhasil'};
  if(m.includes('RECEIVED')||m.includes('USED')) return {cls:'warn',txt:'Sudah dipakai',done:true};
  /* Terlihat langsung dari akun 330300846 (21 Jul 2026) untuk kode "Kingshot888":
     akun sudah menukar kode lain dari kelompok hadiah yang sama. Permanen, jadi
     ditandai selesai — kalau tidak, kode ini ditembak ulang tiap 12 jam selamanya. */
  if(m.includes('SAME TYPE')) return {cls:'warn',txt:'Sudah ambil kode sejenis',done:true};
  /* Batas laju PER AKUN, terpisah dari X-RateLimit 30/menit di header. Terukur
     21 Jul 2026 (fid 330300846): 6 permintaan berjarak 2,1 dtk sudah memicunya
     pada permintaan ke-7, padahal header masih melaporkan sisa 23/30; pulih
     setelah ~60 detik menganggur; jarak 10 dtk aman untuk 10 permintaan.
     SEMENTARA — jangan ditandai selesai, kalau tidak kode yang belum ditebus
     hilang dari antrean selamanya. */
  if(m.includes('TOO FREQUENT')) return {cls:'warn',txt:'Dibatasi server — dilanjut otomatis nanti',tooFrequent:true};
  /* 40020 = pasangan fid+kid tidak dikenal. Error paling mungkin dilihat user
     sekarang: Kingdom di profil kosong/salah (dulu terisi otomatis lewat
     /api/player, yang sudah dihapus Century — kini harus diketik manual). */
  if(ec===40020||m.includes('USER INFO'))
    return {cls:'bad',txt:'Player ID / Kingdom tidak cocok — cek nomor Kingdom di profil'};
  /* dicek SEBELUM aturan EXPIRE di bawah, kalau tidak terbaca "Kedaluwarsa" */
  if(m.includes('TIME EXPIRED'))
    return {cls:'bad',txt:'Format waktu ditolak server — laporkan sebagai bug app'};
  if(m.includes('CDK')||m.includes('NOT FOUND')) return {cls:'bad',txt:'Kode salah/tak ada'};
  if(m.includes('CAPTCHA')) return {cls:'warn',txt:'Butuh captcha \u2014 redeem in-game'};
  if(m.includes('EXPIRE')) return {cls:'bad',txt:'Kedaluwarsa'};
  /* Terverifikasi lewat probe langsung ke API (Jul 2026): `time` yang meleset
     \u00b124 jam pun tetap diterima (40014 CDK NOT FOUND normal), dan sign yang salah
     dijawab msg "Sign Error" err_code 0. Jadi 40004/40009 BUKAN jam perangkat \u2014
     itu sesi login belum ada/hangus (hit login gagal atau kena rate limit 30/menit). */
  if(ec===40004||ec===40009||m.includes('LOGIN')||m==='40004')
    return {cls:'warn',txt:'Sesi login ke server game gagal \u2014 tunggu ~1 menit lalu coba lagi'};
  if(m.includes('SIGN')) return {cls:'bad',txt:'Sign ditolak server \u2014 laporkan sebagai bug app'};
  /* hanya kalau server BENAR-BENAR bilang soal waktu (window-nya \u00b124 jam, jadi ini langka) */
  if(m.includes('TIME')) return {cls:'bad',txt:'Jam perangkat meleset jauh \u2014 sinkronkan jam lalu coba lagi'};
  return {cls:'inf',txt:String(j.msg==null?'?':j.msg)};
}

/* ── Rencana upgrade TC ──────────────────────────────────────────────────────
   Fungsi MURNI: tanpa DOM, tanpa localStorage — parameter masuk, daftar keluar.
   Datanya di 06_*.js (dibangkitkan dari scraper). Pemisahan ini disengaja:
   risiko terbesar fitur ini ada di ANGKA, bukan tampilan, dan angka hanya bisa
   diuji murah kalau mesinnya tidak menyentuh browser. */

/* Parse teks prasyarat jalur TG -> [[namaBangunan, ord]].
   Contoh: "Embassy TG Lv.1 Stable TG Lv.1" -> [['Embassy',35],['Stable',35]];
   "Embassy Lv.30, Academy Lv.30" -> [['Embassy',30],['Academy',30]].
   Rujukan Town Center/TC dilewati: TC = jalur utama (di-handle loop, bukan bangun). */
function tcParseReqTG(txt){
  const NM={'town center':'TownCenter','command center':'CommandCenter','tc':'TownCenter',
    embassy:'Embassy',academy:'Academy',barracks:'Barracks',range:'Range',stable:'Stable',
    storehouse:'Storehouse',infirmary:'Infirmary'};
  const re=/(Town Center|Command Center|Embassy|Academy|Barracks|Range|Stable|Storehouse|Infirmary|TC)\s+(TG\s+)?Lv\.?\s*(\d+)/gi;
  const refs=[]; let m;
  while((m=re.exec(txt||''))){
    const key=NM[m[1].toLowerCase()]; if(!key||key==='TownCenter') continue;
    refs.push([key, m[2]?30+(+m[3])*5:+m[3]]);   /* "TG Lv.N" -> ord 30+N*5; "Lv.N" -> ord N */
  }
  return refs;
}

/* Rencana dari TC `dari` ke TC `ke`, hanya yang BELUM dimiliki. Sumbu ordinal
   terpadu 1..70: 1-30 = level numerik; 31-70 = jalur Truegold (30-1..TG8).
   `dimiliki` = {namaBangunan: ordTertinggi}, mis. {Academy:27}. */
function tcPlan(dari,ke,dimiliki){
  dimiliki=dimiliki||{}; dari=Number(dari)||0; ke=Number(ke)||0;
  if(typeof TC_LEVELS==='undefined') return [];
  const out=[], sudah=new Set(), sedang=new Set();
  const punya=(n,ord)=>Number(dimiliki[n]||0)>=ord;
  const tgB=(typeof TC_TG_BUILDINGS!=='undefined')?TC_TG_BUILDINGS:{};
  const tgL=(typeof TC_TG_LEVELS!=='undefined')?TC_TG_LEVELS:[];
  const lbl=(typeof labelForOrd==='function')?labelForOrd:(x=>String(x));
  function rowB(nama,ord){
    if(ord<=30){ const t=(typeof TC_BUILDINGS!=='undefined')?TC_BUILDINGS[nama]:null; return t?t.find(x=>x.lv===ord):null; }
    const t=tgB[nama]; return t?t.find(x=>x.ord===ord):null;
  }
  /* Bangunan juga mensyaratkan TC (Embassy 9 butuh TC9), jadi grafnya MEMANG
     bisa melingkar. `sedang` membuat penelusuran berhenti alih-alih kehabisan
     stack — tanpa ini, data yang sah pun bisa menggantungkan app. Bangunan naik
     BERURUTAN (ord-1); prasyarat silang-bangunan-nya sendiri tidak ditelusuri
     di sini (sama seperti pre-30) — resolusi silang hanya di level jalur TC. */
  function bangun(nama,ord){
    if(ord<1||punya(nama,ord)) return;
    const k=nama+' '+ord;
    if(sudah.has(k)||sedang.has(k)) return;
    const row=rowB(nama,ord);
    sedang.add(k);
    bangun(nama,ord-1);            /* level bangunan wajib berurutan (lintas 30->31 alami) */
    sedang.delete(k);
    if(!row) return;              /* tabel biayanya belum ada — lihat TC_TANPA_DATA */
    sudah.add(k); out.push({jenis:'B',nama:nama,lv:ord,label:lbl(ord),c:row.c,sec:row.sec,k:row.k||0});
  }
  for(let o=dari+1;o<=ke;o++){
    let row, prereqs;
    if(o<=30){ row=TC_LEVELS.find(x=>x.lv===o); if(!row) continue; prereqs=row.p; }
    else { row=tgL.find(x=>x.ord===o); if(!row) continue; prereqs=tcParseReqTG(row.req); }
    for(const pr of prereqs) bangun(pr[0],pr[1]);   /* prasyarat DULU, baru TC-nya */
    const k='TownCenter '+o; if(sudah.has(k)) continue;
    sudah.add(k); out.push({jenis:'TC',nama:'TownCenter',lv:o,label:lbl(o),c:row.c,sec:row.sec,k:0});
  }
  return out;
}

/* Potongan BIAYA skill Resourceful milik Saul, per level skill 1-5 (dua sumber
   sepakat: 3/6/9/12/15%). Bagian SPEED-nya sengaja TIDAK dipakai di sini —
   stat Construction Speed di Power Panel sudah menjumlahkannya, jadi
   menambahkannya lagi berarti dobel-hitung. */
const TC_SAUL_CUT=[0,3,6,9,12,15];
const TC_RES=['b','w','s','i'];   /* Truegold (t) sengaja di luar: tak kena potongan */

function tcApplyBuffs(daftar,buff){
  buff=buff||{};
  const spd=(Number(buff.speed)||0)+(Number(buff.wolf)||0)+(Number(buff.posisi)||0);
  /* input ngawur (mis. -300%) tak boleh menghasilkan durasi negatif/tak hingga */
  const bagi=Math.max(0.01,1+spd/100);
  const cut=(TC_SAUL_CUT[Number(buff.saulSkill)||0]||0)/100;
  const baris=(daftar||[]).map(function(r){
    let sec=r.sec/bagi;
    if(buff.doubleTime) sec*=0.8;               /* terpisah dari stat Power Panel */
    const cb={t:(r.c&&r.c.t)||0, tt:(r.c&&r.c.tt)||0};   /* Truegold & Tempered: tak kena potongan Saul */
    for(const k of TC_RES) cb[k]=Math.round(((r.c&&r.c[k])||0)*(1-cut));
    return Object.assign({},r,{secBuff:Math.round(sec),cb:cb});
  });
  const kosong=()=>({b:0,w:0,s:0,i:0,t:0,tt:0});
  const total={c:kosong(),sec:0}, totalDasar={c:kosong(),sec:0};
  for(const r of baris){
    total.sec+=r.secBuff; totalDasar.sec+=r.sec;
    for(const k of TC_RES.concat(['t','tt'])){
      total.c[k]+=r.cb[k]||0; totalDasar.c[k]+=(r.c&&r.c[k])||0;
    }
  }
  return {baris:baris,total:total,totalDasar:totalDasar};
}

/* ── Auto-redeem multi-karakter: helper ──────────────────────────────────────
   Riwayat redeem SUDAH per-profil: 'codesDone' ada di PROFILE_KEYS, jadi
   tersimpan sebagai ks_p_<pid>_codesDone. Tapi `store` selalu memakai profil
   AKTIF, padahal kita perlu membaca/menulis riwayat milik SETIAP karakter —
   makanya di sini dibaca langsung per pid. */
function codesDoneGet(pid){
  try{ return JSON.parse(localStorage.getItem('ks_p_'+pid+'_codesDone'))||{}; }catch(e){ return {}; }
}
function codesDoneSet(pid,v){
  try{ localStorage.setItem('ks_p_'+pid+'_codesDone',JSON.stringify(v)); }catch(e){}
}
/* Semua karakter terdaftar. Profil lama bisa punya kingdom kosong (dulu diisi
   otomatis oleh /api/player yang kini dihapus) — tetap dikembalikan supaya UI
   bisa menandainya "butuh Kingdom", bukan diam-diam dilewati. */
function ksRedeemTargets(){
  const seen=new Set(), out=[];
  for(const p of (store.get('profiles',[])||[])){
    const pid=String((p&&p.pid)||'').trim(); if(!pid||seen.has(pid)) continue;
    seen.add(pid); out.push({pid,nick:(p.nick||''),kingdom:String(p.kingdom||'').trim()});
  }
  return out;
}
/* Kode yang masih perlu ditembak untuk satu karakter: yang belum pernah ok/used,
   dan yang gagal baru dicoba lagi setelah 12 jam (buka tab berulang = gratis). */
const KS_REDEEM_RETRY=12*3600*1000;
function ksCodesTodo(pid,codes){
  const done=codesDoneGet(pid);
  return (codes||[]).filter(g=>{ const d=done[String(g.code).toLowerCase()];
    return !d||(d.r!=='ok'&&d.r!=='used'&&ksClock.signNow()-d.t>KS_REDEEM_RETRY); });
}
function ksMarkCode(pid,code,r){
  const done=codesDoneGet(pid);
  done[String(code).toLowerCase()]={r:r.cls==='ok'?'ok':(r.done?'used':r.cls),t:ksClock.signNow()};
  codesDoneSet(pid,done);
}
/* Ada DUA batas, dan yang mengikat bukan yang tertulis di header:
     - header X-RateLimit-Limit: 30/menit (longgar), dan
     - batas per-akun tak terdokumentasi yang membalas "TOO FREQUENT".
   Terukur langsung 21 Jul 2026 (fid 330300846): jarak 2,1 detik memicu TOO
   FREQUENT pada permintaan ke-7 padahal header masih sisa 23/30 — jadi header
   itu menyesatkan. Jarak 10 detik lolos 10 permintaan beruntun; pulih setelah
   ~60 detik menganggur. Dipakai 11 detik (~5,5/menit) sebagai margin. */
let KS_REDEEM_GAP=11000, KS_REDEEM_COOLDOWN=60000;   /* `let` supaya test bisa menolkannya */
let _ksLastRedeem=0, _ksCooldownUntil=0;
async function ksRedeemThrottled(fid,code,kid){
  /* kid kosong ditolak lokal tanpa jaringan -> jangan buang jatah/waktu tunggu */
  if(!String(kid==null?'':kid).trim()) return ksRedeem(fid,code,kid);
  const wait=Math.max(_ksLastRedeem+KS_REDEEM_GAP,_ksCooldownUntil)-Date.now();
  if(wait>0) await new Promise(s=>setTimeout(s,wait));
  _ksLastRedeem=Date.now();
  const r=await ksRedeem(fid,code,kid);
  /* sudah terlanjur kena: diamkan satu putaran penuh sebelum menembak lagi */
  if(r&&r.tooFrequent) _ksCooldownUntil=Date.now()+KS_REDEEM_COOLDOWN;
  return r;
}
/* Live gift codes — aggregated from TWO sources (kingshot.net's API regularly lags
   behind: per 2026-06 it listed 1 active code while kingshotwiki.com had 2).
   Returns array of {code,exp}, or null only when EVERY source failed. */
/* Jalur 1 = SERVER SENDIRI (passthrough ber-cache, selalu CORS) — proxy publik
   (corsproxy/allorigins/jina) tinggal cadangan darurat; sering diblokir di HP. */
const ksOwnProxy=t=>{
  const m=t.match(/kingdom-tracker\?kingdomId=(\d+)/); if(m) return KS_DATA_API+'/kingdom/'+m[1];
  if(t.indexOf('kingshot.net/api/events')>=0){ const q=t.split('?')[1]; return KS_DATA_API+'/events'+(q?'?'+q:''); }
  if(t.indexOf('kingshot.net/api/gift-codes')>=0) return KS_DATA_API+'/codes';
  return null;
};
const KS_PROXIES=[t=>ksOwnProxy(t),t=>'https://corsproxy.io/?url='+encodeURIComponent(t),t=>'https://api.allorigins.win/raw?url='+encodeURIComponent(t),t=>'https://r.jina.ai/'+t];
const ksFT=(u)=>{ if(!u) return Promise.reject(new Error('skip'));
  return Promise.race([fetch(u),new Promise((_,rej)=>setTimeout(()=>rej(new Error('t')),9000))]); };
async function ksNetCodes(){
  const target='https://kingshot.net/api/gift-codes';
  for(const px of KS_PROXIES){ try{ const r=await ksFT(px(target)); const j=await r.json();
    if(j&&j.data&&j.data.giftCodes){ const now=Date.now();
      return j.data.giftCodes.filter(g=>!g.expiresAt||new Date(g.expiresAt).getTime()>now)
        .map(g=>({code:g.code,exp:g.expiresAt?new Date(g.expiresAt).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-'})); } }catch(e){} }
  return null;
}
async function ksWikiCodes(){
  /* kingshotwiki.com/giftcodes — Century's semi-official wiki, server-rendered WordPress.
     Primary parse: <span class="code">XXX</span> inside the "Active Codes" section.
     Fallback parse: "XXXCopy" tokens (what r.jina.ai's markdown rendering leaves). */
  const target='https://kingshotwiki.com/giftcodes/';
  for(const px of KS_PROXIES){ try{ const r=await ksFT(px(target)); const t=await r.text();
    const seg=(t.match(/Active Codes:?([\s\S]{0,4000}?)(Concierge|How to Redeem)/i)||[])[1]||'';
    let codes=[...seg.matchAll(/class="code">\s*([A-Za-z0-9]{3,24})\s*</g)].map(m=>m[1]);
    /* markdown fallback: codes render as "XXXCopy" run together ("Kingshot888CopyVIP777Copy"),
       so split on the literal "Copy" and take the trailing alphanumeric run of each piece */
    if(!codes.length) codes=seg.split('Copy').map(s=>(s.match(/([A-Za-z0-9]{3,24})\s*$/)||[])[1]).filter(Boolean);
    if(codes.length) return codes;
  }catch(e){} }
  return null;
}
/* Live kingdom-wide schedule + KvK/Transfer countdown from kingshot.net.
   Fetches ALL 4 weeks of the rotation (?week=N) so the monthly calendar can
   project weekly events onto any date. Cached 6h; countdowns recomputed from
   the response timestamp at render. */
async function ksLiveEvents(force){
  const c=store.get('liveEvents',null);
  if(!force&&c&&c.t&&Date.now()-c.t<6*3600*1000&&c.d&&c.d.weeks) return c.d;
  const get=async w=>{ const target='https://kingshot.net/api/events'+(w?'?week='+w:'');
    for(const px of KS_PROXIES){ try{ const r=await ksFT(px(target)); const j=await r.json();
      if(j&&j.calendar&&j.calendar.events) return j; }catch(e){} } return null; };
  const cur=await get(0); if(!cur) return c?c.d:null; /* stale cache beats nothing */
  const wk=cur.calendar.currentWeek;
  const restW=[1,2,3,4].filter(w=>w!==wk);
  const rest=await Promise.all(restW.map(get));
  const weeks={}; weeks[wk]=cur.calendar.events;
  restW.forEach((w,i)=>{ if(rest[i]) weeks[w]=rest[i].calendar.events; });
  const d={kvk:cur.kvk,transfer:cur.transfer,timestamp:cur.timestamp,calendar:cur.calendar,weeks};
  store.set('liveEvents',{t:Date.now(),d}); return d;
}
/* weekly events that cover a given UTC date (projected from the 4-week cycle) */
function wkEventsOnDate(cd){
  const c=store.get('liveEvents',null); const d=c&&c.d;
  const ref=d&&d.calendar&&Date.parse(d.calendar.cycleReference);
  if(!ref||!d.weeks) return [];
  const days=Math.floor((cd.getTime()-ref)/86400000); if(days<0) return [];
  const w=(Math.floor(days/7)%4)+1, wd=days%7; /* 0 = Monday (cycleReference is a Monday) */
  const DI={Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4,Saturday:5,Sunday:6};
  return (d.weeks[w]||[]).filter(e=>{ if(e.type==='PACK') return false;
    const s=DI[e.startDay],t=DI[e.endDay]; if(s==null||t==null) return false;
    return s<=t?(wd>=s&&wd<=t):(wd>=s||wd<=t); });
}
/* ── Countdown: kemunculan BERIKUTNYA tiap event rotasi (sapuan sekali jalan) ──
   JANGAN pakai startUtc dari API: untuk minggu yang BUKAN minggu berjalan nilainya
   adalah kejadian TERAKHIR (Champagne Fair -> 22 Jun, padahal berikutnya 20 Jul).
   Proyeksikan dari cycleReference — rumus yang sama dengan wkEventsOnDate. */
const _WK_DI={Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4,Saturday:5,Sunday:6};
function _wkLen(e){ const s=_WK_DI[e.startDay],t=_WK_DI[e.endDay];
  if(s==null||t==null) return 1; return (t>=s?t-s:t+7-s)+1; }   /* wrap: Min(6)->Sen(0) = 2 hari */
function _wkRef(){ const c=store.get('liveEvents',null); const d=c&&c.d;
  const ref=d&&d.calendar&&Date.parse(d.calendar.cycleReference);
  return (!ref||isNaN(ref)||!d.weeks)?null:{ref:ref,d:d}; }
/* Proyeksi MURNI — tidak memfilter PACK; kebijakan filter ada di evUpcoming.
   Jendela = TEPAT daysAhead hari (off < max, bukan <=): 28 hari sudah mencakup semua
   28 residu mod-28, jadi tiap event ketemu persis sekali. `daysAhead==null` (bukan
   falsy) supaya nextWkStarts(0) berarti "hari ini saja", bukan diam-diam jadi 28. */
function nextWkStarts(daysAhead){
  const R=_wkRef(); if(!R) return new Map();
  const d0=Math.floor((todayMidnight().getTime()-R.ref)/86400000); if(d0<0) return new Map();
  const out=new Map(), max=(daysAhead==null?28:daysAhead);
  for(let off=0;off<max;off++){
    const dd=d0+off, wk=(Math.floor(dd/7)%4)+1, wd=dd%7;
    for(const e of (R.d.weeks[wk]||[])){
      if(out.has(e.titleKey)||_WK_DI[e.startDay]!==wd) continue;
      out.set(e.titleKey,{titleKey:e.titleKey,title:e.title,type:e.type,
        startUTC:R.ref+dd*86400000, endUTC:R.ref+(dd+_wkLen(e))*86400000-1});
    }
  }
  return out;
}
/* Event rotasi yang SEDANG berjalan, plus kapan kemunculan ini mulai.
   Perlu terpisah: sapuan ke depan tak bisa melihat event yang mulainya di masa lalu. */
function wkActiveNow(){
  const R=_wkRef(); if(!R) return [];
  const today=todayMidnight();
  const d0=Math.floor((today.getTime()-R.ref)/86400000); if(d0<0) return [];
  const out=[];
  for(const e of wkEventsOnDate(today)){
    for(let back=0;back<7;back++){
      /* dd bisa NEGATIF (mundur melewati cycleReference) — % di JS mengikuti tanda
         dividen, jadi minggu & dow dua-duanya harus dinormalisasi, bukan cuma dow. */
      const dd=d0-back, wk=((((Math.floor(dd/7)%4)+4)%4))+1;
      if(_WK_DI[e.startDay]!==((dd%7)+7)%7) continue;
      if(!(R.d.weeks[wk]||[]).some(x=>x.titleKey===e.titleKey)) continue;
      out.push({titleKey:e.titleKey,title:e.title,type:e.type,
        startUTC:R.ref+dd*86400000, endUTC:R.ref+(dd+_wkLen(e))*86400000-1});
      break;
    }
  }
  return out;
}
const evCanonId=k=>((typeof EV_ALIAS!=='undefined'&&EV_ALIAS[k])||k);
/* Bentuk item jadwal — default lengkap supaya UI tak pernah ketemu undefined. */
/* srcKey = titleKey ASLI dari feed. WAJIB disimpan terpisah dari id: id sudah di-alias
   (kvkMatchmaking -> kvk), sedangkan WEEKLY_GUIDE di-key pakai titleKey asli — pakai id
   untuk lookup panduan = meleset diam-diam untuk tiap event yang di-alias. */
function _evItem(o){ return Object.assign({id:'',srcKey:'',title:'',type:'',startUTC:null,endUTC:null,
  active:false,source:'',conf:'unknown',gate:null,locked:false,unpredictable:false,why:''},o); }
/* Aktif dulu; lalu paling dekat dulu; yang tak bisa diprediksi (startUTC null) selalu buncit. */
function _evSort(a,b){
  if(a.active!==b.active) return a.active?-1:1;
  const an=(a.startUTC==null),bn=(b.startUTC==null);
  if(an!==bn) return an?1:-1;
  if(an&&bn) return 0;
  return a.startUTC-b.startUTC;
}
/* Satu daftar jadwal terpadu, terurut. Dedup by id: sumber prioritas LEBIH TINGGI
   yang ditambahkan lebih dulu menang; sumber berikutnya untuk id sama dibuang. */
function evUpcoming(){
  const out=[], seen=new Set();
  const add=it=>{ if(!it||!it.id||seen.has(it.id)) return; seen.add(it.id); out.push(it); };
  const pa=profileAge(), start=pa.start, age=pa.age;
  const now=ksClock.now().getTime();

  /* 1) koreksi manual user — menang atas apa pun */
  (store.get('events',[])||[]).forEach(e=>{
    if(!e||!e.type||!e.date) return;
    const t=Date.parse(e.date+'T00:00:00Z'); if(isNaN(t)) return;
    const tpl=(typeof EVENT_TEMPLATES!=='undefined'&&EVENT_TEMPLATES[e.type])||{};
    const len=tpl.len||1;
    add(_evItem({id:e.type,title:tpl.name||e.type,type:'growth',startUTC:t,
      endUTC:t+len*86400000-1,active:(now>=t&&now<t+len*86400000),source:'user',conf:'ingame'}));
  });

  /* 2) model umur server — menang atas rotasi GLOBAL karena mengikuti KINGDOM-mu
        (HoG #4 terverifikasi in-game membuktikan model ini cocok) */
  if(start&&age!=null){
    predictedEvents(start,age).forEach(pp=>{
      const tpl=EVENT_TEMPLATES[pp.type]||{};
      const t=Date.parse(pp.date+'T00:00:00Z'); if(isNaN(t)) return;
      const len=(pp.type==='hog'&&typeof hogLen==='function')?hogLen(hogNoForDay(pp.day)):(tpl.len||1);
      add(_evItem({id:pp.type,title:tpl.name||pp.type,type:'growth',startUTC:t,endUTC:t+len*86400000-1,
        active:(pp.day<=age&&age<pp.day+len),source:'age',
        conf:(pp.type==='hog')?'ingame':(pp.conf==='tinggi'?'wiki':'inferred'),
        gate:tpl.minDay?{minDay:tpl.minDay}:null,
        locked:!!(tpl.minDay&&age<tpl.minDay)}));
    });
  }

  /* 3) kvk/transfer dari API — timeLeft absolut dari server (terbukti 0,0 menit
        meleset thd pengumuman resmi). AWAS: arti timeLeft tergantung phase —
        'countdown' = menuju MULAI; fase lain = sisa fase yang SEDANG berjalan. */
  const _lc=store.get('liveEvents',null), _ld=_lc&&_lc.d;
  if(_ld&&_ld.timestamp){
    const base=Date.parse(_ld.timestamp);
    const absItem=(o,id,label)=>{
      if(!o||!o.timeLeft||o.timeLeft.total==null||isNaN(base)) return;
      const t=base+o.timeLeft.total, counting=(o.phase==='countdown');
      add(_evItem({id:id,title:label+(o.eventNumber?' #'+o.eventNumber:'')+(counting?'':' — '+(o.phaseName||'')),
        type:'SPECIAL',startUTC:counting?t:null,endUTC:counting?null:t,active:!counting,
        source:'live',conf:'live'}));
    };
    absItem(_ld.kvk,'kvk','KvK');
    absItem(_ld.transfer,'transfer','Kingdom Transfer');
  }

  /* 4) sapuan rotasi (+ status aktif) */
  const _act=wkActiveNow();
  const _actKeys=new Set(_act.map(x=>x.titleKey));
  const _pushWk=(e,isActive)=>{
    if(e.type==='PACK') return;                       /* pack = bundel bayar, bukan event skor */
    const min=(typeof WEEKLY_MIN!=='undefined')?WEEKLY_MIN[e.titleKey]:null;
    add(_evItem({id:evCanonId(e.titleKey),srcKey:e.titleKey,title:e.title,type:e.type,
      startUTC:e.startUTC,endUTC:e.endUTC,active:!!isActive,source:'live',conf:'live',
      gate:(min==null)?null:{minDay:min},
      locked:!!(min!=null&&age!=null&&age<min)}));
  };
  _act.forEach(e=>_pushWk(e,true));
  nextWkStarts(28).forEach(e=>{ if(!_actKeys.has(e.titleKey)) _pushWk(e,false); });

  /* 6) tak-bisa-diprediksi — masuk daftar, TANPA angka. Lampiri kelas recur +
        observasi pemain (evLog); startUTC TETAP null. Cadence DINULKAN untuk
        event non-berulang: mereka tak punya ritme, jadi jangan pura-pura. */
  if(typeof EV_UNPREDICTABLE!=='undefined') EV_UNPREDICTABLE.forEach(u=>{
    const obs=(typeof evObserved==='function')?evObserved(u.id):{count:0,lastUTC:null,medianGapDays:null,nextEstUTC:null};
    if(u.recur!=='recurring'){ obs.medianGapDays=null; obs.nextEstUTC=null; }
    add(_evItem({id:u.id,title:u.title,type:'irregular',source:'none',
      conf:'unknown',unpredictable:true,why:u.why,
      recur:u.recur||'oneTime',observed:obs}));
  });

  out.sort(_evSort);
  return out;
}
/* ── Catat kemunculan: observasi pemain atas event tak-terprediksi ──
   evLog=[{id,date,title?}] (multi-baris per id), per-profil. BUKAN sumber
   countdown: estimasi TAK PERNAH ditulis ke startUTC — cuma teks. */
function _evLogTimes(id){
  return (store.get('evLog',[])||[]).filter(r=>r&&r.id===id&&r.date)
    .map(r=>Date.parse(r.date+'T00:00:00Z')).filter(t=>!isNaN(t))
    .sort((a,b)=>a-b).filter((t,i,a)=>i===0||t!==a[i-1]);   /* dedup tanggal identik */
}
function _median(arr){ if(!arr.length) return null; const s=arr.slice().sort((a,b)=>a-b),m=s.length>>1;
  return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2); }
function evObserved(id){
  const ts=_evLogTimes(id), count=ts.length, lastUTC=count?ts[count-1]:null;
  if(count<3) return {count:count,lastUTC:lastUTC,medianGapDays:null,nextEstUTC:null};
  const gaps=[]; for(let i=1;i<count;i++) gaps.push(Math.round((ts[i]-ts[i-1])/86400000));
  const g=_median(gaps);
  return {count:count,lastUTC:lastUTC,medianGapDays:g,nextEstUTC:lastUTC+g*86400000};
}
function evLogAdd(id,date,title){
  if(!id||!date) return; const arr=store.get('evLog',[])||[];
  if(arr.some(r=>r&&r.id===id&&r.date===date)) return;         /* idempoten (id,date) */
  const row={id:String(id),date:String(date)}; if(title) row.title=String(title);
  arr.push(row); store.set('evLog',arr);
}
function evLogRemoveLast(id){
  const arr=store.get('evLog',[])||[];
  for(let i=arr.length-1;i>=0;i--){ if(arr[i]&&arr[i].id===id){ arr.splice(i,1); store.set('evLog',arr); return; } }
}
function evTodayISO(){ return todayMidnight().toISOString().slice(0,10); }   /* server-corrected 'today' */
/* ── Server data milik sendiri (Cloudflare Worker + D1) ── */
const KS_DATA_API='https://old-kingshot-api.old-kingshot.workers.dev';
/* ── Daftar pengunjung ──
   Ping 1× per hari (Player ID terhubung) ke server sendiri; dedup per-hari dihitung
   DI SERVER (jam server, anti-manipulasi). Data = identitas game yang memang publik
   (nickname/kingdom/TC). Daftar hanya bisa dibaca dengan kunci pemilik. */
async function ksVisitorPing(){
  try{
    const p=store.get('profile',{}); if(!p.pid) return;
    const today=ksClock.now().toISOString().slice(0,10);
    if(store.get('visitPing','')===today) return;
    const r=await fetch(KS_DATA_API+'/visit',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({pid:p.pid,nick:p.nick||'',kid:String(p.kingdom||''),tc:String(p.tc||'')})});
    if(r.ok) store.set('visitPing',today);
  }catch(e){}
}
/* returns array [{pid,nick,kid,tc,first,last,visits}] | null kalau gagal */
async function ksVisitorList(){
  try{
    const key=store.get('ownerKey',''); if(!key) return 'nokey';
    const r=await fetch(KS_DATA_API+'/visitors',{headers:{'X-Owner-Key':key}});
    if(r.status===403) return 'badkey';
    if(!r.ok) return null;
    const j=await r.json(); return j.visitors||[];
  }catch(e){ return null; }
}
async function ksLiveCodes(){
  const [api,wiki]=await Promise.all([ksNetCodes(),ksWikiCodes()]);
  if(api===null&&wiki===null) return null;
  const seen=new Set(), out=[];
  (api||[]).forEach(g=>{ const k=g.code.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push(g); } });
  (wiki||[]).forEach(c=>{ const k=c.toLowerCase(); if(!seen.has(k)){ seen.add(k); out.push({code:c,exp:'-'}); } });
  return out;
}

/* ── Jadwal KvK: GLOBAL, bukan per-kingdom ──
   Semua kingdom bertanding di jendela yang sama (siklus 28 hari); umur kingdom
   cuma GERBANG (H70). Model lama (+28 dihitung dari H70 kingdom sendiri) memberi
   tanggal yang salah — utk 2114 ia bilang H70 = 4 Agu padahal KvK #17 global
   mulai 10 Agu. Tanggal sebenarnya sudah ada di feed kingshot.net yang app ini
   pakai untuk kartu "Jadwal Live"; di sini dipakai juga untuk advisory. */
function kvkGlobalStartISO(ld){
  const k=ld&&ld.kvk; if(!k||!ld.timestamp) return null;
  const ts=Date.parse(ld.timestamp); if(!ts) return null;
  const tot=k.timeLeft&&k.timeLeft.total;
  /* cuma fase 'countdown' yang menunjuk MULAI-nya; fase berjalan menunjuk akhir fase */
  if(k.phase!=='countdown'||!(tot>0)) return null;
  return new Date(ts+tot).toISOString().slice(0,10);
}
/* Gelombang global pertama yang saat itu kingdom sudah cukup umur. */
function kvkNextForKingdom(globalISO,kingdomStartISO,minDay){
  if(!globalISO||!kingdomStartISO) return null;
  const gate=minDay||70, ks=new Date(kingdomStartISO+'T00:00:00Z');
  let d=new Date(globalISO+'T00:00:00Z');
  for(let i=0;i<24;i++){
    const day=daysBetween(ks,d)+1;
    if(day>=gate) return {date:d.toISOString().slice(0,10),day:day};
    d=new Date(d.getTime()+28*86400000);
  }
  return null;
}
/* ── Event prediction & advisory ── */
function predictedEvents(start,age){
  const out=[];
  let hno=hogNoForDay(age);
  /* siklus ini sudah kelar (durasi per-iterasi, bukan template) → ramalkan berikutnya.
     KvK di bawah sudah begini sejak dulu; HoG kelewat, jadi iterasi yang sudah selesai
     terus nongol sebagai "berikutnya". */
  if(age>=hogStartDay(hno)+hogLen(hno)) hno++;
  for(let k=0;k<3;k++){ const no=hno+k; if(!hogExists(no)) break;   /* HoG berhenti setelah #5 (Gen 3) */
    const d=hogStartDay(no); out.push({type:'hog',day:d,date:addDaysISO(start,d),conf:'tinggi'}); }
  /* Tanggal KvK: feed global dulu (akurat), model umur cuma cadangan. */
  const klen=(EVENT_TEMPLATES.kvk&&EVENT_TEMPLATES.kvk.len)||5;
  const _gate=(EVENT_TEMPLATES.kvk&&EVENT_TEMPLATES.kvk.minDay)||70;
  let kvkRow=null;
  try{
    const _lc=store.get('liveEvents',null);
    const _g=kvkGlobalStartISO(_lc&&_lc.d);
    if(_g){ const n=kvkNextForKingdom(_g,start.toISOString().slice(0,10),_gate);
      /* gelombang yang SEDANG berjalan sudah lewat → pakai berikutnya */
      if(n){ let nn=n; if(age>=nn.day+klen) nn=kvkNextForKingdom(addDaysISO(new Date(nn.date+'T00:00:00Z'),29),start.toISOString().slice(0,10),_gate)||nn;
        kvkRow={type:'kvk',day:nn.day,date:nn.date,conf:'live',elig:true,src:'feed'}; } }
  }catch(e){}
  if(!kvkRow){
    let kvk=age<_gate?_gate:_gate+Math.floor((age-_gate)/28)*28;
    if(age>=kvk+klen) kvk+=28; /* current cycle already over → predict the next one */
    /* `elig` = hari ini cuma GERBANG eligibility, bukan jadwal match. KvK perlu lawan
       matchmaking; tanpa lawan sepadan bulan itu batal (Matchmaking Bye Rewards). HoG/SG
       polanya pasti begitu gerbangnya lewat, jadi TIDAK ditandai. */
    kvkRow={type:'kvk',day:kvk,date:addDaysISO(start,kvk),conf:'sedang',elig:true};
  }
  out.push(kvkRow);
  /* Strongest Governor = kompetitif berbasis UMUR (gate H75, siklus 28 hari) — sama
     modelnya dgn KvK/HoG & dgn kalender. Tanpa ini SG jatuh ke feed rotasi GLOBAL →
     tanggal sama utk semua server (salah lintas-kingdom). */
  let sg=age<75?75:75+Math.floor((age-75)/28)*28;
  const slen=(EVENT_TEMPLATES.sg&&EVENT_TEMPLATES.sg.len)||7;
  if(age>=sg+slen) sg+=28;
  out.push({type:'sg',day:sg,date:addDaysISO(start,sg),conf:'sedang'});
  return out;
}
/* HoG durasi & tema per-ITERASI (bukan template len=7) — biar advisory & kalender akurat lintas-server */
function hogAdvOccurrence(start, pfStart){
  if(!pfStart||typeof HOG_DETAIL==='undefined'||!HOG_DETAIL.iters) return null;
  var sd=daysBetween(new Date(pfStart+'T00:00:00Z'),start)+1;
  /* tanggal D1 → jangkar TERDEKAT (bukan pembulatan ke bawah): tanggal yang meleset
     sehari dulu mengambil data iterasi sebelumnya (hero/ambang/durasi salah). */
  var no=(typeof hogNoForStart==='function')?hogNoForStart(sd):hogNoForDay(sd);
  var it=HOG_DETAIL.iters[hogIdxForNo(no)]; if(!it) return null;
  var days=it.stages.map(function(st){ return st[0]; });
  var spend=it.stages.map(function(st){ var t=st[1]||[]; return t.slice(0,2).map(function(x){ return x[0]+' ('+x[1]+')'; }).join(' + ')||'item sesuai tema'; });
  return {no:no, len:it.stages.length, days:days, spend:spend, hero:it.hero, rank:it.rank};
}
function evAdvisory(ev){
  const tpl=EVENT_TEMPLATES[ev.type]; if(!tpl) return null;
  const start=new Date(ev.date+'T00:00:00Z'); const di=daysBetween(start,todayMidnight());
  const _pf=store.get('profile',{});
  if(tpl.minDay && _pf.start){
    const esd=daysBetween(new Date(_pf.start+'T00:00:00Z'),start);
    if(esd<tpl.minDay) return {type:ev.type,name:tpl.name,status:'BELUM ELIGIBLE',cls:'warn',di,start,tpl,notEligible:true,
      lines:['Server masih baru (hari '+esd+'). '+tpl.name+' baru aktif ~hari '+tpl.minDay+'.']};
  }
  let status,cls,lines=[];
  let effLen=tpl.len,effDays=tpl.days,effSpend=tpl.spend,hogInfo='';
  if(ev.type==='hog'){ var _ho=hogAdvOccurrence(start,_pf.start); if(_ho){ effLen=_ho.len; effDays=_ho.days; effSpend=_ho.spend; hogInfo=' \u00b7 HoG #'+_ho.no+' ('+_ho.len+' hari) \u00b7 '+_ho.hero+' \u00b7 '+_ho.rank; } }
  if(tpl.milestone){
    if(di<0){ status='H-'+(-di); cls='inf'; lines.push('Belum mulai \u2014 '+tpl.goal); }
    else if(di<tpl.len){ status='D'+(di+1)+'/'+effLen+(di===effLen-1?' (TERAKHIR)':''); cls='ok';
      lines.push(tpl.goal);
      lines.push('\u2705 Event MILESTONE power \u2014 SELESAIKAN upgrade/riset/training/hero SEKARANG. Di sini upgrade JANGAN ditahan.');
      if(SPEED_NOTE[ev.type]) lines.push(SPEED_NOTE[ev.type]+'.');
      if(di===tpl.len-1) lines.push('\u26a0 HARI TERAKHIR \u2014 push power maksimal sebelum reset 07:00 WIB!');
    } else { status='Selesai'; cls='inf'; lines.push('Event sudah lewat.'); }
    return {type:ev.type,name:tpl.name,status,cls,lines,start,tpl,di,len:effLen};
  }
  if(di<0){ const h=-di; status='H-'+h+' (prep)'; cls=h<=1?'bad':h<=3?'warn':'inf';
    /* Tanggal KvK = ramalan dari gerbang eligibility, bukan jadwal yang diumumkan.
       Tanpa catatan ini "H-5 KvK" terbaca sebagai kepastian. */
    if(ev.type==='kvk') lines.push(ev.src==='feed'
      ? '\ud83d\udce1 Tanggal dari jadwal GLOBAL KvK (semua kingdom serentak, siklus 28 hari) \u2014 umur kingdom-mu sudah lewat gerbang H70. Tetap tidak dijamin: tanpa lawan sepadan \u2192 "Matchmaking Bye Rewards".'
      : '\u2139 Hari 70 = ELIGIBILITY terbuka (paling cepat), bukan tanggal pasti. KvK butuh lawan matchmaking \u2014 tanpa lawan sepadan, bulan ini batal \u2192 "Matchmaking Bye Rewards". Acuan final = tab Events in-game.');
    lines.push('\ud83d\udd12 TAHAN & siapkan: '+tpl.hold+'.');
    lines.push('\ud83d\udeab Jangan selesaikan upgrade besar \u2014 tahan untuk diselesaikan saat event.');
    if(h<=1) lines.push('\u26a0 MULAI BESOK! Pastikan upgrade hampir selesai & buff siap.');
  } else if(di<effLen){ status='D'+(di+1)+'/'+effLen+' AKTIF'; cls='ok';
    lines.push('\ud83c\udfaf '+effDays[di]+hogInfo);
    lines.push('\u2705 Pakai SEKARANG: '+(effSpend[di]||'item sesuai tema')+'.');
    if(SPEED_NOTE[ev.type]) lines.push(SPEED_NOTE[ev.type]+'.');
    lines.push('\ud83d\udd50 Batas hari ini: spend/selesaikan SEBELUM reset 07:00 WIB.');
    if(tpl.battleWIB&&di===effLen-1) lines.push('\u2694 Battle '+tpl.battleWIB+(ev.time?' \u00b7 jam event '+ev.time+' WIB':''));
    else if(ev.time) lines.push('\u23f0 Jam event: '+ev.time+' WIB');
  } else { status='Selesai'; cls='inf'; lines.push('Event sudah lewat.'); }
  /* Umur tiap kingdom beda → tanggal HoG dari kingdom lain TIDAK sah di sini.
     Dulu ditelan diam-diam (dan dipetakan ke iterasi yang salah); sekarang
     ditandai, sekalian ditunjukkan kingdom mana yang tanggalnya benar-benar pas. */
  if(ev.type==='hog'&&_pf.start&&typeof hogAnchorFit==='function'){
    const _sd=daysBetween(new Date(_pf.start+'T00:00:00Z'),start)+1;
    const _fit=hogAnchorFit(_sd);
    if(!_fit.fits){
      const _alt=(typeof kingdomsForHogDate==='function')
        ? kingdomsForHogDate(ev.date).filter(h=>String(h.kid)!==String(_pf.kingdom||'')) : [];
      lines.unshift('⚠ Tanggal ini TIDAK COCOK dengan umur kingdom profil ini: jatuh di hari '+_sd
        +', sedangkan jangkar HoG terdekat hari '+(_sd-_fit.off)+' (#'+_fit.no+') — meleset '+Math.abs(_fit.off)+' hari.'
        +(_alt.length?' Tanggal ini justru PAS untuk Kingdom '+_alt.map(h=>h.kid+' (HoG #'+h.no+')').join(', ')+' — salah profil?'
                     :' Cek lagi hari pertama HoG di tab Events game.'));
    }
  }
  return {type:ev.type,name:tpl.name,status,cls,lines,start,tpl,di,len:effLen};
}
/* Tipe event yang entri manual-nya masih RELEVAN (sedang jalan / belum mulai).
   Entri yang sudah selesai TIDAK boleh lagi menahan ramalan — dulu renderEvent
   memakai semua entri, jadi sekali sebuah HoG dicatat, HoG berikutnya tak pernah
   diramalkan lagi (kartunya hilang total). activeAdvisories sudah benar; ini
   menyamakan tab Event dengannya. */
function openUserTypes(evs){
  const s=new Set();
  (evs||[]).forEach(e=>{ if(!e||!e.type) return; const a=evAdvisory(e); if(!a) return;
    const len=a.len||(a.tpl&&a.tpl.len)||1; if(a.di<len) s.add(e.type); });
  return s;
}
/* Label asal tanggal. HoG deterministik (jangkar terverifikasi + siklus 14 hari)
   → dihitung, bukan ditebak. KvK cuma gerbang eligibility. Sisanya estimasi. */
function predSourceLabel(e){
  if(!e) return '';
  if(e.type==='hog') return 'dihitung dari umur kingdom';
  if(e.src==='feed') return 'jadwal global KvK · dari feed';
  if(e.elig) return 'estimasi · eligibility, belum tentu terjadi';
  return 'estimasi · akurasi '+(e.conf||'?');
}
function activeAdvisories(start,age){
  const sched=store.get('events',[]).map(evAdvisory).filter(a=>a&&!a.notEligible&&a.di>=0&&a.di<(a.len||a.tpl.len));
  const haveT=new Set(sched.map(a=>a.type));
  if(age>=1&&age<=7&&!haveT.has('burst')){ const b=evAdvisory({type:'burst',date:addDaysISO(start,1)}); if(b&&b.di>=0&&b.di<b.tpl.len){ sched.unshift(b); haveT.add('burst'); } }
  predictedEvents(start,age).forEach(pp=>{ if(haveT.has(pp.type))return; const a=evAdvisory({type:pp.type,date:pp.date}); if(a&&a.di>=0&&a.di<(a.len||a.tpl.len)){ sched.push(a); haveT.add(pp.type); } });
  return sched;
}

/* ── Phase plan (computed action list per server age + TC) ── */
function phasePlan(age,tc){
  const a=[];
  if(tc<10) a.push('\ud83c\udfd7 Rush Town Center ke 10 \u2014 lewat chapter mission (lebih cepat dari gathering).');
  else if(tc<30) a.push('\ud83c\udfd7 Lanjut upgrade TC (target 30). Jaga builder & antrian riset TIDAK kosong.');
  else a.push('\ud83c\udfd7 TC30 \u2705 \u2014 fokus Truegold / War Academy & ranking event.');
  if(age<3) a.push('\ud83e\udd1d Gabung alliance (saat TC6) + klaim Jabel + pull joiner Epic gratis (Chenko/Amane/Yeonwoo/Gordon).');
  if(age<45){
    a.push('\ud83e\uddb8 Naikkan skill kunci joiner Epic \u2192 4\u2605 (Chenko/Amane/Yeonwoo).');
    a.push('\ud83d\udc8e SIMPAN gem (jangan dipakai!) untuk Hero Roulette Zoe (~hari 50).');
    a.push('\ud83d\udc3b Ikut Bear Hunt (Bear Trap) harian \u2014 sumber Forgehammer utama (rally aliansi, TANPA stamina). Diana hemat stamina hanya untuk berburu beast di MAP, bukan Bear Trap.');
  } else if(age<113){
    a.push('\ud83e\uddb8 Spin Zoe di Roulette (utamakan saat HoG Hari 2-3) + ambil Marlin di Hall of Heroes.');
  } else if(age<197){
    a.push('\ud83e\uddb8 Bangun Petra (Gen 3) via Roulette; dorong Zoe ke 4\u2605 + widget.');
  } else a.push('\ud83e\uddb8 Lanjut hero generasi baru sesuai Timeline Investasi (tab Hero).');
  a.push('\u2705 Checklist harian: daily mission, Bear Hunt, help alliance, habiskan stamina, klaim gift code.');
  if(age>=45) a.push('\ud83c\udfc6 Kejar milestone event aktif (Strongest Governor / Hall of Governors).');
  a.push('\ud83d\udee1 Simpan resource di backpack (anti-jarah) sebelum logout.');
  return a;
}
