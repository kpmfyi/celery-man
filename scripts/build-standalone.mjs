import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'demo/dist');
const modules = {};
const media = {};
const mime = {'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
const mediaDirectory = path.join(dist,'media');
if(fs.existsSync(mediaDirectory))for(const file of fs.readdirSync(mediaDirectory)){
  const type=mime[path.extname(file)];
  if(type)media['media/'+file]=`data:${type};base64,${fs.readFileSync(path.join(mediaDirectory,file)).toString('base64')}`;
}
function collect(relative) {
  if (modules[relative]) return;
  const code = fs.readFileSync(path.join(dist,relative),'utf8');
  const dependencies={};
  modules[relative]={code,dependencies};
  for (const match of code.matchAll(/^\s*import[^\n]*?\bfrom\s*(['"])(\.[^'"]+)\1/gm)) {
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[2]));
    dependencies[match[2]]=target; collect(target);
  }
}
collect('modules/app.js');
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
let css=fs.readFileSync(path.join(dist,'style.css'),'utf8');
css=css.replace(/url\(['"]?\.\/(fonts\/[^'")]+)['"]?\)/g,(_,file)=>`url("data:font/woff2;base64,${fs.readFileSync(path.join(dist,file)).toString('base64')}")`);
html=html.replace('<link rel="stylesheet" href="./style.css" />',()=>`<style>${css}</style>`);
html=html.replace('href="./favicon.svg"',`href="data:image/svg+xml;base64,${fs.readFileSync(path.join(dist,'favicon.svg')).toString('base64')}"`);
html=html.replace('href="./" aria-label="CINCO home"','href="#" aria-label="CINCO home"');
const payload=JSON.stringify(modules).replaceAll('<','\\u003c');
const loader=`globalThis.__CELERY_MEDIA__=${JSON.stringify(media)};const modules=${payload};const loaded={};function moduleURL(name){if(loaded[name])return loaded[name];const record=modules[name];let code=record.code;for(const [specifier,target] of Object.entries(record.dependencies)){const url=moduleURL(target);code=code.split("'"+specifier+"'").join(JSON.stringify(url)).split('"'+specifier+'"').join(JSON.stringify(url));}return loaded[name]=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));}import(moduleURL('modules/app.js')).catch(error=>{console.error(error);document.getElementById('fallback').hidden=false;document.getElementById('response').textContent='The computer could not initialize. Try a recent browser with WebGL enabled.';});`;
html=html.replace('<script type="module" src="./modules/app.js"></script>',()=>`<script type="module">${loader}</script>`);
const output=path.join(root,'celery-man.html');fs.writeFileSync(output,html);
console.log(`Standalone demo: ${output} (${Math.round(Buffer.byteLength(html)/1024)} KB; ${Object.keys(modules).length} modules, ${Object.keys(media).length} embedded media assets)`);
