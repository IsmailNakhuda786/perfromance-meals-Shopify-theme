import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const dir='work/completion-gate',store='performance-meals-development.myshopify.com';
const a=JSON.parse(fs.readFileSync(dir+'/../completion-gate-after.json')),plan=JSON.parse(fs.readFileSync(dir+'/plan.json'));
if(a.shop.myshopifyDomain!==store||plan.store!==store)throw Error('Wrong store');
const queries=[
 'mutation SourceOrder($input:CollectionUpdateInput!){collectionUpdate(collection:$input){collection{id sortOrder} userErrors{field message}}}',
 'mutation Moves($id:ID!,$moves:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$moves){job{id done} userErrors{field message}}}'
];
if(process.argv[2]!=='apply'){console.log('Dry run: source collection ordering. Explicit apply and freshly audited snapshots required.');process.exit(0);}
function run(query,variables,name){fs.writeFileSync(dir+'/ordering.graphql',query);fs.writeFileSync(dir+'/ordering-variables.json',JSON.stringify(variables));execFileSync(path.resolve('work/shopify-cli/node_modules/.bin/shopify'),['store','execute','--store',store,'--version','2026-10','--query-file',dir+'/ordering.graphql','--variable-file',dir+'/ordering-variables.json','--allow-mutations','--output-file',dir+'/'+name+'.json','--json'],{stdio:'pipe'});const r=JSON.parse(fs.readFileSync(dir+'/'+name+'.json'));if(r.errors||Object.values(r).some(x=>x.userErrors?.length))throw Error(JSON.stringify(r));return r;}
for(const [i,handle]of ['ready-series','ready-series-bundles','ready-series-subscriptions'].entries()){
 const col=a.collections.nodes.find(c=>c.handle===handle);run(queries[0],{input:{id:col.id,sortOrder:'MANUAL'}},'sort-'+i);
 const desired=plan.specs.filter(s=>handle==='ready-series'?s.handle.startsWith('pm-rs-')||['pm-qa-protein-meal','pm-qa-low-carb-meal','pm-qa-high-carb-meal'].includes(s.handle):handle==='ready-series-bundles'?s.handle.startsWith('pm-bundle-')||s.handle==='pm-qa-bundle':s.handle.includes('subscription')).map(s=>a.products.nodes.find(p=>p.handle===s.handle).id);
 const current=col.products.nodes.map(p=>p.id);const moves=[];
 for(const [position,id]of desired.entries()){const from=current.indexOf(id);if(from<0)throw Error('Missing approved member');if(from!==position){moves.push({id,newPosition:String(position)});current.splice(from,1);current.splice(position,0,id);}}
 if(moves.length)run(queries[1],{id:col.id,moves},'reorder-'+i);console.log('Source order',handle);
}
