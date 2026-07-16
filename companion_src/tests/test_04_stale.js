/* Fix #4 — state that leaks across servers.
   (a) window._kdateEst ("tanggal buka cuma perkiraan ±2-3 hari") is only reset inside
       the offline-fallback branch, but the exact/cached paths return BEFORE it. So an
       estimated lookup for server A leaves the flag true and server B's exact date is
       then labelled a guess.
   (b) _calOffset (which month the calendar is scrolled to) is a module global that
       survives a profile switch, so server B opens on server A's browsed month. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

function kdFetch(dates) {
  return url => {
    const m = String(url).match(/\/kingdom\/(\d+)/);
    if (m && dates[m[1]]) {
      const body = { data: { servers: [{ openTime: dates[m[1]] + 'T00:06:00Z' }] } };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)), headers: { get: () => null } });
    }
    return Promise.reject(new Error('offline'));
  };
}

console.log('Fix #4 — stale cross-server state');

(async () => {
  /* ---- (a) _kdateEst must describe THIS lookup, not a previous one ---- */
  {
    /* kingdom 5000 is unknown to the network -> answered by anchor extrapolation (an estimate) */
    const env = createEnv({ fetch: kdFetch({ '3000': '2026-06-20' }) });
    const est = await env.ctx.fetchKingdomDate('5000');
    t('unknown kingdom is answered by estimate and flagged', () => {
      ok(est, 'no estimate produced');
      ok(env.ctx.window._kdateEst === true, 'estimate not flagged');
    });

    const exact = await env.ctx.fetchKingdomDate('3000');
    t('an exact network lookup clears the estimate flag', () => {
      eq(exact, '2026-06-20');
      ok(env.ctx.window._kdateEst === false, 'server B exact date still labelled "(perkiraan ±2-3 hari)"');
    });
  }
  {
    /* the seeded/cached path returns earliest of all — it must clear the flag too */
    const env = createEnv({ fetch: kdFetch({}) });
    await env.ctx.fetchKingdomDate('5000');                  // estimate -> flag true
    const seeded = await env.ctx.fetchKingdomDate('2114');   // KINGDOM_DATES seed, no network
    t('a seeded/cached exact date clears the estimate flag', () => {
      eq(seeded, '2026-05-27');
      ok(env.ctx.window._kdateEst === false, 'cached exact date still flagged as an estimate');
    });
  }

  /* ---- (b) the calendar month must not follow you across servers ---- */
  {
    const env = createEnv({
      storage: {
        ks_profiles: JSON.stringify([
          { pid: '1', nick: 'A', kingdom: '2114', tc: '20', start: '2026-05-27' },
          { pid: '2', nick: 'B', kingdom: '3000', tc: '9', start: '2026-06-20' },
        ]),
        ks_activePid: JSON.stringify('1'),
        ks_profilesV: '1',
        ks_p_1_profile: JSON.stringify({ pid: '1', kingdom: '2114', tc: '20', start: '2026-05-27' }),
      },
      fetch: kdFetch({}),
    });
    env.evalIn('_calOffset = 5');   // user browsed 5 months ahead on server A
    env.ctx.setActiveProfile('2');
    t('switching profile resets the calendar to the current month', () =>
      eq(env.evalIn('_calOffset'), 0, 'calendar still scrolled to server A\'s month'));
  }

  done();
})();
