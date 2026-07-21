/* Fix #1 — redeem terhadap protokol gift-code Century yang BARU.

   Ground truth: request asli disadap dari situs resmi ks-giftcode.centurygame.com
   pada 21 Jul 2026 (Chrome DevTools), lalu direproduksi dari nol via Node.

     POST https://kingshot-giftcode.centurygame.com/api/gift_code
     sign=171b3e392cf48d88a048fdf50a73ceaa&fid=330300846&cdk=TESTPROBE1
     &kid=2114&time=1784621714
     -> {"code":1,"data":[],"msg":"CDK NOT FOUND.","err_code":40014}

   Yang berubah dari protokol lama:
     - langkah "login" ke /api/player DIHAPUS (endpoint-nya sekarang 404, dan
       halaman 404-nya tidak mengirim header CORS -> fetch reject di browser,
       yang muncul ke user sebagai "Gagal terhubung").
     - `kid` (Kingdom ID) jadi parameter WAJIB; tanpa/salah -> 40020.
     - `time` dalam DETIK, bukan milidetik (ms -> msg "time Expired").
     - sign = md5(params urut abjad, "k=v" digabung "&", + SALT). SALT tetap.

   Tanda tangan fungsi ikut berubah: ksRedeem(fid, code, kid). */
const { createEnv, t, eq, ok, done } = require('./harness.js');

/* Env yang membalas /api/gift_code dengan JSON tertentu sambil merekam SETIAP
   request (url + body mentah) supaya bentuk protokolnya bisa diperiksa. */
function envWithGiftResponse(giftJson) {
  const sent = [];
  const env = createEnv({
    fetch: (url, init) => {
      const body = (init && init.body) || '';
      const params = {};
      for (const kv of String(body).split('&')) {
        const i = kv.indexOf('=');
        if (i > 0) params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
      }
      sent.push({ url, body: String(body), params, isGift: /gift_code/.test(url) });
      const json = /gift_code/.test(url) ? giftJson : { code: 0, data: {} };
      return Promise.resolve({
        json: () => Promise.resolve(json),
        text: () => Promise.resolve(JSON.stringify(json)),
        /* API asli tidak mengirim Access-Control-Expose-Headers, jadi di browser
           header `Date` selalu null dari JS. Modelkan itu. */
        headers: { get: () => null },
      });
    },
  });
  return { env, sent };
}

const FID = '330300846', KID = '2114', CDK = 'ABC123';
const CLOCK_MSG = /[Jj]am perangkat meleset/;

console.log('Fix #1 — protokol redeem baru (kid + detik + tanpa login)');

(async () => {
  /* ---- 1. BENTUK PROTOKOL ---- */
  {
    const { env, sent } = envWithGiftResponse({ code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 });
    env.evalIn('ksClock').offset = 0;
    const beforeSec = Math.floor(Date.now() / 1000);
    await env.evalIn('ksRedeem')(FID, CDK, KID);
    const afterSec = Math.floor(Date.now() / 1000);

    t('hanya SATU request — tidak ada lagi langkah login ke /api/player', () => {
      eq(sent.length, 1, 'jumlah request');
      ok(sent[0].isGift, 'request bukan ke /api/gift_code: ' + sent[0].url);
    });

    t('/api/player tidak pernah disentuh lagi (404 tanpa CORS = "Gagal terhubung")', () => {
      ok(!sent.some(s => /\/api\/player/.test(s.url)), 'masih memanggil /api/player');
    });

    t('mengirim kid (Kingdom ID) — wajib, tanpa ini server balas 40020', () => {
      eq(sent[0].params.kid, KID, 'param kid');
    });

    t('mengirim fid & cdk', () => {
      eq(sent[0].params.fid, FID, 'param fid');
      eq(sent[0].params.cdk, CDK, 'param cdk');
    });

    t('time dikirim dalam DETIK, bukan milidetik', () => {
      const time = Number(sent[0].params.time);
      ok(time >= beforeSec - 2 && time <= afterSec + 2,
        'time=' + time + ' bukan epoch detik (epoch detik sekarang ~' + beforeSec + ')');
    });

    t('sign = md5(params urut abjad + SALT) — cocok dengan request asli', () => {
      const md5 = env.evalIn('md5'), SALT = env.evalIn('KS_SALT');
      const p = sent[0].params;
      const base = Object.keys(p).filter(k => k !== 'sign').sort()
        .map(k => k + '=' + p[k]).join('&');
      eq(p.sign, md5(base + SALT), 'sign atas "' + base + '"');
    });
  }

  /* Vektor uji dari request asli yang disadap: implementasi sign kita harus
     mereproduksi hash ini persis, kalau tidak protokolnya salah. */
  t('vektor sign nyata dari situs resmi tereproduksi', () => {
    const { env } = envWithGiftResponse({ code: 0 });
    const md5 = env.evalIn('md5'), SALT = env.evalIn('KS_SALT');
    const base = 'cdk=TESTPROBE1&fid=330300846&kid=2114&time=1784621714';
    eq(md5(base + SALT), '171b3e392cf48d88a048fdf50a73ceaa', 'SALT/urutan sign berubah?');
  });

  /* ---- 2. PEMETAAN PESAN ---- */
  const cases = [
    { name: 'sukses', json: { code: 0, msg: 'SUCCESS' }, cls: 'ok' },
    { name: 'CDK NOT FOUND -> kode salah', json: { code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 }, cls: 'bad' },
    { name: 'sudah dipakai', json: { code: 1, msg: 'RECEIVED' }, cls: 'warn' },
    { name: 'kode sejenis sudah diambil', json: { code: 1, msg: 'SAME TYPE EXCHANGE.' }, cls: 'warn' },
    { name: 'captcha', json: { code: 1, msg: 'CAPTCHA NEEDED' }, cls: 'warn' },
    { name: 'kedaluwarsa', json: { code: 1, msg: 'CDK EXPIRED' }, cls: 'bad' },
  ];
  for (const c of cases) {
    const { env } = envWithGiftResponse(c.json);
    const res = await env.evalIn('ksRedeem')(FID, CDK, KID);
    t('regresi: ' + c.name, () => eq(res.cls, c.cls, 'cls untuk ' + c.name));
  }

  /* 40020 = fid/kid tidak cocok. Ini error BARU dan paling mungkin dilihat user
     (mis. Kingdom belum diisi di profil) — pesannya harus menyebut Kingdom. */
  {
    const { env } = envWithGiftResponse({ code: 1, data: [], msg: 'USER INFO ERROR.', err_code: 40020 });
    const res = await env.evalIn('ksRedeem')(FID, CDK, '9999999');
    t('40020 USER INFO ERROR menyebut Player ID / Kingdom', () => {
      ok(/kingdom/i.test(res.txt), 'tidak menyebut Kingdom: ' + JSON.stringify(res));
    });
    t('40020 tidak dituduhkan ke jam perangkat', () => {
      ok(!CLOCK_MSG.test(res.txt), 'menyalahkan jam: ' + JSON.stringify(res));
    });
  }

  /* "time Expired" = kita kirim milidetik. Itu bug app, bukan jam user — jangan
     suruh user menyetel jamnya. */
  {
    const { env } = envWithGiftResponse({ code: 1, data: [], msg: 'time Expired', err_code: 0 });
    const res = await env.evalIn('ksRedeem')(FID, CDK, KID);
    t('"time Expired" tidak menyuruh user menyinkronkan jam', () => {
      ok(!CLOCK_MSG.test(res.txt), 'menyalahkan jam: ' + JSON.stringify(res));
    });
  }

  /* TOO FREQUENT = batas laju PER AKUN, terpisah dari X-RateLimit 30/menit.
     Terukur 21 Jul 2026 (fid 330300846): 6 permintaan berjarak 2,1 dtk sudah
     memicunya pada permintaan ke-7 padahal header masih sisa 23/30; pulih
     setelah ~60 detik menganggur; jarak 10 dtk aman untuk 10 permintaan.
     Ini KEGAGALAN SEMENTARA: jangan ditandai selesai, dan jangan disamakan
     dengan kode salah. */
  {
    const { env } = envWithGiftResponse({ code: 1, data: [], msg: 'TOO FREQUENT.', err_code: 40101 });
    const res = await env.evalIn('ksRedeem')(FID, CDK, KID);
    t('TOO FREQUENT dikenali sebagai pembatasan sementara', () => {
      ok(res.tooFrequent === true, 'tidak ditandai tooFrequent: ' + JSON.stringify(res));
      ok(!res.done, 'salah ditandai selesai — kode ini tak akan pernah ditebus');
      eq(res.cls, 'warn');
    });
    t('TOO FREQUENT tidak dibaca sebagai kode salah', () =>
      ok(!/salah|tak ada/i.test(res.txt), 'pesan menyesatkan: ' + res.txt));
  }

  /* Hasil yang permanen harus ditandai `done` supaya auto-redeem berhenti
     mengulangnya tiap 12 jam (lihat ksMarkCode / test_09). */
  for (const c of [
    { name: 'RECEIVED', json: { code: 1, msg: 'RECEIVED' } },
    { name: 'SAME TYPE EXCHANGE', json: { code: 1, msg: 'SAME TYPE EXCHANGE.' } },
  ]) {
    const { env } = envWithGiftResponse(c.json);
    const res = await env.evalIn('ksRedeem')(FID, CDK, KID);
    t(c.name + ' ditandai selesai (tak diulang tiap 12 jam)', () => ok(res.done === true, JSON.stringify(res)));
  }
  /* Sebaliknya: kegagalan sementara TIDAK boleh ditandai selesai. */
  {
    const { env } = envWithGiftResponse({ code: 1, data: [], msg: 'USER INFO ERROR.', err_code: 40020 });
    const res = await env.evalIn('ksRedeem')(FID, CDK, KID);
    t('error Kingdom TIDAK ditandai selesai (bisa dibetulkan lalu diulang)', () => ok(!res.done, JSON.stringify(res)));
  }

  {
    const { env } = envWithGiftResponse({ code: 1, data: [], msg: 'Sign Error', err_code: 0 });
    const res = await env.evalIn('ksRedeem')(FID, CDK, KID);
    t('"Sign Error" dilaporkan sebagai bug app, bukan jam', () => {
      ok(!CLOCK_MSG.test(res.txt), 'menyalahkan jam: ' + JSON.stringify(res));
    });
  }

  /* ---- 3. nudge manual tidak boleh masuk ke `time` yang ditandatangani ---- */
  {
    const { env, sent } = envWithGiftResponse({ code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 });
    const ksClock = env.evalIn('ksClock');
    ksClock.offset = 0;
    ksClock.setNudge(90); // user "mengoreksi" jam +90 menit
    const beforeSec = Math.floor(Date.now() / 1000);
    await env.evalIn('ksRedeem')(FID, CDK, KID);
    t('time yang ditandatangani mengabaikan nudge manual', () => {
      const gift = sent.filter(s => s.isGift);
      eq(gift.length, 1, 'jumlah request gift_code');
      const skew = Number(gift[0].params.time) - beforeSec;
      ok(Math.abs(skew) <= 3, 'time meleset ' + Math.round(skew / 60) + ' menit — nudge bocor ke signature');
    });
    t('nudge tetap berlaku untuk tampilan / hitungan tanggal', () => {
      const delta = ksClock.now().getTime() - Date.now();
      ok(Math.abs(delta - 90 * 60000) < 2000, 'nudge hilang dari now(); delta=' + delta);
    });
  }

  /* ---- 4. kid hilang harus gagal cepat, bukan menembak server sia-sia ---- */
  {
    const { env, sent } = envWithGiftResponse({ code: 0, msg: 'SUCCESS' });
    const res = await env.evalIn('ksRedeem')(FID, CDK, '');
    t('kid kosong -> tidak ada request, langsung minta Kingdom diisi', () => {
      eq(sent.length, 0, 'seharusnya tidak menembak server tanpa kid');
      ok(/kingdom/i.test(res.txt), 'pesan tidak menyebut Kingdom: ' + JSON.stringify(res));
      eq(res.cls, 'warn', 'cls');
    });
  }

  done();
})();
