/* Robot redeem: menyala saat app dibuka, bukan hanya saat tab Kode dibuka.

   Dulu auto-redeem cuma dipanggil dari fetchCodesUI(), jadi "buka web → kode baru
   langsung ditebus" tak pernah terjadi kecuali pengguna ingat mampir ke tab Kode.
   Itulah keluhan yang melahirkan berkas ini.

   Yang dijaga di sini adalah PAGAR-nya, karena pagar inilah yang mahal kalau jebol:
   · tanpa Kingdom jangan menembak server sama sekali (pasti 40020, buang rate limit);
   · jangan jalan lebih sering dari sekali per 30 menit (buka-tutup app tak boleh
     berubah jadi mesin rate-limit);
   · penolakan SEMENTARA (TOO FREQUENT / 40004) tak boleh ditandai selesai, kalau tidak
     kode yang belum tertebus hilang dari antrean selamanya;
   · dua robot tak boleh jalan bersamaan. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const PID = '330300846', KID = '2114';
const envRobot = (opts = {}) => {
  const kodeJson = { codes: [{ code: 'KODEBARU1', exp: '-' }] };
  const env = createEnv({
    storage: Object.assign({
      ks_activePid: JSON.stringify(PID), ks_profilesV: '1',
      ks_profiles: JSON.stringify(opts.profiles || [{ pid: PID, nick: 'Gatul', kingdom: KID }]),
    }, opts.storage || {}),
    fetch: (url) => {
      const gift = /gift_code/.test(url);
      if (gift) env.__giftHits = (env.__giftHits || 0) + 1;
      const json = gift ? (opts.giftJson || { code: 0, msg: 'SUCCESS' }) : kodeJson;
      return Promise.resolve({
        json: () => Promise.resolve(json), text: () => Promise.resolve(JSON.stringify(json)),
        headers: { get: () => null },
      });
    },
  });
  env.evalIn('KS_REDEEM_GAP=0; KS_REDEEM_COOLDOWN=0');
  /* Pengambilan kode punya test sendiri (test_01/test_09); di sini yang diuji adalah
     LOGIKA robot, jadi daftar kodenya dipasok langsung supaya kegagalan test ini selalu
     berarti robotnya yang salah, bukan proxy/feed-nya. */
  env.evalIn("ksLiveCodes = async () => " + JSON.stringify(opts.codes || [{ code: 'KODEBARU1', exp: '-' }]));
  return env;
};

(async () => {
  console.log('Robot redeem (menyala saat app dibuka)');

  t('robot terpasang dan dipanggil dari boot, bukan cuma dari tab Kode', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '01_fa4c6c09.js'), 'utf8');
    ok(/function ksRobotRedeem/.test(src), 'ksRobotRedeem harus ada');
    ok(/ksRobotRedeem\(\)/.test(src.split('function ksRobotRedeem')[0] + src.split('function ksRobotRedeem')[1] || ''),
      'harus ada pemanggilnya');
    const init = src.slice(src.indexOf('function init()'));
    ok(/ksRobotRedeem/.test(init.slice(0, 6000)), 'init() harus memanggil robot saat app dibuka');
  });

  {
    const env = envRobot({ profiles: [] });
    const h = await env.evalIn('ksRobotRedeem')();
    t('tanpa profil: diam, jangan menembak server', () => {
      eq(h.alasan, 'tanpa-profil'); eq(h.dicoba, 0);
      ok(!env.__giftHits, 'tak boleh ada request gift_code');
    });
  }

  {
    const env = envRobot({ profiles: [{ pid: PID, nick: 'Gatul', kingdom: '' }] });
    const h = await env.evalIn('ksRobotRedeem')();
    t('Kingdom kosong: tetap tidak menembak (server pasti menolak 40020)', () => {
      eq(h.alasan, 'kingdom-kosong'); eq(h.dicoba, 0);
      ok(!env.__giftHits, 'tak boleh membuang jatah rate limit untuk permintaan yang pasti gagal');
      ok(/Kingdom/i.test(env.evalIn('ksRobotRingkas')()), 'ringkasannya harus menyuruh isi Kingdom');
    });
  }

  {
    const env = envRobot();
    const h1 = await env.evalIn('ksRobotRedeem')();
    const hits1 = env.__giftHits || 0;
    const h2 = await env.evalIn('ksRobotRedeem')();
    t('jalan sekali, lalu diam ~30 menit walau app dibuka-tutup', () => {
      eq(h1.dicoba, 1, 'putaran pertama menebus kode baru');
      eq(h1.ok, 1);
      eq(h2.alasan, 'baru-saja', 'putaran kedua harus ditahan');
      eq(env.__giftHits, hits1, 'tak boleh ada tembakan tambahan');
    });
  }

  {
    const env = envRobot({ giftJson: { code: 1, msg: 'TOO FREQUENT.', err_code: 0 } });
    const h = await env.evalIn('ksRobotRedeem')();
    t('dibatasi server: berhenti, dan kode TIDAK ditandai selesai', () => {
      eq(h.dibatasi, true);
      const sisa = env.evalIn('ksCodesTodo')(PID, [{ code: 'KODEBARU1' }]);
      eq(sisa.length, 1, 'kode yang belum tertebus wajib tetap di antrean');
      ok(/dibatasi/i.test(env.evalIn('ksRobotRingkas')()), 'ringkasannya harus jujur soal ini');
    });
  }

  {
    const env = envRobot({ giftJson: { code: 1, msg: '40004', err_code: 40004 } });
    const h = await env.evalIn('ksRobotRedeem')();
    t('penolakan sementara 40004 diperlakukan sama: berhenti, tak ditandai', () => {
      eq(h.dibatasi, true);
      eq(env.evalIn('ksCodesTodo')(PID, [{ code: 'KODEBARU1' }]).length, 1);
    });
  }

  {
    const env = envRobot();
    const [a, b] = await Promise.all([env.evalIn('ksRobotRedeem')(), env.evalIn('ksRobotRedeem')()]);
    t('dua robot tak boleh jalan bersamaan', () => {
      ok(a === null || b === null, 'yang kedua harus ditolak, bukan ikut menembak');
    });
  }

  done();
})();
