/* Fix #5 — HoG schedule + numbering.
   (a) The Sekarang card computes the iteration NUMBER from nextEv.day but pulls the
       hero/rank/duration from hogCurIdx(age) — two different sources. While HoG #1 is
       running (age 6..10) the card is titled "#2" but shows #1's hero and duration.
   (b) predictedEvents() lacks the "this cycle is already over -> predict the next"
       correction that kvk has, so a finished HoG keeps being listed.
   (c) predictedEvents and the calendar emit HoG forever, and hogAdvOccurrence clamps the
       index to 3, so an old server sees a phantom "HoG #8" carrying HoG #4's data. A cap
       is needed — but WHERE it sits (HOG_LAST_NO) is unverified; see the note at (c) below.
   Verified iteration lengths (hogLen): #1=5, #2=6, #3+=7 days; cycle 14, first at day 6. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const START = '2026-05-27';
const startDate = new Date(START + 'T00:00:00Z');

function env() {
  return createEnv({
    storage: {
      ks_activePid: JSON.stringify('1'), ks_profilesV: '1',
      ks_profiles: JSON.stringify([{ pid: '1', nick: 'A', kingdom: '2114', tc: '20', start: START }]),
      ks_p_1_profile: JSON.stringify({ pid: '1', kingdom: '2114', tc: '20', start: START }),
    },
  });
}
const hogDays = (e, age) => e.ctx.predictedEvents(startDate, age).filter(x => x.type === 'hog').map(x => x.day);
const hogNo = day => (day < 6 ? 1 : Math.floor((day - 6) / 14) + 1);

console.log('Fix #5 — HoG schedule + numbering');

const e = env();

/* ---- (b) a finished iteration must drop off the prediction ---- */
t('during HoG #1 (age 8) the running iteration is still listed', () =>
  eq(hogDays(e, 8)[0], 6));
t('after HoG #1 ends (age 11, #1 ran days 6-10) it drops off', () =>
  eq(hogDays(e, 11)[0], 20, 'still predicting a HoG that finished'));
t('after HoG #2 ends (age 26, #2 ran days 20-25) it drops off', () =>
  eq(hogDays(e, 26)[0], 34, 'still predicting a HoG that finished'));
t('mid-iteration #3 (age 36, runs 34-40) stays listed', () =>
  eq(hogDays(e, 36)[0], 34));

/* ---- (c) HoG stops after HOG_LAST_NO ----
   ⚠️ HOG_LAST_NO=5 is an UNVERIFIED assumption, not a sourced fact. No source states
   that HoG stops at #5; kingshotwiki documents #1-#5 and is silent on the total, and
   one community source (kingshotmastery) claims a 6th rotation at ~day 76. These tests
   lock in the CURRENT cap so it can't drift silently — they do not prove it is right.
   Pending in-game verification at H76 (2026-08-10, Kingdom 2114). If #6 turns out to
   exist, raise HOG_LAST_NO and update the expectations below. */
t('no HoG is predicted beyond the cap for a young server', () => {
  const days = hogDays(e, 8);
  const cap = e.evalIn('HOG_LAST_NO');
  ok(days.every(d => hogNo(d) <= cap), 'phantom iterations past #' + cap + ': ' + days.map(d => '#' + hogNo(d)).join(', '));
});
t('age 60 predicts only the last iteration (#5 under the current cap)', () => eq(hogDays(e, 60), [62]));
t('age 70 (past the cap) predicts no HoG at all', () => eq(hogDays(e, 70), []));
t('KvK still predicted for an old server', () => {
  const kv = e.ctx.predictedEvents(startDate, 70).filter(x => x.type === 'kvk');
  ok(kv.length === 1, 'kvk lost');
});

/* ---- (c2) the calendar must stop drawing HoG chips after #5 ---- */
t('calendar draws HoG on day 62 (#5)', () =>
  ok(e.ctx.calEventsOnDay(startDate, 62).some(x => x.type === 'hog')));
/* day 76 = #6 — suppressed by the current (unverified) cap; see the warning above */
t('calendar draws no HoG on day 76 under the current cap', () =>
  ok(!e.ctx.calEventsOnDay(startDate, 76).some(x => x.type === 'hog'), 'HoG #6 chip on the calendar'));

/* ---- (a) number and data must come from the same iteration ---- */
t('hogAdvOccurrence: label number matches the data it returns', () => {
  /* day 20 = HoG #2 -> iters[1] (6 days, per verified data) */
  const o = e.ctx.hogAdvOccurrence(new Date('2026-06-15T00:00:00Z'), START);
  eq(o.no, 2, 'wrong number for day 20');
  eq(o.len, 6, 'HoG #2 duration should be 6 days');
});
t('the Sekarang card numbers the SAME iteration it describes', () => {
  const HOG = e.evalIn('HOG_DETAIL');
  for (const age of [3, 8, 11, 22, 26, 36, 50, 60]) {
    const preds = e.ctx.predictedEvents(startDate, age).slice().sort((a, b) => a.day - b.day);
    const nextEv = preds.find(p => p.day > age) || preds[0];
    if (!nextEv || nextEv.type !== 'hog') continue;
    const no = hogNo(nextEv.day);
    /* what the card renders as the iteration's data */
    const idx = e.ctx.hogIdxForNo ? e.ctx.hogIdxForNo(no) : e.ctx.hogCurIdx(age);
    const it = HOG.iters[idx];
    /* iters[3] covers "#4 & #5" in one entry, so match the number inside the label */
    ok(String(it.no).split(/\D+/).filter(Boolean).includes(String(no)),
      'age ' + age + ': card says HoG #' + no + ' but shows data for HoG ' + it.no);
  }
});

done();
