/* Auto-redeem SISI SERVER (server/worker.js).

   Sebelumnya worker hanya MENGIRIM NOTIFIKASI dan bagian redeem-nya sengaja no-op
   ("opsi masa depan"), jadi kode baru ditemukan mesin tapi ditebus manusia. Sisi
   server sebenarnya tempat terbaik untuk ini:
     · jam worker = jam Cloudflare, jadi kelas kegagalan "time Expired" (jendela
       Century cuma ±5 menit) tidak bisa terjadi di sana;
     · jalan walau app tak pernah dibuka; tanpa CORS, tanpa proxy.

   Yang dijaga berkas ini adalah hal-hal yang mahal kalau salah:
   · identitas HANYA dari env — tabel `visitors` berisi akun orang lain;
   · penolakan SEMENTARA tak boleh ditandai selesai (kode hilang dari antrean selamanya);
   · md5/sign harus cocok dengan vektor uji yang disadap dari situs resmi;
   · ada batas per putaran cron supaya satu invocation tak ditahan terlalu lama. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { t, eq, ok, done } = require('./harness.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'server', 'worker.js'), 'utf8');
/* `export default {…}` itu sintaks modul — potong, sisanya fungsi murni yang bisa diuji. */
const BODY = SRC.slice(0, SRC.indexOf('export default'));

function ctxWith(giftJson) {
  const dikirim = [];
  const sandbox = {
    console, Date, JSON, Math, String, Number, Object, Array, Set, Map, RegExp, Error, isNaN, parseInt, parseFloat,
    encodeURIComponent, setTimeout: (f) => f(),         /* jeda 3 dtk dilewati saat test */
    fetch: (url, init) => {
      const body = (init && init.body) || '';
      const p = {};
      for (const kv of String(body).split('&')) { const i = kv.indexOf('='); if (i > 0) p[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); }
      dikirim.push({ url: String(url), p });
      return Promise.resolve({ json: () => Promise.resolve(giftJson) });
    },
    decodeURIComponent,
  };
  vm.createContext(sandbox);
  vm.runInContext(BODY, sandbox);
  return { sandbox, dikirim, ev: e => vm.runInContext(e, sandbox) };
}
/* D1 tiruan: cukup untuk prepare().bind().first()/run() yang dipakai worker */
function dbPalsu() {
  const baris = new Map();
  return {
    baris,
    prepare(sql) {
      return {
        bind(...a) {
          return {
            first: async () => (/SELECT/.test(sql) ? baris.get(a[0] + '|' + a[1]) || null : null),
            run: async () => { if (/INSERT/.test(sql)) baris.set(a[0] + '|' + a[1], { res: a[2] }); return {}; },
          };
        },
        run: async () => ({}),
      };
    },
  };
}

console.log('Auto-redeem sisi server (worker)');

t('md5 worker cocok dengan vektor uji dari situs resmi', () => {
  const { ev } = ctxWith({});
  const s = ev("md5(Object.keys({cdk:'TESTPROBE1',fid:'330300846',kid:'2114',time:1784621714}).sort().map(k=>k+'='+({cdk:'TESTPROBE1',fid:'330300846',kid:'2114',time:1784621714})[k]).join('&')+KS_SALT)");
  eq(s, '171b3e392cf48d88a048fdf50a73ceaa', 'sign meleset -> server akan menjawab "Sign Error"');
});

t('identitas dibaca dari env, mendukung banyak karakter', () => {
  const { ev } = ctxWith({});
  eq(ev("redeemTargets({REDEEM_TARGETS:'111:2114, 222:2184'})"), [{ fid: '111', kid: '2114' }, { fid: '222', kid: '2184' }]);
  eq(ev("redeemTargets({REDEEM_FID:'333',REDEEM_KID:'2114'})"), [{ fid: '333', kid: '2114' }]);
  eq(ev("redeemTargets({REDEEM_FID:'333'})"), [], 'tanpa kid jangan dipakai — server pasti menolak 40020');
  eq(ev("redeemTargets({})"), []);
});

t('permintaan yang dikirim berbentuk protokol Century', async () => {
  const { ev, dikirim } = ctxWith({ code: 0, msg: 'SUCCESS' });
  await ev("redeemOne('330300846','2114','KODE1')");
  eq(dikirim.length, 1);
  ok(/gift_code$/.test(dikirim[0].url), dikirim[0].url);
  const p = dikirim[0].p;
  eq(Object.keys(p).sort(), ['cdk', 'fid', 'kid', 'sign', 'time']);
  ok(/^\d{10}$/.test(p.time), 'time harus epoch DETIK, bukan milidetik: ' + p.time);
  ok(Math.abs(Number(p.time) - Math.floor(Date.now() / 1000)) < 5, 'time harus jam sekarang');
});

t('pemetaan jawaban: final vs boleh-diulang', async () => {
  const kasus = [
    [{ code: 0, msg: 'SUCCESS' }, 'ok', true],
    [{ code: 1, msg: 'RECEIVED.' }, 'used', true],
    [{ code: 1, msg: 'SAME TYPE EXCHANGE.' }, 'same', true],
    [{ code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 }, 'bad', true],
    [{ code: 1, msg: 'USER INFO ERROR.', err_code: 40020 }, 'id', true],
    [{ code: 1, msg: 'TOO FREQUENT.' }, 'retry', false],
    [{ code: 1, msg: 'time Expired' }, 'retry', false],
    [{ code: 1, msg: '40004', err_code: 40004 }, 'retry', false],
  ];
  for (const [json, r, final] of kasus) {
    const { ev } = ctxWith(json);
    const out = await ev("redeemOne('1','2','K')");
    eq(out.r, r, JSON.stringify(json.msg));
    eq(out.final, final, JSON.stringify(json.msg) + ' -> final?');
  }
});

t('hanya hasil FINAL yang dicatat; yang sementara tetap di antrean', async () => {
  {
    const { ev, sandbox } = ctxWith({ code: 1, msg: 'TOO FREQUENT.' });
    sandbox.DBX = dbPalsu();
    await ev("maybeAutoRedeem({AUTO_REDEEM:'1',REDEEM_FID:'9',REDEEM_KID:'2114',DB:DBX},['KODE1'])");
    eq(sandbox.DBX.baris.size, 0, 'penolakan sementara tak boleh ditandai selesai');
  }
  {
    const { ev, sandbox } = ctxWith({ code: 0, msg: 'SUCCESS' });
    sandbox.DBX = dbPalsu();
    await ev("maybeAutoRedeem({AUTO_REDEEM:'1',REDEEM_FID:'9',REDEEM_KID:'2114',DB:DBX},['KODE1'])");
    eq(sandbox.DBX.baris.size, 1, 'hasil final wajib dicatat supaya tak ditembak ulang tiap 30 menit');
  }
});

t('mati kalau tidak dinyalakan, dan tanpa identitas', async () => {
  const { ev, dikirim, sandbox } = ctxWith({ code: 0, msg: 'SUCCESS' });
  sandbox.DBX = dbPalsu();
  eq(await ev("maybeAutoRedeem({DB:DBX},['K'])"), null, 'AUTO_REDEEM belum diset -> jangan jalan');
  eq(await ev("maybeAutoRedeem({AUTO_REDEEM:'1',DB:DBX},['K'])"), null, 'tanpa identitas -> jangan jalan');
  eq(dikirim.length, 0, 'tak boleh ada permintaan ke Century');
});

t('ada batas per putaran cron', () => {
  ok(/REDEEM_MAX_PER_RUN\s*=\s*[1-9]/.test(BODY), 'harus ada batas jumlah per putaran');
  ok(/kirim >= REDEEM_MAX_PER_RUN/.test(BODY), 'batasnya harus benar-benar dipakai');
});

t('identitas tidak pernah diambil dari tabel visitors', () => {
  const blok = BODY.slice(BODY.indexOf('function redeemTargets'), BODY.indexOf('async function maybeAutoRedeem'));
  ok(!/visitors/i.test(blok), 'tabel visitors berisi akun orang lain — jangan pernah jadi sumber identitas redeem');
});

done();
