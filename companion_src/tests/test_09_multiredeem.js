/* Fitur: kode baru otomatis di-redeem ke SEMUA karakter terdaftar.

   Latar: sampai Jul 2026 auto-redeem hanya menyentuh profil AKTIF, jadi karakter
   kedua dst. cuma kebagian kalau user ingat menekan tombol. Riwayat redeem
   sebenarnya SUDAH per-karakter (kunci 'codesDone' ada di PROFILE_KEYS →
   ks_p_<pid>_codesDone), tapi `store` selalu menunjuk profil aktif — makanya
   dipakai codesDoneGet/Set yang membaca per pid. Isolasi itu yang diuji di sini:
   kode yang sudah masuk ke karakter A TIDAK boleh dianggap selesai untuk B. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const A = { pid: '330300846', kingdom: '2114', nick: 'A' };
const B = { pid: '343522603', kingdom: '3000', nick: 'B' };
const CODES = [{ code: 'ALPHA1', exp: '-' }, { code: 'BETA2', exp: '-' }];

/* fetch yang mencatat tiap redeem dan bisa diberi balasan per kode */
function redeemFetch(reply) {
  const calls = [];
  const fetch = (url, init) => {
    const body = String((init && init.body) || '');
    const params = {};
    for (const kv of body.split('&')) {
      const i = kv.indexOf('=');
      if (i > 0) params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    }
    calls.push(params);
    const json = reply ? reply(params) : { code: 0, msg: 'SUCCESS' };
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(json),
      text: () => Promise.resolve(JSON.stringify(json)),
      headers: { get: () => null },
    });
  };
  return { fetch, calls };
}

function envWith(profiles, fetchImpl) {
  const env = createEnv({
    storage: {
      ks_profiles: JSON.stringify(profiles),
      ks_activePid: JSON.stringify(profiles[0] ? profiles[0].pid : ''),
      ks_profilesV: '1',
    },
    fetch: fetchImpl,
  });
  env.evalIn('ksClock').offset = 0;
  /* HARUS lewat evalIn: KS_REDEEM_GAP dideklarasikan `let` di top-level, jadi ia
     hidup di lexical scope vm dan BUKAN properti objek global — `env.ctx.X = 0`
     cuma membuat global baru yang tak pernah dibaca kode, dan test diam-diam
     berjalan dengan jeda produksi (11 detik). */
  env.evalIn('KS_REDEEM_GAP = 0; KS_REDEEM_COOLDOWN = 0; _ksLastRedeem = 0; _ksCooldownUntil = 0');
  return env;
}

const doneKey = pid => 'ks_p_' + pid + '_codesDone';

console.log('Auto-redeem ke semua karakter');

(async () => {
  /* ---- 1. daftar sasaran ---- */
  {
    const env = envWith([A, B, { pid: A.pid, kingdom: A.kingdom }, { pid: '' }]);
    const targets = env.ctx.ksRedeemTargets();
    t('semua karakter jadi sasaran, duplikat & pid kosong dibuang', () => {
      eq(targets.map(x => x.pid), [A.pid, B.pid]);
    });
    t('kingdom ikut terbawa per karakter', () =>
      eq(targets.map(x => x.kingdom), [A.kingdom, B.kingdom]));
  }

  /* Karakter tanpa Kingdom tetap muncul sebagai sasaran — supaya UI bisa bilang
     "isi Kingdom", bukan diam-diam melewatinya. */
  {
    const env = envWith([{ pid: B.pid, nick: 'B', kingdom: '' }]);
    t('karakter tanpa Kingdom tidak disembunyikan', () => {
      const tg = env.ctx.ksRedeemTargets();
      eq(tg.length, 1);
      eq(tg[0].kingdom, '');
    });
  }

  /* ---- 2. riwayat terisolasi per karakter ---- */
  {
    const env = envWith([A, B]);
    env.ctx.ksMarkCode(A.pid, 'ALPHA1', { cls: 'ok', txt: 'Berhasil' });
    t('menandai kode untuk A tidak menyentuh riwayat B', () => {
      eq(env.ctx.ksCodesTodo(A.pid, CODES).map(g => g.code), ['BETA2'], 'sisa untuk A');
      eq(env.ctx.ksCodesTodo(B.pid, CODES).map(g => g.code), ['ALPHA1', 'BETA2'], 'sisa untuk B');
    });
    t('riwayat disimpan di kunci per-karakter', () => {
      ok(env.storage.has(doneKey(A.pid)), 'tidak menulis ' + doneKey(A.pid));
      ok(!env.storage.has(doneKey(B.pid)), 'malah ikut menulis riwayat B');
    });
  }

  /* ---- 3. yang gagal dicoba lagi, yang sukses tidak ---- */
  {
    const env = envWith([A]);
    env.ctx.ksMarkCode(A.pid, 'ALPHA1', { cls: 'bad', txt: 'gagal' });
    t('kode gagal tidak langsung dicoba ulang (jeda 12 jam)', () =>
      eq(env.ctx.ksCodesTodo(A.pid, CODES).map(g => g.code), ['BETA2']));

    const rec = JSON.parse(env.storage.get(doneKey(A.pid)));
    rec.alpha1.t -= 13 * 3600 * 1000;                    // mundurkan 13 jam
    env.storage.set(doneKey(A.pid), JSON.stringify(rec));
    t('lewat 12 jam, kode gagal dicoba lagi', () =>
      eq(env.ctx.ksCodesTodo(A.pid, CODES).map(g => g.code), ['ALPHA1', 'BETA2']));

    env.ctx.ksMarkCode(A.pid, 'ALPHA1', { cls: 'warn', txt: 'Sudah dipakai', done: true });
    const rec2 = JSON.parse(env.storage.get(doneKey(A.pid)));
    rec2.alpha1.t -= 99 * 3600 * 1000;
    env.storage.set(doneKey(A.pid), JSON.stringify(rec2));
    t('"sudah dipakai" tidak pernah dicoba ulang, selama apa pun', () =>
      eq(env.ctx.ksCodesTodo(A.pid, CODES).map(g => g.code), ['BETA2']));
  }

  /* ---- 4. autoRedeemNew menembak SEMUA karakter ---- */
  {
    const { fetch, calls } = redeemFetch();
    const env = envWith([A, B], fetch);
    env.evalIn('_liveCodes = ' + JSON.stringify(CODES));
    env.evalIn('_codesFallback = false');
    await env.ctx.autoRedeemNew();

    t('tiap kode ditembak untuk tiap karakter (2 kode x 2 karakter = 4)', () =>
      eq(calls.length, 4));
    t('fid+kid tiap permintaan berpasangan benar', () => {
      const pairs = calls.map(c => c.fid + '/' + c.kid + '/' + c.cdk).sort();
      eq(pairs, [
        A.pid + '/' + A.kingdom + '/ALPHA1',
        A.pid + '/' + A.kingdom + '/BETA2',
        B.pid + '/' + B.kingdom + '/ALPHA1',
        B.pid + '/' + B.kingdom + '/BETA2',
      ]);
    });
    t('hasil tercatat di riwayat MASING-MASING karakter', () => {
      for (const pid of [A.pid, B.pid]) {
        const rec = JSON.parse(env.storage.get(doneKey(pid)) || '{}');
        eq(Object.keys(rec).sort(), ['alpha1', 'beta2'], 'riwayat ' + pid);
        eq(rec.alpha1.r, 'ok', 'hasil alpha1 ' + pid);
      }
    });
  }

  /* Jalan kedua harus diam: semua sudah ok, tidak ada permintaan baru. */
  {
    const { fetch, calls } = redeemFetch();
    const env = envWith([A, B], fetch);
    env.evalIn('_liveCodes = ' + JSON.stringify(CODES));
    env.evalIn('_codesFallback = false');
    await env.ctx.autoRedeemNew();
    const first = calls.length;
    await env.ctx.autoRedeemNew();
    t('membuka tab lagi tidak menembak API sama sekali', () => {
      eq(first, 4, 'jalan pertama');
      eq(calls.length, 4, 'jalan kedua menambah ' + (calls.length - first) + ' permintaan');
    });
  }

  /* ---- 5. karakter tanpa Kingdom: jangan tembak, jangan ditandai selesai ---- */
  {
    const { fetch, calls } = redeemFetch();
    const env = envWith([A, { pid: B.pid, nick: 'B', kingdom: '' }], fetch);
    env.evalIn('_liveCodes = ' + JSON.stringify(CODES));
    env.evalIn('_codesFallback = false');
    await env.ctx.autoRedeemNew();
    t('tanpa Kingdom tidak membuang jatah rate limit', () => {
      eq(calls.length, 2, 'hanya karakter ber-Kingdom yang ditembak');
      ok(calls.every(c => c.fid === A.pid), 'ada permintaan untuk karakter tanpa Kingdom');
    });
    t('tanpa Kingdom TIDAK ditandai selesai — nanti diulang setelah diisi', () => {
      ok(!env.storage.has(doneKey(B.pid)), 'kode tertandai selesai padahal tak pernah dikirim');
      eq(env.ctx.ksCodesTodo(B.pid, CODES).length, 2);
    });
  }

  /* ---- 5b. TOO FREQUENT: berhenti, jangan tandai, lanjutkan lain kali ----
     Batas per-akun (terukur: ~6 permintaan/menit, pulih setelah ~60 dtk). Kalau
     kena, meneruskan penembakan cuma memperpanjang hukuman — dan menandai
     hasilnya berarti kode yang BELUM ditebus dianggap selesai. */
  {
    let n = 0;
    const { fetch, calls } = redeemFetch(() => (++n <= 1
      ? { code: 0, msg: 'SUCCESS' }
      : { code: 1, data: [], msg: 'TOO FREQUENT.', err_code: 40101 }));
    const env = envWith([A, B], fetch);
    env.evalIn('_liveCodes = ' + JSON.stringify(CODES));
    env.evalIn('_codesFallback = false');
    await env.ctx.autoRedeemNew();

    t('kena TOO FREQUENT -> berhenti menembak, tidak dilanjutkan membabi buta', () => {
      ok(calls.length <= 2, 'masih menembak ' + calls.length + ' kali setelah dibatasi');
    });
    t('hanya yang BENAR-BENAR berhasil yang ditandai', () => {
      const recA = JSON.parse(env.storage.get(doneKey(A.pid)) || '{}');
      eq(Object.keys(recA), ['alpha1'], 'riwayat A');
      eq(recA.alpha1.r, 'ok');
    });
    t('kode yang kena batas tetap tersisa untuk dicoba lagi', () => {
      ok(env.ctx.ksCodesTodo(A.pid, CODES).some(g => g.code === 'BETA2'), 'BETA2 hilang dari antrean');
      eq(env.ctx.ksCodesTodo(B.pid, CODES).length, 2, 'antrean B');
    });
  }

  /* ---- 6. throttle rate limit ---- */
  {
    const { fetch } = redeemFetch();
    const env = envWith([A], fetch);
    env.evalIn('KS_REDEEM_GAP = 150');
    const t0 = Date.now();
    await env.ctx.ksRedeemThrottled(A.pid, 'ALPHA1', A.kingdom);
    await env.ctx.ksRedeemThrottled(A.pid, 'BETA2', A.kingdom);
    const el = Date.now() - t0;
    t('panggilan berurutan diberi jeda (lindungi batas per-akun)', () =>
      ok(el >= 140 && el < 3000, 'elapsed ' + el + 'ms — jeda tidak sesuai setelan'));
  }

  /* jeda produksi harus cukup lebar untuk batas yang TERUKUR (~6/menit) */
  {
    const env = envWith([A]);
    env.evalIn('KS_REDEEM_GAP = 11000');   // kembalikan ke nilai produksi
    t('jeda produksi menjaga laju di bawah ~6 permintaan/menit', () => {
      const gap = env.evalIn('KS_REDEEM_GAP');
      const perMenit = 60000 / gap;
      ok(perMenit <= 6, 'jeda ' + gap + 'ms = ' + perMenit.toFixed(1) + '/menit, di atas batas terukur');
    });
  }

  /* kid kosong tidak boleh ikut kena jeda: itu ditolak lokal, bukan permintaan */
  {
    const { fetch, calls } = redeemFetch();
    const env = envWith([A], fetch);
    env.evalIn('KS_REDEEM_GAP = 5000');
    const t0 = Date.now();
    const r = await env.ctx.ksRedeemThrottled(A.pid, 'ALPHA1', '');
    t('kid kosong ditolak instan tanpa jaringan', () => {
      ok(Date.now() - t0 < 1000, 'ikut menunggu throttle padahal tak ada permintaan');
      eq(calls.length, 0);
      eq(r.cls, 'warn');
    });
  }

  done();
})();
