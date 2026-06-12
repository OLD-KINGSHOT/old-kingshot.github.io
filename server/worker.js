/* OLD.KINGSHOT data API — Cloudflare Worker + D1.
   Endpoints (all CORS *):
     GET  /sync/:code        -> raw stored payload text ('' if none)
     PUT  /sync/:code        -> store body text (cap 256KB), body must be JSON with numeric ts
     POST /visit             -> {pid,nick,kid,tc}; server-side once-per-UTC-day visit count
     GET  /visitors?key=K    -> full visitor list (owner key required)
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

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (p === '/health') return text('ok');

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
        const r = await fetch('https://kingshot.net/api/events' + (w ? '?week=' + encodeURIComponent(w) : ''),
          { cf: { cacheTtl: 1800, cacheEverything: true } });
        return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800', ...CORS } });
      }
      if (p === '/codes' && req.method === 'GET') {
        const r = await fetch('https://kingshot.net/api/gift-codes', { cf: { cacheTtl: 3600, cacheEverything: true } });
        return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS } });
      }

      // ---- sync slots (key-value, client owns the random secret code) ----
      const mSync = p.match(/^\/sync\/([A-Za-z0-9_-]{8,80})$/);
      if (mSync) {
        const code = mSync[1];
        if (req.method === 'GET') {
          const row = await env.DB.prepare('SELECT data FROM sync WHERE code=?1').bind(code).first();
          return text(row ? row.data : '');
        }
        if (req.method === 'PUT' || req.method === 'POST') {
          const body = await req.text();
          if (!body || body.length > 262144) return json({ error: 'size' }, 413);
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
        const rs = await env.DB.prepare('SELECT pid,nick,kid,tc,first,last,visits FROM visitors ORDER BY last DESC, visits DESC LIMIT 1000').all();
        return json({ visitors: rs.results || [] });
      }

      return json({ error: 'notfound' }, 404);
    } catch (e) {
      return json({ error: 'server' }, 500);
    }
  },
};
