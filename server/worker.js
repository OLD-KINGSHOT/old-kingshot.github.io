/* OLD.KINGSHOT data API — Cloudflare Worker + D1.
   Endpoints (all CORS *):
     GET  /sync/:code        -> raw stored payload text ('' if none)
     PUT  /sync/:code        -> store body text (cap 256KB), body must be JSON with numeric ts
     POST /visit             -> {pid,nick,kid,tc}; server-side once-per-UTC-day visit count
     GET  /visitors?key=K    -> full visitor list (owner key required)
     GET  /time              -> {now} server epoch ms (app clock source)
     GET  /health            -> ok
   No PII beyond public in-game identity (nickname/kingdom/TC). */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Key',
  'Access-Control-Max-Age': '86400',
};
/* constant-time string compare (avoid timing leaks on the owner key) */
function safeEq(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
const text = (t, s = 200) => new Response(t, { status: s, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } });

/* Lazily create every table we touch. CREATE TABLE IF NOT EXISTS is idempotent &
   cheap, so a fresh D1 (or a brand-new deploy) just works — previously only
   seen_codes was created, so /sync and /visit threw "no such table" on a clean DB. */
async function ensureSchema(env) {
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS seen_codes (code TEXT PRIMARY KEY, ts INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS sync (code TEXT PRIMARY KEY, ts INTEGER, data TEXT, updated INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS visitors (pid TEXT PRIMARY KEY, nick TEXT, kid TEXT, tc TEXT, first TEXT, last TEXT, visits INTEGER)'),
  ]);
}

/* ===== Gift-code watcher (cron) =====================================
   Cek kingshot.net gift-code, bandingkan dgn D1 `seen_codes`, push kode BARU
   ke HP via ntfy dan/atau Telegram. Run pertama = seed diam (tak spam kode lama). */
async function fetchActiveCodes() {
  const r = await fetch('https://kingshot.net/api/gift-codes', { cf: { cacheTtl: 0 } });
  const j = await r.json();
  const now = Date.now();
  return (j && j.data && j.data.giftCodes ? j.data.giftCodes : [])
    .filter(g => g && g.code && (!g.expiresAt || new Date(g.expiresAt).getTime() > now))
    .map(g => ({ code: String(g.code), exp: g.expiresAt || null }));
}

async function notify(env, { title, body, url }) {
  const jobs = [];
  if (env.NTFY_TOPIC) {
    jobs.push(fetch('https://ntfy.sh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: env.NTFY_TOPIC, title, message: body, tags: ['gift'], priority: 4, ...(url ? { click: url } : {}) }),
    }));
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    jobs.push(fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: '*' + title + '*\n' + body, parse_mode: 'Markdown', disable_web_page_preview: true }),
    }));
  }
  await Promise.allSettled(jobs);
}

/* ===== AUTO-REDEEM sisi server ======================================
   Dulu bagian ini sengaja no-op dan worker hanya MENGIRIM NOTIFIKASI — kamu yang
   menebus. Alasannya historis: protokolnya belum direproduksi di sisi server.
   Sekarang sudah, dan sisi server justru lebih baik daripada browser:
     · jam worker = jam Cloudflare, jadi seluruh kelas kegagalan "time Expired"
       (jendela Century cuma ±5 menit) tidak bisa terjadi di sini;
     · jalan walau app tak pernah dibuka;
     · tanpa CORS, tanpa proxy.

   IDENTITAS DIAMBIL DARI ENV SAJA, tak pernah dari tabel `visitors`. Tabel itu
   berisi pengunjung lain, dan menebus kode atas nama akun orang jelas salah. */
/* md5 disalin apa adanya dari companion_src/03_*.js — SubtleCrypto tidak punya MD5,
   jadi harus JS murni. Vektor uji terverifikasi: cdk=TESTPROBE1&fid=330300846&kid=2114
   &time=1784621714 + SALT -> 171b3e392cf48d88a048fdf50a73ceaa (dicek ulang 31 Jul 2026). */
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
const KS_SALT = 'mN4!pQs6JrYwV9';
const KS_GIFT = 'https://kingshot-giftcode.centurygame.com/api/gift_code';
/* "fid:kid,fid:kid" (banyak karakter) atau REDEEM_FID + REDEEM_KID (satu karakter) */
function redeemTargets(env) {
  const out = [];
  for (const bag of String(env.REDEEM_TARGETS || '').split(',')) {
    const [fid, kid] = bag.split(':').map(s => (s || '').trim());
    if (fid && kid) out.push({ fid, kid });
  }
  if (!out.length && env.REDEEM_FID && env.REDEEM_KID) out.push({ fid: String(env.REDEEM_FID).trim(), kid: String(env.REDEEM_KID).trim() });
  return out;
}
async function redeemOne(fid, kid, code) {
  const p = { cdk: String(code), fid: String(fid), kid: String(kid), time: Math.floor(Date.now() / 1000) };
  const sign = md5(Object.keys(p).sort().map(k => k + '=' + p[k]).join('&') + KS_SALT);
  const body = 'sign=' + sign + '&' + Object.keys(p).map(k => k + '=' + encodeURIComponent(p[k])).join('&');
  const r = await fetch(KS_GIFT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  const m = String(j.msg == null ? '' : j.msg).toUpperCase();
  /* `final` = jangan pernah dicoba ulang untuk karakter ini. Penolakan SEMENTARA
     (TOO FREQUENT, 40004/40009) sengaja TIDAK final — kalau ditandai selesai, kode
     yang belum tertebus hilang dari antrean selamanya. */
  if (j.code === 0 || m.includes('SUCCESS')) return { r: 'ok', txt: 'berhasil', final: true };
  if (m.includes('RECEIVED') || m.includes('USED')) return { r: 'used', txt: 'sudah dipakai', final: true };
  if (m.includes('SAME TYPE')) return { r: 'same', txt: 'sudah ambil kode sejenis', final: true };
  if (m.includes('CDK') || m.includes('NOT FOUND')) return { r: 'bad', txt: 'kode tak ada', final: true };
  if (m.includes('EXPIRE') && !m.includes('TIME')) return { r: 'exp', txt: 'kedaluwarsa', final: true };
  if (m.includes('USER INFO')) return { r: 'id', txt: 'fid/kid tidak cocok', final: true };
  return { r: 'retry', txt: String(j.msg == null ? '?' : j.msg), final: false };
}
/* Batas per putaran cron: cron jalan tiap 30 menit, jadi sisa kode cukup ditunda —
   jauh lebih baik daripada menahan satu invocation terlalu lama. */
const REDEEM_MAX_PER_RUN = 6, REDEEM_GAP_MS = 3000;
async function maybeAutoRedeem(env, codes) {
  if (env.AUTO_REDEEM !== '1') return null;
  const targets = redeemTargets(env);
  if (!targets.length) return null;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS redeemed (fid TEXT, code TEXT, res TEXT, ts INTEGER, PRIMARY KEY (fid, code))').run();
  const hasil = [];
  let kirim = 0;
  for (const t of targets) {
    for (const code of codes) {
      if (kirim >= REDEEM_MAX_PER_RUN) return { hasil, tertunda: true };
      const sudah = await env.DB.prepare('SELECT res FROM redeemed WHERE fid=?1 AND code=?2').bind(t.fid, code).first();
      if (sudah) continue;
      if (kirim) await new Promise(s => setTimeout(s, REDEEM_GAP_MS));
      kirim++;
      let out; try { out = await redeemOne(t.fid, t.kid, code); } catch (e) { out = { r: 'net', txt: 'gagal jaringan', final: false }; }
      hasil.push({ fid: t.fid, code, ...out });
      if (out.final) {
        await env.DB.prepare('INSERT OR REPLACE INTO redeemed (fid, code, res, ts) VALUES (?1,?2,?3,?4)')
          .bind(t.fid, code, out.r, Date.now()).run();
      }
    }
  }
  return { hasil, tertunda: false };
}

async function checkCodes(env) {
  await ensureSchema(env);
  const codes = await fetchActiveCodes();           // throws on network error -> caller skips seen update
  if (!codes.length) return { ok: true, fetched: 0, new: [] };
  const rows = await env.DB.prepare('SELECT code FROM seen_codes').all();
  const seen = new Set((rows.results || []).map(r => String(r.code).toLowerCase()));
  const firstRun = seen.size === 0;
  const fresh = codes.filter(c => !seen.has(c.code.toLowerCase()));
  const now = Date.now();
  const ins = env.DB.prepare('INSERT OR IGNORE INTO seen_codes (code, ts) VALUES (?1, ?2)');
  await env.DB.batch(codes.map(c => ins.bind(c.code, now)));
  if (firstRun) return { ok: true, seeded: codes.length, new: [] }; // silent seed
  if (fresh.length) {
    /* Tebus DULU, baru kabari — notifikasi yang berisi HASIL jauh lebih berguna
       daripada notifikasi yang menyuruhmu mengerjakannya sendiri. */
    let red = null;
    try { red = await maybeAutoRedeem(env, fresh.map(c => c.code)); } catch (e) { red = null; }
    const ringkas = red && red.hasil.length
      ? '\n' + red.hasil.map(h => h.code + ': ' + h.txt).join('\n') + (red.tertunda ? '\n(sisanya menyusul putaran berikutnya)' : '')
      : '\nTap untuk auto-redeem di app.';
    await notify(env, {
      title: red && red.hasil.some(h => h.r === 'ok') ? '🎁 Kode Kingshot ditebus!' : '🎁 Kode Kingshot baru!',
      body: fresh.map(c => c.code).join(', ') + ringkas,
      url: 'https://old-kingshot.github.io/',
    });
    return { ok: true, fetched: codes.length, new: fresh.map(c => c.code), redeem: red };
  }
  return { ok: true, fetched: codes.length, new: fresh.map(c => c.code) };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (p === '/health') return text('ok');

      /* Sumber waktu otoritatif untuk app. Dikirim di BODY, bukan header `Date`:
         header Date bukan CORS-safelisted, jadi headers.get('date') selalu null di
         browser kecuali di-expose. Body JSON selalu terbaca. Jangan di-cache. */
      if (p === '/time') {
        return new Response(JSON.stringify({ now: Date.now() }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
        });
      }

      // ---- upstream passthroughs (kingshot.net has no CORS; we fetch server-side,
      //      edge-cached, so the app never depends on flaky public CORS proxies) ----
      const mK = p.match(/^\/kingdom\/(\d{1,7})$/);
      if (mK && req.method === 'GET') {
        const r = await fetch('https://kingshot.net/api/kingdom-tracker?kingdomId=' + mK[1],
          { cf: { cacheTtl: 86400, cacheEverything: true } });
        return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400', ...CORS } });
      }
      if (p === '/events' && req.method === 'GET') {
        const w = url.searchParams.get('week');
        /* Payload ini dipakai untuk DUA hal dengan kebutuhan kesegaran yang berlawanan:
           jadwal event (boleh basi 30 menit) dan `timestamp` sebagai SUMBER JAM (tak
           boleh basi sama sekali — jendela gift-code Century cuma ±5 menit, jadi
           timestamp berumur 30 menit adalah jam yang salah 30 menit).
           App menandai permintaan jam dengan `_ts`; hanya permintaan itu yang menembus
           cache. Tanpa cabang ini, cache-bust di sisi app percuma: query `_ts` tak
           pernah ikut ke upstream, jadi edge tetap menyajikan salinan lama. */
        const utkJam = url.searchParams.has('_ts');
        const r = await fetch('https://kingshot.net/api/events' + (w ? '?week=' + encodeURIComponent(w) : ''),
          { cf: utkJam ? { cacheTtl: 0 } : { cacheTtl: 1800, cacheEverything: true } });
        return new Response(await r.text(), { status: r.status, headers: {
          'Content-Type': 'application/json',
          'Cache-Control': utkJam ? 'no-store' : 'public, max-age=1800', ...CORS } });
      }
      if (p === '/codes' && req.method === 'GET') {
        const r = await fetch('https://kingshot.net/api/gift-codes', { cf: { cacheTtl: 3600, cacheEverything: true } });
        return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS } });
      }
      /* manual trigger for the gift-code watcher (testing without waiting for cron) */
      if (p === '/codes/check' && req.method === 'GET') {
        if (!safeEq(req.headers.get('x-owner-key') || url.searchParams.get('key'), env.OWNER_KEY)) return json({ error: 'forbidden' }, 403);
        return json(await checkCodes(env));
      }

      // ---- sync slots (key-value, client owns the random secret code) ----
      const mSync = p.match(/^\/sync\/([A-Za-z0-9_-]{8,80})$/);
      if (mSync) {
        const code = mSync[1];
        await ensureSchema(env);
        if (req.method === 'GET') {
          const row = await env.DB.prepare('SELECT data FROM sync WHERE code=?1').bind(code).first();
          return text(row ? row.data : '');
        }
        if (req.method === 'PUT' || req.method === 'POST') {
          const body = await req.text();
          if (!body) return json({ error: 'empty' }, 400);
          if (body.length > 262144) return json({ error: 'size' }, 413);
          let ts = 0;
          try { const j = JSON.parse(body); ts = Number(j.ts) || 0; } catch (e) { return json({ error: 'json' }, 400); }
          await env.DB.prepare(
            'INSERT INTO sync (code,ts,data,updated) VALUES (?1,?2,?3,?4) ' +
            'ON CONFLICT(code) DO UPDATE SET ts=?2,data=?3,updated=?4'
          ).bind(code, ts, body, Date.now()).run();
          return json({ ok: true, ts });
        }
      }

      // ---- visitor log ----
      if (p === '/visit' && req.method === 'POST') {
        let b; try { b = await req.json(); } catch (e) { return json({ error: 'json' }, 400); }
        const pid = String(b.pid || '').slice(0, 20);
        if (!/^\d{4,15}$/.test(pid)) return json({ error: 'pid' }, 400);
        await ensureSchema(env);
        const nick = String(b.nick || '').slice(0, 40);
        const kid = String(b.kid || '').slice(0, 10);
        const tc = String(b.tc || '').slice(0, 6);
        const today = new Date().toISOString().slice(0, 10); // server clock = tamper-resistant
        const row = await env.DB.prepare('SELECT last,visits FROM visitors WHERE pid=?1').bind(pid).first();
        if (!row) {
          await env.DB.prepare('INSERT INTO visitors (pid,nick,kid,tc,first,last,visits) VALUES (?1,?2,?3,?4,?5,?5,1)')
            .bind(pid, nick, kid, tc, today).run();
        } else {
          const inc = row.last === today ? 0 : 1; // once per UTC day per player
          await env.DB.prepare('UPDATE visitors SET nick=?2,kid=?3,tc=?4,last=?5,visits=visits+?6 WHERE pid=?1')
            .bind(pid, nick, kid, tc, today, inc).run();
        }
        return json({ ok: true });
      }

      if (p === '/visitors' && req.method === 'GET') {
        /* key via HEADER (not query string) so it never lands in access logs */
        if (!safeEq(req.headers.get('x-owner-key'), env.OWNER_KEY)) return json({ error: 'forbidden' }, 403);
        await ensureSchema(env);
        const rs = await env.DB.prepare('SELECT pid,nick,kid,tc,first,last,visits FROM visitors ORDER BY last DESC, visits DESC LIMIT 1000').all();
        return json({ visitors: rs.results || [] });
      }

      return json({ error: 'notfound' }, 404);
    } catch (e) {
      return json({ error: 'server' }, 500);
    }
  },

  /* Cron Trigger (wrangler.toml: every 30 min) — push new gift codes to phone. */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkCodes(env).catch(() => {}));
  },
};
