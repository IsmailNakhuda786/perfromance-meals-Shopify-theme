import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {test,expect} from 'vitest';
// Run from the preserved repository lab, not a temporary standalone copy.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
test('compiled shipping policy snapshot must match the canonical Core services',()=>{
 const hashes=JSON.parse(readFileSync(resolve(root,'labs/core-delivery-function/core-source-hashes.json'),'utf8'));
 for(const [name,hash] of Object.entries(hashes)){
  const core=readFileSync(resolve(root,'apps/performance-meals-core/app/services',name));
  const snapshot=readFileSync(resolve(root,'labs/core-delivery-function/src',name));
  expect(snapshot.equals(core)).toBe(true);
  expect(createHash('sha256').update(snapshot).digest('hex')).toBe(hash);
 }
});
