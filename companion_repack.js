// Repack companion_src/* back into "KINGSHOT13.html"
const fs=require("fs"), zlib=require("zlib"), path=require("path");
const SRC="companion_src", IN="KINGSHOT13.html";
const out=process.argv[2]||"KINGSHOT13.html";
const map=JSON.parse(fs.readFileSync(path.join(SRC,"_map.json"),"utf8"));
const html=fs.readFileSync(IN,"utf8");
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
// find manifest script index
let mi=scripts.findIndex(s=>/__bundler\/manifest/.test(s[1]));
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
if(out==="KINGSHOT13.html"){ fs.writeFileSync("index.html",newHtml); console.log("also wrote index.html (deploy copy)"); }
