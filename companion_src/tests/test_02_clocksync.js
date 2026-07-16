/* Fix #2 — the clock resync must actually run in a browser.
   Verified against the live API (curl, Jul 2026): responses carry
   `Access-Control-Allow-Origin: *` but NO `Access-Control-Expose-Headers`, and
   `Date` is not a CORS-safelisted response header. So in a browser
   `res.headers.get('date')` is ALWAYS null and the "this is what kills the 40004"
   resync at 03_*.js:252/:299 never ran. Node's fetch doesn't enforce CORS, which
   is why it looked fine when probed from the CLI.
   Fix: sync from our OWN worker (/time, JSON body — no header exposure needed),
   fall back to timeapi.io. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const OWN = 'old-kingshot-api.old-kingshot.workers.dev';
const SRV_NOW = Date.UTC(2026, 6, 16, 12, 0, 0); // authoritative "server" time

/* fetch stub: records calls, replays per-host canned responses */
function stubFetch(routes) {
  const calls = [];
  return {
    calls,
    fetch: (url, init) => {
      calls.push(String(url));
      for (const [pat, res] of routes) {
        if (String(url).includes(pat)) {
          if (res === 'fail') return Promise.reject(new Error('network'));
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(res),
            text: () => Promise.resolve(JSON.stringify(res)),
            /* browser reality: Date header is not exposed cross-origin */
            headers: { get: () => null },
          });
        }
      }
      return Promise.reject(new Error('unrouted: ' + url));
    },
  };
}

console.log('Fix #2 — clock sync source');

(async () => {
  /* ---- 1. own worker is the primary source ---- */
  {
    const s = stubFetch([[OWN + '/time', { now: SRV_NOW }]]);
    const env = createEnv({ fetch: s.fetch });
    const ksClock = env.evalIn('ksClock');
    ksClock.offset = 0; ksClock.nudge = 0;
    const okRes = await ksClock.sync();
    t('sync() succeeds from our own worker /time', () => ok(okRes === true, 'sync returned ' + okRes));
    t('sync() hits /time before any third party', () => {
      ok(s.calls.length >= 1, 'no fetch at all');
      ok(s.calls[0].includes(OWN + '/time'), 'first call was ' + s.calls[0]);
    });
    t('offset lands on server time', () => {
      const drift = ksClock.now().getTime() - SRV_NOW;
      ok(Math.abs(drift) < 2000, 'clock is ' + drift + 'ms off server time');
    });
    t('sync marks the clock as synced', () => ok(ksClock.synced === true));
  }

  /* ---- 2. timeapi.io is the fallback when our worker is down ---- */
  {
    const s = stubFetch([
      [OWN + '/time', 'fail'],
      ['timeapi.io', { year: 2026, month: 7, day: 16, hour: 12, minute: 0, seconds: 0, milliSeconds: 0 }],
    ]);
    const env = createEnv({ fetch: s.fetch });
    const ksClock = env.evalIn('ksClock');
    ksClock.offset = 0; ksClock.nudge = 0;
    const okRes = await ksClock.sync();
    t('falls back to timeapi.io when our worker fails', () => {
      ok(okRes === true, 'sync returned ' + okRes);
      ok(s.calls.some(c => c.includes('timeapi.io')), 'timeapi.io was never tried');
      const drift = ksClock.now().getTime() - SRV_NOW;
      ok(Math.abs(drift) < 2000, 'fallback clock is ' + drift + 'ms off');
    });
  }

  /* ---- 3. both sources down -> honest failure, device clock, no false "synced" ---- */
  {
    const s = stubFetch([[OWN + '/time', 'fail'], ['timeapi.io', 'fail']]);
    const env = createEnv({ fetch: s.fetch });
    const ksClock = env.evalIn('ksClock');
    ksClock.offset = 0; ksClock.nudge = 0; ksClock.synced = false;
    const okRes = await ksClock.sync();
    t('all sources down -> sync() reports failure and does not claim synced', () => {
      ok(okRes === false, 'sync returned ' + okRes);
      ok(ksClock.synced === false, 'wrongly marked synced');
    });
  }

  /* ---- 4. the dead Date-header path is gone (no reliance on a hidden header) ---- */
  {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', '03_7897e180.js'), 'utf8');
    t('no code reads the CORS-hidden Date response header', () => {
      const hits = src.split('\n')
        .map((l, i) => [i + 1, l])
        .filter(([, l]) => /headers\.get\(\s*['"]date['"]\s*\)/i.test(l));
      ok(hits.length === 0, 'still reading Date header at line(s) ' + hits.map(h => h[0]).join(', '));
    });
  }

  /* ---- 5. redeem still works end-to-end with no Date header present ---- */
  {
    const s = stubFetch([
      ['api/player', { code: 0, data: {} }],
      ['api/gift_code', { code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 }],
    ]);
    const env = createEnv({ fetch: s.fetch });
    const res = await env.evalIn('ksRedeem')('330300846', 'ABC123');
    t('regression: ksRedeem works without any Date header', () => eq(res.cls, 'bad'));
  }

  done();
})();
