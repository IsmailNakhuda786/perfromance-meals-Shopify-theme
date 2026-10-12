import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const tools = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(tools, '../theme');
const folders = ['assets','config','layout','locales','sections','snippets','templates','blocks'];
function walk(directory) { return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]); }
const files = folders.filter(folder=>fs.existsSync(path.join(theme,folder))).flatMap(folder=>walk(path.join(theme,folder))).filter(file=>!path.basename(file).startsWith('.')).map(file=>path.relative(theme,file)).sort();
const hash = crypto.createHash('sha256');
for(const file of files) {
  const content=fs.readFileSync(path.join(theme,file));
  if(content.subarray(0,80).toString().startsWith('version https://git-lfs.github.com/spec/')) throw new Error(`LFS pointer cannot be packaged: ${file}`);
  hash.update(file).update(content);
}
const fingerprint=hash.digest('hex');
const output=process.argv[2]?path.resolve(process.argv[2]):path.resolve(tools,`../../../outputs/Performance-Meals-Merchant-Review-${fingerprint.slice(0,8)}.zip`);
fs.mkdirSync(path.dirname(output),{recursive:true});
if(!fs.existsSync(output)) execFileSync('zip',['-X','-q',output,...files],{cwd:theme});
execFileSync('unzip',['-tq',output],{stdio:'inherit'});
const entries=execFileSync('unzip',['-Z1',output],{encoding:'utf8'}).trim().split('\n').sort();
if(JSON.stringify(entries)!==JSON.stringify(files)) throw new Error('Archive contents differ from theme');
for(const file of files) {
  const archived=execFileSync('unzip',['-p',output,file],{maxBuffer:10*1024*1024});
  if(!archived.equals(fs.readFileSync(path.join(theme,file)))) throw new Error(`Archive content mismatch: ${file}`);
}
const result={path:output,files:files.length,bytes:fs.statSync(output).size,themeFingerprint:fingerprint,zipSha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),unpublishedOnly:true};
fs.writeFileSync(path.join(path.dirname(output),'package-manifest.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
