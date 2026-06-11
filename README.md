# KINGSHOT13 — Kingshot F2P Companion

Aplikasi pendamping Kingshot (single-file, tanpa backend): advisory harian berbasis umur server, kalender & jadwal kingdom live, panduan hero/lineup, peta My Island interaktif, gift code auto-redeem, dan sinkron antar perangkat.

**Buka:** https://faturochman13.github.io/kingshot/

- Semua data progres tersimpan di browser (localStorage) + sinkron opsional via kode rahasia.
- Sumber data live: kingshot.net (jadwal kingdom, tanggal buka server) & kingshotwiki.com (gift code).
- Build: edit `companion_src/` → `node companion_src/_merge_i18n.js && node companion_src/_build_i18n.js && node companion_repack.js` → hasil di `index.html`.
