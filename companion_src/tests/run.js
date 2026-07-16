/* Jalankan semua test: node companion_src/tests/run.js
   Keluar dengan kode 1 kalau ada yang gagal (biar bisa dipakai di CI/hook). */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const files = fs.readdirSync(__dirname).filter(f => /^test_.*\.js$/.test(f)).sort();
let failed = 0;
for (const f of files) {
  process.stdout.write('\n── ' + f + '\n');
  try { execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' }); }
  catch (e) { failed++; }
}
console.log('\n' + (failed ? '❌ ' + failed + '/' + files.length + ' berkas test GAGAL' : '✅ semua ' + files.length + ' berkas test lulus'));
process.exit(failed ? 1 : 0);
