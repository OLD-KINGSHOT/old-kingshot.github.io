/* Fix #2 — sumber jam untuk menandatangani permintaan API.

   Sejarah: dulu app menyinkronkan jam dari header `Date` respons. Terverifikasi
   (Jul 2026) respons Century mengirim `Access-Control-Allow-Origin: *` tapi TANPA
   `Access-Control-Expose-Headers`, dan `Date` bukan header CORS-safelisted — jadi
   di browser `res.headers.get('date')` SELALU null dan resync itu tak pernah
   jalan. Node tidak menegakkan CORS, makanya lolos saat diprobe dari CLI.

   Babak kedua (21 Jul 2026) — kenapa berkas ini berubah lagi:
   Century mempersempit jendela `time` gift code dari ±24 jam jadi ~±5 menit
   (terukur: ±300 detik diterima, ±600 detik "time Expired"). Pada saat yang sama
   /time worker produksi balas 404 (versi ter-deploy lebih tua dari repo) dan
   SATU-SATUNYA sumber yang hidup, timeapi.io, meleset -554 detik. Hasilnya app
   memasang offset -9 menit dan SETIAP redeem gagal, padahal jam perangkat benar
   (dikonfirmasi: cloudflare trace +0 dtk, header Date GitHub -9 dtk).

   Pelajarannya: dengan jendela ±5 menit, offset yang SALAH jauh lebih berbahaya
   daripada tanpa offset. Jadi offset hanya dipakai kalau DUA sumber independen
   sepakat; kalau tidak, percayai jam perangkat. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const OWN = 'old-kingshot-api.old-kingshot.workers.dev';
const CF = 'cdn-cgi/trace';
/* Babak ketiga (30 Jul 2026): timeapi.io DIBUANG — diukur ulang meleset -952 detik
   (~16 menit), tiga kali lipat lebar jendela server. Penggantinya feed kingshot.net
   (`timestamp` di BODY, terukur +0,5 dtk) yang memang sudah diambil app lewat proxy
   worker sendiri. Sumber kedua ini penting: tanpa dia, korroborasi tak pernah tercapai
   dan jam perangkat yang meleset tak bisa dikoreksi sama sekali. */
/* app menembaknya lewat proxy worker sendiri (ksOwnProxy), jadi URL akhirnya
   berakhiran /events di host worker — bukan kingshot.net langsung. */
const FEED = 'workers.dev/events';

/* fetch stub: mencatat panggilan, membalas per-host.
   - objek  -> dibalas sebagai JSON
   - string -> dibalas sebagai teks mentah (dipakai cloudflare trace)
   - 'fail' -> reject */
function stubFetch(routes) {
  const calls = [];
  return {
    calls,
    fetch: url => {
      calls.push(String(url));
      for (const [pat, res] of routes) {
        if (String(url).includes(pat)) {
          if (res === 'fail') return Promise.reject(new Error('network'));
          const isText = typeof res === 'string';
          return Promise.resolve({
            ok: true,
            json: () => (isText ? Promise.reject(new Error('not json')) : Promise.resolve(res)),
            text: () => Promise.resolve(isText ? res : JSON.stringify(res)),
            headers: { get: () => null },   // realita browser: Date tidak di-expose
          });
        }
      }
      return Promise.reject(new Error('unrouted: ' + url));
    },
  };
}

/* sumber-sumber yang melaporkan jam = jam perangkat + `skewMs` */
const worker = skew => ({ now: Date.now() + skew });
const cfTrace = skew => 'fl=1\nh=cloudflare.com\nts=' + ((Date.now() + skew) / 1000).toFixed(3) + '\n';
const feed = skew => ({ timestamp: new Date(Date.now() + skew).toISOString() });

function envSync(routes) {
  const s = stubFetch(routes);
  const env = createEnv({ fetch: s.fetch });
  const ksClock = env.evalIn('ksClock');
  ksClock.offset = 0; ksClock.nudge = 0; ksClock.synced = false;
  return { s, env, ksClock };
}

console.log('Fix #2 — sumber jam (butuh korroborasi)');

(async () => {
  /* ---- 1. dua sumber sepakat -> offset dipakai ---- */
  {
    const SKEW = 4 * 60000;   // kedua sumber bilang jam perangkat telat 4 menit
    const { ksClock } = envSync([[OWN + '/time', worker(SKEW)], [CF, cfTrace(SKEW)], [FEED, 'fail']]);
    const okRes = await ksClock.sync();
    t('dua sumber sepakat -> sync berhasil', () => ok(okRes === true, 'sync mengembalikan ' + okRes));
    t('offset mendarat di waktu yang disepakati', () => {
      const drift = ksClock.now().getTime() - (Date.now() + SKEW);
      ok(Math.abs(drift) < 2000, 'meleset ' + drift + 'ms');
    });
    t('sync menandai jam sudah tersinkron', () => ok(ksClock.synced === true));
  }

  /* ---- 2. SATU sumber saja tidak cukup ----
     Inilah bug 21 Jul 2026: cuma timeapi.io yang hidup, dan dia meleset 9 menit.
     Satu sumber tanpa pembanding TIDAK BOLEH menggeser jam. */
  {
    const { ksClock } = envSync([[OWN + '/time', 'fail'], [CF, 'fail'], [FEED, feed(-554000)]]);
    const okRes = await ksClock.sync();
    t('satu sumber sendirian ditolak (tak ada pembanding)', () => {
      ok(okRes === false, 'sync mengembalikan ' + okRes);
      eq(ksClock.offset, 0, 'offset dari sumber tunggal terpasang');
      ok(ksClock.synced === false, 'salah mengaku tersinkron');
    });
    t('jam perangkat dipertahankan, bukan digeser 9 menit', () => {
      const drift = ksClock.now().getTime() - Date.now();
      ok(Math.abs(drift) < 2000, 'jam bergeser ' + Math.round(drift / 1000) + ' detik');
    });
  }

  /* ---- 3. sumber menyimpang kalah suara ----
     timeapi.io meleset 9 menit sementara worker + cloudflare sepakat: yang dua
     itu yang menang, bukan rata-rata (rata-rata akan tertarik ke yang salah). */
  {
    const SKEW = 2 * 60000;
    const { ksClock } = envSync([[OWN + '/time', worker(SKEW)], [CF, cfTrace(SKEW)], [FEED, feed(-554000)]]);
    const okRes = await ksClock.sync();
    t('sumber menyimpang diabaikan, mayoritas menang', () => {
      ok(okRes === true, 'sync mengembalikan ' + okRes);
      const drift = ksClock.now().getTime() - (Date.now() + SKEW);
      ok(Math.abs(drift) < 2000, 'tertarik ke sumber menyimpang, meleset ' + Math.round(drift / 1000) + ' detik');
    });
  }

  /* ---- 4. semua sumber saling tidak sepakat -> jangan tebak ---- */
  {
    const { ksClock } = envSync([
      [OWN + '/time', worker(600000)], [CF, cfTrace(-600000)], [FEED, feed(1800000)],
    ]);
    const okRes = await ksClock.sync();
    t('sumber saling bertentangan -> tolak, pakai jam perangkat', () => {
      ok(okRes === false, 'sync mengembalikan ' + okRes);
      eq(ksClock.offset, 0);
      ok(ksClock.synced === false);
    });
  }

  /* ---- 5. semua mati -> gagal jujur, jam perangkat, tak mengaku synced ---- */
  {
    const { ksClock } = envSync([[OWN + '/time', 'fail'], [CF, 'fail'], [FEED, 'fail']]);
    const okRes = await ksClock.sync();
    t('semua sumber mati -> sync melapor gagal dan tidak mengaku synced', () => {
      ok(okRes === false, 'sync mengembalikan ' + okRes);
      ok(ksClock.synced === false, 'salah mengaku tersinkron');
      eq(ksClock.offset, 0);
    });
  }

  /* ---- 6. worker produksi 404 (kondisi nyata 21 Jul 2026) ---- */
  {
    const SKEW = 90000;
    const { ksClock } = envSync([
      [OWN + '/time', { error: 'notfound' }],   // 404 body, tanpa `now`
      [CF, cfTrace(SKEW)], [FEED, feed(SKEW)],
    ]);
    const okRes = await ksClock.sync();
    t('worker 404 tidak merusak sinkronisasi selama 2 sumber lain sepakat', () => {
      ok(okRes === true, 'sync mengembalikan ' + okRes);
      const drift = ksClock.now().getTime() - (Date.now() + SKEW);
      ok(Math.abs(drift) < 2000, 'meleset ' + drift + 'ms');
    });
  }

  /* ---- 7. cloudflare trace memang dipakai (sumber tanpa-CORS-drama) ---- */
  {
    const { s, ksClock } = envSync([[OWN + '/time', 'fail'], [CF, cfTrace(0)], [FEED, feed(0)]]);
    await ksClock.sync();
    t('cloudflare cdn-cgi/trace ikut ditanya', () =>
      ok(s.calls.some(c => c.includes(CF)), 'tidak pernah menanyakan ' + CF));
  }

  /* ---- 7b. offset beracun yang SUDAH tersimpan di perangkat harus mati ----
     User yang sempat menjalankan versi lama menyimpan offset -554 dtk hasil
     sumber tunggal. Tanpa pembatalan, nilai itu hidup 24 jam lagi dan tiap
     redeem gagal — jadi offset lama (tanpa penanda versi) harus diabaikan. */
  {
    const env = createEnv({
      storage: {
        ks_clockOffset: JSON.stringify(-553770),
        ks_clockSyncAt: JSON.stringify(Date.now() - 60000),   // baru saja, "masih segar"
      },
    });
    const ksClock = env.evalIn('ksClock');
    ksClock.load();
    t('offset tersimpan dari aturan LAMA diabaikan', () => {
      eq(ksClock.offset, 0, 'offset beracun masih terpakai');
      ok(ksClock.synced === false, 'mengaku tersinkron berdasarkan offset lama');
    });
  }

  /* offset yang dibuat aturan BARU tetap dipercaya (jangan sinkron ulang tiap buka) */
  {
    const env = createEnv({
      storage: {
        ks_clockOffset: JSON.stringify(45000),
        ks_clockOffsetV: JSON.stringify(2),
        ks_clockSyncAt: JSON.stringify(Date.now() - 60000),
      },
    });
    const ksClock = env.evalIn('ksClock');
    ksClock.load();
    t('offset ber-korroborasi yang masih segar tetap dipakai', () => {
      eq(ksClock.offset, 45000);
      ok(ksClock.synced === true);
    });
  }

  /* sync yang gagal harus MEMBUANG offset, bukan membiarkannya menyetir tanda tangan */
  {
    const { ksClock } = envSync([[OWN + '/time', 'fail'], [CF, 'fail'], [FEED, feed(-554000)]]);
    ksClock.offset = -553770;            // nilai beracun dari sesi sebelumnya
    const okRes = await ksClock.sync();
    t('sync gagal -> offset lama dibuang, bukan dipertahankan', () => {
      ok(okRes === false);
      eq(ksClock.offset, 0, 'offset beracun bertahan setelah sync gagal');
    });
  }

  /* ---- 8. jalur header Date yang mati sudah tidak ada ---- */
  {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', '03_7897e180.js'), 'utf8');
    t('tak ada kode yang membaca header Date (disembunyikan CORS)', () => {
      const hits = src.split('\n')
        .map((l, i) => [i + 1, l])
        .filter(([, l]) => /headers\.get\(\s*['"]date['"]\s*\)/i.test(l));
      ok(hits.length === 0, 'masih membaca header Date di baris ' + hits.map(h => h[0]).join(', '));
    });
  }

  /* ---- 9. redeem tetap jalan tanpa header Date sama sekali ---- */
  {
    const s = stubFetch([['api/gift_code', { code: 1, msg: 'CDK NOT FOUND.', err_code: 40014 }]]);
    const env = createEnv({ fetch: s.fetch });
    /* kid wajib sejak protokol Century berubah (Jul 2026) — lihat test_01 */
    const res = await env.evalIn('ksRedeem')('330300846', 'ABC123', '2114');
    t('regresi: ksRedeem jalan tanpa header Date', () => eq(res.cls, 'bad'));
  }

  /* ---- penjaga: timeapi.io tak boleh diam-diam kembali ----
     Diukur meleset -554 dtk (21 Jul) lalu -952 dtk (30 Jul) — hampir 16 menit, tiga
     kali lipat lebar jendela server yang cuma ±5 menit. Sumber yang salahnya melebihi
     toleransi tidak netral: begitu ia berpasangan dengan sumber lain yang ikut
     menyimpang, app memasang offset yang menggagalkan SELURUH redeem. */
  t('timeapi.io tidak lagi dipakai sebagai sumber jam', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '03_7897e180.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');            /* komentar boleh menjelaskan kenapa dibuang */
    ok(!/timeapi\.io/.test(src), 'timeapi.io masih dipanggil di kode');
  });

  /* Worker menyajikan /events dengan Cache-Control max-age=1800 — benar untuk JADWAL,
     racun untuk JAM. Sumber jam yang membaca respons ber-cache akan melaporkan waktu
     yang tertinggal sampai setengah jam, dan itu persis alasan timeapi.io dibuang. */
  {
    const skew = 0;
    const { ksClock, s: stub } = envSync([[OWN + '/time', 'fail'], [CF, cfTrace(skew)], [FEED, feed(skew)]]);
    await ksClock.sync();
    const feedCall = stub.calls.find(u => u.includes('/events'));
    t('probe jam ke feed menembus cache (query unik)', () => {
      ok(feedCall, 'feed harus ditanya');
      ok(/[?&]_ts=\d+/.test(feedCall), 'URL harus dibuat unik supaya tak dilayani cache: ' + feedCall);
    });
  }

  t('waktu selalu diambil dari BODY, tak pernah dari header Date', () => {
    /* Diukur 30 Jul 2026: github, jsdelivr, worldtimeapi, worldclockapi — TAK SATU PUN
       mengekspos `Date` lewat Access-Control-Expose-Headers, jadi di browser semuanya
       null. Hanya body yang bisa dipercaya. */
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '03_7897e180.js'), 'utf8');
    const blok = src.slice(src.indexOf('_sources:'), src.indexOf('_agreeMs'));
    ok(!/headers\s*\.\s*get\(\s*['"]date/i.test(blok), 'sumber jam tak boleh membaca header Date');
    ok(/ts=|timestamp|j\.now/.test(blok), 'harus mengambil waktu dari body');
  });

  done();
})();
