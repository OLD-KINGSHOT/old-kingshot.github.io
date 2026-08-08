/* Tab Profil: yang tak bisa lagi dideteksi HARUS bisa diketik.
 *
 * Sisa era /api/player: Kingdom & Level TC dirender `readonly` dengan placeholder
 * "otomatis", dan kolom Nama tidak pernah ada sama sekali. Waktu endpoint itu masih
 * hidup, itu masuk akal — app yang mengisinya. Sesudah Century menghapusnya
 * (terverifikasi ulang 9 Agu 2026: 404, dan situs resmi Century sendiri meminta
 * Kingdom diketik manual), kolom-kolom itu menjadi kotak yang tak pernah terisi
 * oleh siapa pun: bukan oleh app, dan tak boleh oleh pemain.
 *
 * Akibatnya TC tak pernah bisa disetel, jadi seluruh saran yang bergantung TC
 * (truegoldAlert, prasyarat Age of Truegold) diam — dan nama tak pernah bisa diisi. */
const { createEnv, t, eq, ok, done } = require('./harness.js');

const PID = '330300846';
function env(profile) {
  const prof = Object.assign({ pid: PID, nick: '', kingdom: '2114', tc: '', start: '2026-05-27' }, profile || {});
  const e = createEnv({ storage: {
    ks_activePid: JSON.stringify(PID), ks_profilesV: '1',
    ks_profiles: JSON.stringify([prof]),
    ['ks_p_' + PID + '_profile']: JSON.stringify(prof),
  }});
  return e;
}
const markup = e => { e.evalIn('renderProfil()'); return e.evalIn("$('[data-tab=profil]').innerHTML") || ''; };
const tag = (html, id) => (html.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];

console.log('Tab Profil — kolom yang wajib bisa diisi tangan');

t('kolom Kingdom bisa diketik (bukan readonly)', () => {
  const el = tag(markup(env()), 'pf_k');
  ok(el, 'kolom Kingdom tak ketemu di markup');
  ok(!/readonly/.test(el), 'Kingdom masih dikunci: ' + el.slice(0, 120));
});

t('kolom Level TC bisa diketik (bukan readonly)', () => {
  const el = tag(markup(env()), 'pf_tc');
  ok(el, 'kolom TC tak ketemu di markup');
  ok(!/readonly/.test(el), 'TC masih dikunci — TC tak akan pernah bisa disetel: ' + el.slice(0, 120));
});

t('ada kolom Nama — tanpa itu nama tak bisa diisi dari mana pun', () => {
  ok(tag(markup(env()), 'pf_nick'), 'tak ada input Nama di tab Profil');
});

t('teksnya tidak lagi menjanjikan Kingdom/TC terisi otomatis', () => {
  const html = markup(env());
  const teks = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  ok(!/Kingdom, TC & tanggal server terisi OTOMATIS/i.test(teks), 'klaim lama masih tampil');
  ok(!/app baca Kingdom, TC & tanggal server otomatis/i.test(teks), 'judul halaman masih menjanjikannya');
});

console.log('\nSimpan — apa yang benar-benar tersimpan');

t('saveProfile menyimpan nama yang diketik', () => {
  const e = env();
  markup(e);
  e.evalIn("$('#pf_nick').value='INDONenen13'");
  e.evalIn("$('#pf_tc').value='25'");
  e.evalIn("$('#pf_k').value='2114'");
  e.evalIn("$('#pf_id').value='" + PID + "'");
  e.evalIn('saveProfile()');
  const p = e.evalIn("store.get('profile',{})");
  eq(p.nick, 'INDONenen13');
  eq(p.tc, '25', 'TC ikut tersimpan');
});

t('nama & TC ikut tercermin ke daftar profil (dipakai kartu pemilih & redeem)', () => {
  const e = env();
  markup(e);
  e.evalIn("$('#pf_nick').value='INDONenen13'");
  e.evalIn("$('#pf_tc').value='25'");
  e.evalIn("$('#pf_k').value='2114'");
  e.evalIn("$('#pf_id').value='" + PID + "'");
  e.evalIn('saveProfile()');
  const meta = (e.evalIn("store.get('profiles',[])") || []).find(x => x.pid === PID);
  ok(meta, 'entri meta hilang');
  eq(meta.nick, 'INDONenen13', 'nama tak tercermin — kartu profil tetap "(tanpa nama)"');
  eq(meta.tc, '25');
});

t('nama yang sudah ada tampil kembali di kolomnya (bukan kotak kosong tiap render)', () => {
  const html = markup(env({ nick: 'Gatul' }));
  ok(/id="pf_nick"[^>]*value="Gatul"|value="Gatul"[^>]*id="pf_nick"/.test(html),
     'nilai tersimpan tidak dikembalikan ke kolom');
});

done();
