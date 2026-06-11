// Merge all dict_*.json + _overrides.json into i18n/_merged.json (overrides win).
const fs = require('fs'), path = require('path');
const dir = path.join('companion_src', 'i18n');
let TR = {};
// all dict_*.json (numbered chunks + dict_advisory etc.), then _overrides wins
for (const f of fs.readdirSync(dir).filter(n => /^dict_.*\.json$/.test(n)).sort()) {
  Object.assign(TR, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}
const ov = path.join(dir, '_overrides.json');
if (fs.existsSync(ov)) Object.assign(TR, JSON.parse(fs.readFileSync(ov, 'utf8')));
// drop any empty / identity entries
for (const k of Object.keys(TR)) { if (!TR[k] || TR[k] === k) delete TR[k]; }
fs.writeFileSync(path.join(dir, '_merged.json'), JSON.stringify(TR, null, 0));
console.log('merged', Object.keys(TR).length, 'entries -> _merged.json');
