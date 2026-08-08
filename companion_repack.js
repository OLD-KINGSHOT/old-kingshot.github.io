// Repack companion_src/* back into "KINGSHOT13.html"
const fs=require("fs"), zlib=require("zlib"), path=require("path");
const SRC="companion_src", IN="KINGSHOT13.html";
const out=process.argv[2]||"KINGSHOT13.html";
const map=JSON.parse(fs.readFileSync(path.join(SRC,"_map.json"),"utf8"));
const html=fs.readFileSync(IN,"utf8");
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
// find manifest script index
let mi=scripts.findIndex(s=>/__bundler\/manifest/.test(s[1]));
if(mi<0){ console.error("manifest script not found in "+IN+" — aborting"); process.exit(1); }
const oldManifest=JSON.parse(scripts[mi][2]);
const newManifest={};
for(const m of map){
  const buf=fs.readFileSync(path.join(SRC,m.file));
  let data;
  if(m.compressed){ data=zlib.gzipSync(buf).toString("base64"); }
  else { data=buf.toString("base64"); }
  newManifest[m.id]={mime:m.mime,compressed:m.compressed,data};
}
// preserve any keys not in map (safety)
for(const k of Object.keys(oldManifest)){ if(!newManifest[k]) newManifest[k]=oldManifest[k]; }
const newJson=JSON.stringify(newManifest);
// rebuild html by replacing manifest script content
const full=scripts[mi][0];
const newFull=full.replace(scripts[mi][2], ()=>newJson);
let newHtml=html.replace(full,()=>newFull);

// Also rebuild the template script from _template.html (holds <title>, brand, CSS).
// Stored in the HTML as a JSON-encoded string consumed via JSON.parse() in the loader.
const tplPath=path.join(SRC,"_template.html");
if(fs.existsSync(tplPath)){
  const tplSrc=fs.readFileSync(tplPath,"utf8");
  const ti=scripts.findIndex(s=>/__bundler\/template/.test(s[1]));
  if(ti<0){ console.error("template script not found in HTML — skipped template update"); }
  else{
    const tplFull=scripts[ti][0];
    // Escape </script so the JSON string can't prematurely close the host
    // <script type="__bundler/template"> tag. JSON.parse reverses \/ -> /.
    // (_template.html contains real <script src=...></script> tags.)
    const tplNewContent=JSON.stringify(tplSrc).replace(/<\/script/gi,'<\\/script');
    const tplNewFull=tplFull.replace(scripts[ti][2], ()=>tplNewContent);
    newHtml=newHtml.replace(tplFull,()=>tplNewFull);
    console.log("template updated from _template.html");
  }
}

fs.writeFileSync(out,newHtml);
console.log("wrote",out,"(",newHtml.length,"bytes )");
// On a real (default) build, also emit a deploy-ready index.html copy (clean hosting URL).
//
// GERBANG MAINTENANCE disuntikkan DI SINI, ke salinan deploy saja.
// Sejarahnya: gerbang itu dulu cuma hidup di index.html yang sudah terbit, sementara
// build ini menyusun ulang index.html dari cangkang KINGSHOT13.html yang tak pernah
// memuatnya — jadi tiap rebuild menghapusnya diam-diam, dan push berikutnya akan
// MEMBUKA situs tanpa ada yang memutuskan begitu (ketahuan 9 Agu 2026, sesudah enam
// rebuild berturut-turut). Sekarang sumbernya versi-terkontrol di
// companion_src/_maintenance.html, dan tests/test_36 menolak index.html tanpa gerbang.
// Salinan offline (KINGSHOT13.html) sengaja TIDAK disuntik: ia jalan dari file://,
// dan gerbangnya memang melewatkan file:// — menyuntik di sana cuma menambah berat.
if(out==="KINGSHOT13.html"){
  let deploy=newHtml;
  const gatePath=path.join(SRC,"_maintenance.html");
  if(fs.existsSync(gatePath)){
    const gate=fs.readFileSync(gatePath,"utf8");
    const anchor='<div id="__bundler_loading">';
    const at=deploy.indexOf(anchor);
    if(at<0){ console.error("ANCHOR gerbang tak ketemu di HTML — index.html TIDAK ditulis"); process.exit(1); }
    const end=deploy.indexOf("</div>",at)+6;
    deploy=deploy.slice(0,end)+"\n\n"+gate+"\n"+deploy.slice(end);
    // Lapis kedua: loader harus IKUT berhenti. Gerbang yang cuma memasang penanda
    // tapi membiarkan loader membongkar bundle = app tetap terbuka di balik halaman
    // tutup. Versi terbit sebelumnya punya dua lapis ini; sekarang keduanya dipasang
    // dari sini supaya tak bisa terpisah lagi.
    const loader="document.addEventListener('DOMContentLoaded', async function() {";
    if(deploy.indexOf(loader)<0){ console.error("ANCHOR loader tak ketemu — index.html TIDAK ditulis"); process.exit(1); }
    deploy=deploy.replace(loader,loader+"\n  if (window.__MAINTENANCE__) return;");
    console.log("gerbang maintenance disuntik ke index.html (2 lapis: penanda + loader)");
  } else {
    console.error("companion_src/_maintenance.html HILANG — index.html TIDAK ditulis (menolak menerbitkan situs tanpa gerbang)");
    process.exit(1);
  }
  fs.writeFileSync("index.html",deploy);
  console.log("also wrote index.html (deploy copy,",deploy.length,"bytes )");
}
