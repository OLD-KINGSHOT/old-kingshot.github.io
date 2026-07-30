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

/* AUTO-REDEEM — opsi masa depan, default OFF. Aktifkan nanti: set env.AUTO_REDEEM='1'
   + env.REDEEM_FID (player id), lalu implementasi POST bertanda-tangan ke KS gift_code
   API (perlu md5(salt+...) seperti redeem client-side di app). Sekarang sengaja no-op. */
async function maybeAutoRedeem(env, code) {
  if (env.AUTO_REDEEM !== '1' || !env.REDEEM_FID) return null;
  // TODO: signed redeem request here.
  return null;
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
    await notify(env, {
      title: '🎁 Kode Kingshot baru!',
      body: fresh.map(c => c.code).join(', ') + '\nTap untuk auto-redeem di app.',
      url: 'https://old-kingshot.github.io/',
    });
    for (const c of fresh) await maybeAutoRedeem(env, c.code);
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
