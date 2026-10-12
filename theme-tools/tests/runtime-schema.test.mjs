import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../../theme/',import.meta.url);
test('homepage dependency closure and server-compatible schema defaults',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('templates/index.json',root),'utf8'));
 assert.ok(index.order.length);
 for(const id of index.order) assert.ok(index.sections[id]);
 for(const filename of fs.readdirSync(new URL('sections/',root)).filter(f=>f.endsWith('.liquid'))){
  const source=fs.readFileSync(new URL(`sections/${filename}`,root),'utf8');
  const schema=JSON.parse(source.match(/{% schema %}([\s\S]*?){% endschema %}/)[1]);
  for(const settings of [schema.settings||[],...(schema.blocks||[]).map(b=>b.settings||[])]){
   assert.ok(settings.filter(s=>s.type==='collection').length<=1,`${filename}: repeated collection picker`);
   for(const setting of settings) assert.ok((setting.label||'').length<=70,`${filename}: setting label exceeds 70 characters`);
   for(const setting of settings) if(setting.type==='url' && 'default' in setting) assert.ok(['/collections','/collections/all'].includes(setting.default),`${filename}: unsupported URL schema default`);
  }
 }
 for(const section of Object.values(index.sections)) assert.ok(fs.existsSync(new URL(`sections/${section.type}.liquid`,root)));
});
