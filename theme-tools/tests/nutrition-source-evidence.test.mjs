import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url)));
test('all transcribed nutrition facts retain source identity and pending serving interpretation',()=>{
 const evidence=read('merchant-nutrition-evidence-20261015.json'),transcript=read('merchant-nutrition-transcription-20261016.json');
 const seen=new Set();assert.equal(transcript.records.length,28);
 for(const row of transcript.records){
  const deck=evidence.sources.find(s=>s.file===row.sourceFile),slide=deck.slides.find(s=>s.slide===row.slide),key=row.sourceFile+':'+row.slide;
  assert.ok(!seen.has(key));seen.add(key);
  assert.equal(row.sourceSha256,deck.sha256);assert.equal(row.imageSha256,slide.images[0].sha256);assert.deepEqual(row.sourceText,slide.sourceText);
  assert.equal(row.publishable,false);assert.equal(row.servingBasisVerified,false);
  assert.deepEqual(Object.keys(row.facts).sort(),['calories_kcal','protein_g','carbs_g','fat_g','saturated_fat_g','fibre_g','sugar_g','sodium_mg'].sort());
  for(const v of Object.values(row.facts))assert.match(v,/^(?:<)?\d+(?:\.\d+)?$/);
  assert.ok(!('serving_weight_g' in row.facts));assert.ok(!('servings_per_container' in row.facts));
 }
 const tilapia=transcript.records.find(r=>r.sourceFile==='Justprotein2026_No_Costs.pptx'&&r.slide===5);
 assert.equal(tilapia.facts.fibre_g,'<1');assert.equal(tilapia.facts.sugar_g,'<1');
});
