// Inject the i18n dictionary + runtime (as one inline <script id="__i18n">)
// and a language toggle button into _template.html. Idempotent.
const fs = require('fs'), path = require('path');
const SRC = 'companion_src';
const tplPath = path.join(SRC, '_template.html');
const dict = fs.readFileSync(path.join(SRC, 'i18n', '_merged.json'), 'utf8'); // compact JSON
const runtime = fs.readFileSync(path.join(SRC, '_i18n_runtime.js'), 'utf8');
let tpl = fs.readFileSync(tplPath, 'utf8');

// 1) Remove any previously injected block (between markers) so we can re-run.
tpl = tpl.replace(/<script id="__i18n">[\s\S]*?<\/script>\s*/g, '');

// 2) Build the inline script. (The repack step escapes every </script in the
//    whole template at the JSON layer, so no escaping is needed here.)
const inline = '<script id="__i18n">window.__TR=' + dict + ';\n' + runtime + '</script>\n';

// 3) Insert immediately before the first bundler module <script src=...> tag.
const marker = tpl.match(/<script src="[0-9a-f-]{36}"><\/script>/i);
if (!marker) throw new Error('module script tags not found in template');
tpl = tpl.replace(marker[0], inline + marker[0]);

// 4) Add the language toggle button to the topbar (before the gear button).
if (!/id="langtoggle"/.test(tpl)) {
  const gear = '<button class="iconbtn" id="gear"';
  if (tpl.indexOf(gear) < 0) throw new Error('gear button not found');
  tpl = tpl.replace(gear,
    '<button class="iconbtn" id="langtoggle" title="Language / Bahasa" style="font:700 11px/1 var(--font-mono);letter-spacing:.08em">EN</button>' + gear);
}

fs.writeFileSync(tplPath, tpl);
console.log('injected i18n: dict', (dict.length/1024|0)+'KB, runtime', (runtime.length/1024|0)+'KB; template now', (tpl.length/1024|0)+'KB');
