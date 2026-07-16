/* Fix #3 — switching servers must carry that server's identity + open date.
   Two stores of truth exist: the GLOBAL `ks_profiles` meta list (pid/nick/kingdom/tc/start)
   and the PER-PROFILE `ks_p_<pid>_profile` object that profileAge() actually reads.
   setActiveProfile() only flips activePid, so a profile added via "+ Tambah" (which
   never fetched an open date either) lands on an empty slot -> age null -> the
   Sekarang tab says "Belum terhubung" and the calendar/HoG go blank or wrong. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const A = { pid: '330300846', kid: '2114', start: '2026-05-27' };
const B = { pid: '343522603', kid: '3000', start: '2026-06-20' };

/* kingdom-tracker passthrough stub: kingdom id -> openTime */
function kingdomFetch(dates) {
  return url => {
    const m = String(url).match(/\/kingdom\/(\d+)/);
    if (m && dates[m[1]]) {
      const body = { data: { servers: [{ openTime: dates[m[1]] + 'T00:06:00Z' }] } };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)), headers: { get: () => null } });
    }
    if (/api\/player/.test(String(url))) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 0, data: {} }), headers: { get: () => null } });
    }
    return Promise.reject(new Error('offline'));
  };
}

function envWith(profiles, activePid, slots = {}, fetchImpl) {
  const storage = { ks_profiles: JSON.stringify(profiles), ks_activePid: JSON.stringify(activePid), ks_profilesV: '1' };
  for (const [pid, obj] of Object.entries(slots)) storage['ks_p_' + pid + '_profile'] = JSON.stringify(obj);
  return createEnv({ storage, fetch: fetchImpl || kingdomFetch({ [A.kid]: A.start, [B.kid]: B.start }) });
}

console.log('Fix #3 — profile switching');

(async () => {
  /* ---- 1. switching to a profile that only exists in the meta list ---- */
  {
    const env = envWith(
      [{ pid: A.pid, nick: 'INDONenen13', kingdom: A.kid, tc: '20', start: A.start },
       { pid: B.pid, nick: 'Alt', kingdom: B.kid, tc: '9', start: B.start }],
      A.pid,
      { [A.pid]: { pid: A.pid, kingdom: A.kid, tc: '20', start: A.start } }, // B has no slot yet
    );
    env.ctx.setActiveProfile(B.pid);
    const pa = env.ctx.profileAge();
    t('switching to a meta-only profile still yields a server age', () =>
      ok(pa.age != null && pa.age >= 1, 'age=' + pa.age + ' (profile slot never seeded)'));
    t('switched profile carries ITS OWN open date, not the old server\'s', () =>
      eq(env.evalIn('store').get('profile', {}).start, B.start));
    t('switched profile carries its own kingdom', () =>
      eq(env.evalIn('store').get('profile', {}).kingdom, B.kid));
  }

  /* ---- 2. no bleed when switching back and forth ---- */
  {
    const env = envWith(
      [{ pid: A.pid, nick: 'A', kingdom: A.kid, tc: '20', start: A.start },
       { pid: B.pid, nick: 'B', kingdom: B.kid, tc: '9', start: B.start }],
      A.pid,
      { [A.pid]: { pid: A.pid, kingdom: A.kid, tc: '20', start: A.start } },
    );
    env.ctx.setActiveProfile(B.pid);
    const bAge = env.ctx.profileAge().age;
    env.ctx.setActiveProfile(A.pid);
    const aAge = env.ctx.profileAge().age;
    env.ctx.setActiveProfile(B.pid);
    const bAge2 = env.ctx.profileAge().age;
    t('each server keeps its own age across switches', () => {
      eq(env.evalIn('store').get('profile', {}).start, B.start, 'B start after round-trip');
      ok(aAge > bAge, 'older server A (' + aAge + ') should out-age B (' + bAge + ')');
      eq(bAge2, bAge, 'B age changed after a round-trip');
    });
  }

  /* ---- 3. seeding must not clobber per-profile settings ---- */
  {
    const env = envWith(
      [{ pid: B.pid, nick: 'B', kingdom: B.kid, tc: '9', start: B.start }],
      A.pid,
      { [B.pid]: { mode: 'p2w', eventTimes: { bear: '20:00' } } }, // settings exist, identity doesn't
    );
    env.ctx.setActiveProfile(B.pid);
    const p = env.evalIn('store').get('profile', {});
    t('seeding fills identity without wiping mode/eventTimes', () => {
      eq(p.mode, 'p2w', 'mode lost');
      eq(p.eventTimes && p.eventTimes.bear, '20:00', 'eventTimes lost');
      eq(p.start, B.start, 'start not seeded');
    });
  }

  /* ---- 4. an existing slot's own data wins over the meta list ---- */
  {
    const env = envWith(
      [{ pid: B.pid, nick: 'B', kingdom: B.kid, tc: '9', start: '2026-01-01' }], // stale meta
      A.pid,
      { [B.pid]: { pid: B.pid, kingdom: B.kid, tc: '9', start: B.start } },      // slot is authoritative
    );
    env.ctx.setActiveProfile(B.pid);
    t('an already-populated slot is not overwritten by stale meta', () =>
      eq(env.evalIn('store').get('profile', {}).start, B.start));
  }

  /* ---- 5. autoDetectProfiles must refresh `start` when the kingdom changes ---- */
  {
    /* player API now reports this fid in a DIFFERENT kingdom than stored */
    const fetchImpl = url => {
      if (/api\/player/.test(String(url)))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 0, data: { nickname: 'A', kid: B.kid, stove_lv: 22 } }), headers: { get: () => null } });
      return kingdomFetch({ [A.kid]: A.start, [B.kid]: B.start })(url);
    };
    const env = envWith(
      [{ pid: A.pid, nick: 'A', kingdom: A.kid, tc: '20', start: A.start }],
      A.pid,
      { [A.pid]: { pid: A.pid, kingdom: A.kid, tc: '20', start: A.start } },
      fetchImpl,
    );
    await env.ctx.autoDetectProfiles();
    const p = env.evalIn('store').get('profile', {});
    t('kingdom change refreshes the stored open date', () => {
      eq(p.kingdom, B.kid, 'kingdom not refreshed');
      eq(p.start, B.start, 'start still points at the OLD server -> wrong age + wrong HoG dates');
    });
    t('kingdom change refreshes the meta list too', () =>
      eq(env.evalIn('store').get('profiles', []).find(x => x.pid === A.pid).start, B.start));
  }

  /* ---- 6. kingdom changed but the date lookup failed -> no stale date ---- */
  {
    const fetchImpl = url => {
      if (/api\/player/.test(String(url)))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 0, data: { nickname: 'A', kid: '999999', stove_lv: 22 } }), headers: { get: () => null } });
      return Promise.reject(new Error('offline')); // kingdom-tracker unreachable, no anchor match
    };
    const env = envWith(
      [{ pid: A.pid, nick: 'A', kingdom: A.kid, tc: '20', start: A.start }],
      A.pid,
      { [A.pid]: { pid: A.pid, kingdom: A.kid, tc: '20', start: A.start } },
      fetchImpl,
    );
    await env.ctx.autoDetectProfiles();
    const p = env.evalIn('store').get('profile', {});
    t('new kingdom with unknown open date does not keep the old date', () => {
      ok(p.start !== A.start, 'kept the old server\'s open date (' + p.start + ') for a different kingdom');
    });
  }

  /* ---- 7. same kingdom, transient lookup failure -> keep what we have ---- */
  {
    const fetchImpl = url => {
      if (/api\/player/.test(String(url)))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 0, data: { nickname: 'A', kid: A.kid, stove_lv: 22 } }), headers: { get: () => null } });
      return Promise.reject(new Error('offline'));
    };
    const env = envWith(
      [{ pid: A.pid, nick: 'A', kingdom: A.kid, tc: '20', start: A.start }],
      A.pid,
      { [A.pid]: { pid: A.pid, kingdom: A.kid, tc: '20', start: A.start } },
      fetchImpl,
    );
    await env.ctx.autoDetectProfiles();
    t('same kingdom + offline keeps the known open date', () =>
      eq(env.evalIn('store').get('profile', {}).start, A.start));
  }

  done();
})();
