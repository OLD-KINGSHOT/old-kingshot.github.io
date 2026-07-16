/* Fix #1 — redeem error mapping + nudge must not enter the signed time.
   Ground truth from live probes against kingshot-giftcode.centurygame.com:
     /api/player  time off by 3 days      -> code=0 success        (time not checked)
     /api/gift_code +login, time ±24h     -> 40014 CDK NOT FOUND   (time window >= ±24h)
     /api/gift_code bad sign              -> msg "Sign Error", err_code 0
     /api/gift_code no login session      -> err_code 40004
     /api/gift_code +login, time -3d      -> 40009 "NOT LOGIN."
   => No realistic device-clock skew can produce 40004/40009. Telling the user to
      sync their clock is a misdiagnosis; the nudge they then apply is pure harm. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

/* Build an env whose fetch replays a scripted gift_code response and records the
   `time` value that was actually signed and sent. */
function envWithGiftResponse(giftJson, opts = {}) {
  const sent = [];
  const env = createEnv({
    fetch: (url, init) => {
      const body = (init && init.body) || '';
      const time = Number((body.match(/(?:^|&)time=(\d+)/) || [])[1]);
      sent.push({ url, time, isGift: /gift_code/.test(url) });
      const json = /gift_code/.test(url) ? giftJson : { code: 0, data: {} };
      return Promise.resolve({
        json: () => Promise.resolve(json),
        text: () => Promise.resolve(JSON.stringify(json)),
        /* The real API sends no Access-Control-Expose-Headers, so a browser hides
           `Date` from JS. Model that: headers.get('date') === null. */
        headers: { get: () => null },
      });
    },
  });
  return { env, sent };
}

console.log('Fix #1 — redeem messages + sign time');

const CLOCK_MSG = /[Jj]am perangkat meleset/;

(async () => {
  /* ---- 1. error mapping ---- */
  const cases = [
    { name: '40004 (no login session)', json: { code: 1, data: [], msg: 40004, err_code: 40004 } },
    { name: '40009 "NOT LOGIN."', json: { code: 1, data: [], msg: 'NOT LOGIN.', err_code: 40009 } },
    { name: '"Sign Error" (err_code 0)', json: { code: 1, data: [], msg: 'Sign Error', err_code: 0 } },
  ];
  for (const c of cases) {
    const { env } = envWithGiftResponse(c.json);
    const res = await env.evalIn('ksRedeem')('330300846', 'ABC123');
    t(c.name + ' is not blamed on the device clock', () => {
      ok(!CLOCK_MSG.test(res.txt), 'still says "Jam perangkat meleset": ' + JSON.stringify(res));
    });
  }

  /* login/session errors should say so, so the user waits instead of nudging */
  for (const c of cases.slice(0, 2)) {
    const { env } = envWithGiftResponse(c.json);
    const res = await env.evalIn('ksRedeem')('330300846', 'ABC123');
    t(c.name + ' mentions login/session', () => {
      ok(/sesi|login/i.test(res.txt), 'got: ' + JSON.stringify(res));
    });
  }

  /* known-good mappings must not regress */
  const keep = [
    { name: 'success', json: { code: 0, msg: 'success' }, cls: 'ok' },
    { name: 'CDK NOT FOUND -> kode salah', json: { code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 }, cls: 'bad' },
    { name: 'already used', json: { code: 1, msg: 'RECEIVED' }, cls: 'warn' },
    { name: 'captcha', json: { code: 1, msg: 'CAPTCHA NEEDED' }, cls: 'warn' },
  ];
  for (const c of keep) {
    const { env } = envWithGiftResponse(c.json);
    const res = await env.evalIn('ksRedeem')('330300846', 'ABC123');
    t('regression: ' + c.name, () => eq(res.cls, c.cls, 'cls for ' + c.name));
  }

  /* ---- 2. the manual nudge must never reach the signed `time` ---- */
  {
    const { env, sent } = envWithGiftResponse({ code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 });
    const ksClock = env.evalIn('ksClock');
    ksClock.offset = 0;
    ksClock.setNudge(90); // user "corrects" the clock by +90 minutes
    const before = Date.now();
    await env.evalIn('ksRedeem')('330300846', 'ABC123');
    const after = Date.now();
    t('signed time ignores the manual nudge', () => {
      const gift = sent.filter(s => s.isGift);
      ok(gift.length === 1, 'expected 1 gift_code call, got ' + gift.length);
      const skew = gift[0].time - before;
      ok(skew >= -1000 && skew <= after - before + 1000,
        'signed time is off by ' + Math.round(skew / 60000) + ' min — nudge leaked into the signature');
    });
    t('login call also signs without the nudge', () => {
      const login = sent.filter(s => !s.isGift);
      ok(login.length === 1, 'expected 1 player/login call, got ' + login.length);
      const skew = login[0].time - before;
      ok(skew >= -1000 && skew <= after - before + 1000, 'login signed time skewed by nudge');
    });
    /* the nudge must still work for what it is for: display / date maths */
    t('nudge still shifts ksClock.now() for display + date maths', () => {
      const delta = ksClock.now().getTime() - Date.now();
      ok(Math.abs(delta - 90 * 60000) < 2000, 'nudge lost from now(); delta=' + delta);
    });
  }

  /* ---- 3. ksPlayerLookup signs without the nudge too ---- */
  {
    const { env, sent } = envWithGiftResponse({ code: 0, data: {} });
    const ksClock = env.evalIn('ksClock');
    ksClock.offset = 0; ksClock.setNudge(-45);
    const before = Date.now();
    await env.evalIn('ksPlayerLookup')('330300846');
    t('ksPlayerLookup signs without the nudge', () => {
      ok(sent.length === 1, 'expected 1 call');
      ok(Math.abs(sent[0].time - before) < 2000, 'lookup signed time skewed by ' + Math.round((sent[0].time - before) / 60000) + ' min');
    });
  }

  done();
})();
