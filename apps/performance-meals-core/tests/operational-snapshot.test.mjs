import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {operationalModels,legacyModels,version3Models,version4Models,snapshotFields,validateSnapshot,exportOperationalSnapshot,importOperationalSnapshot} from '../scripts/operational-snapshot.mjs';
import {PrismaClient,buildServices} from './support/database.mjs';
import {mkdtempSync,readFileSync,statSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const client=process.env.CORE_TEST_DATABASE_CLIENT||process.env.CORE_TEST_POSTGRES_CLIENT;
const {Prisma}=await import(client?pathToFileURL(client).href:'@prisma/client');
const fields=snapshotFields(Prisma.dmmf.datamodel.models),db=new PrismaClient(),shop=`recovery-${randomUUID()}.myshopify.com`;
const transaction=fn=>db.$transaction(fn,{timeout:60000});
const empty=()=>({version:5,shop,records:Object.fromEntries(operationalModels.map(m=>[m,[]]))});
test.after(async()=>{for(const model of [...operationalModels].reverse())await db[model].deleteMany({where:{shop}});await db.$disconnect();});
test('every operational schema model is exported, with OAuth sessions excluded',async()=>{
 const s=await readFile('prisma/schema.prisma','utf8');const names=[...s.matchAll(/^model (\w+)\s*\{/gm)].map(x=>x[1][0].toLowerCase()+x[1].slice(1)).filter(x=>x!=='session');
 assert.equal(new Set(operationalModels).size,operationalModels.length);assert.deepEqual([...operationalModels].sort(),names.sort());assert.equal(operationalModels.includes('session'),false);
});
test('scope, missing models, unknown tables, malformed rows and duplicate identities fail closed',()=>{
 for(const bad of [{...empty(),shop:'other.myshopify.com'},{...empty(),version:6},{...empty(),records:{}},{...empty(),records:{...empty().records,session:[]}}])assert.throws(()=>validateSnapshot(bad,shop,fields));
 const s=empty();s.records.rewardsAccount=[{id:'a',shop:'other.myshopify.com'}];assert.throws(()=>validateSnapshot(s,shop,fields),/Cross-store/);
 s.records.rewardsAccount=[{id:'a',shop}];assert.throws(()=>validateSnapshot(s,shop,fields),/fields/);
 s.records.rewardsAccount={};assert.throws(()=>validateSnapshot(s,shop,fields),/arrays/);
});
test('legacy snapshots retain compatibility without inventing newer records',()=>{
 for(const version of [1,2,3,4]){const names=version===1?legacyModels.filter(m=>m!=='mealPlanMenuRevision'):version===2?legacyModels:version===3?version3Models:version4Models;const s={version,shop,records:Object.fromEntries(names.map(m=>[m,[]]))};const rows=validateSnapshot(s,shop,fields);assert.deepEqual(rows.prepaidPurchaseEvidence,[]);assert.deepEqual(rows.rewardsEntry,[]);assert.deepEqual(rows.readyDeliveryVisit,[]);assert.deepEqual(rows.readyDeliveryBooking,[]);assert.deepEqual(rows.readyDeliveryPolicy,[]);}
});
test('newer Rewards and delivery records survive complete roundtrip and duplicate import',async()=>{
 await db.customerWallet.create({data:{shop,customerGid:'gid://shopify/Customer/1',currency:'SGD',fundedBalance:123}});
 await db.rewardsAccount.create({data:{shop,customerGid:'gid://shopify/Customer/1',points:47,lifetimeEarned:57}});
 await db.readyDeliverySlot.create({data:{shop,slotKey:'slot-one',deliveryAt:new Date('2030-01-07T01:00:00Z'),deliveryEndsAt:new Date('2030-01-07T04:00:00Z'),capacity:3,available:false}});
 await db.readyDeliveryVisit.create({data:{shop,customerGid:'gid://shopify/Customer/1',orderGid:'gid://shopify/Order/1',destinationKey:'opaque-destination',slotId:'internal-slot',reservationId:'internal-reservation',plan:'{}',packageCount:2}});
 await db.readyDeliveryVisitMember.create({data:{shop,customerGid:'gid://shopify/Customer/1',visitId:'internal-visit',deliveryDraftId:'internal-draft',deliveryRevision:1}});
 await db.readyDeliveryPolicy.create({data:{shop,noticeHours:72,holidayCalendar:'{"years":[2026],"closedDates":[],"source":"fixture"}'}});
 await db.readyDeliveryBooking.create({data:{id:'recovery-booking',shop,customerGid:'gid://shopify/Customer/1',sourceKey:'source-key',orderGid:'gid://shopify/Order/1',visitId:'recovery-visit',nativeProof:'{}',nativeHash:'snapshot-hash',state:'BOOKED'}});
 await db.readyDeliveryBookingRequest.create({data:{shop,customerGid:'gid://shopify/Customer/1',requestKey:'recovery-request',inputHash:'input-hash',bookingId:'recovery-booking',result:'{}'}});
 const snapshot=await transaction(tx=>exportOperationalSnapshot(tx,shop,fields));
 assert.equal(snapshot.records.rewardsAccount[0].points,47);assert.equal(snapshot.records.readyDeliverySlot[0].capacity,3);assert.equal('session' in snapshot.records,false);
 for(const model of operationalModels)await db[model].deleteMany({where:{shop}});
 await transaction(tx=>importOperationalSnapshot(tx,snapshot,shop,fields));await transaction(tx=>importOperationalSnapshot(tx,snapshot,shop,fields));
 assert.deepEqual(await transaction(tx=>exportOperationalSnapshot(tx,shop,fields)),snapshot);
 const duplicate=structuredClone(snapshot);duplicate.records.rewardsAccount.push(duplicate.records.rewardsAccount[0]);assert.throws(()=>validateSnapshot(duplicate,shop,fields),/Duplicate/);
 // A later conflict must roll back earlier newly inserted records too.
 await db.customerWallet.deleteMany({where:{shop}});await db.rewardsAccount.updateMany({where:{shop},data:{points:48}});
 await assert.rejects(transaction(tx=>importOperationalSnapshot(tx,snapshot,shop,fields)),/Conflicting/);
 assert.equal(await db.customerWallet.count({where:{shop}}),0);assert.equal((await db.rewardsAccount.findFirst({where:{shop}})).points,48);
});

test('CLI export creates a private complete file and refuses to overwrite it',async()=>{
 const directory=mkdtempSync(resolve('.shopify/recovery-cli-'));
 try{
  const script=join(directory,'transfer.mjs'),file=join(directory,'snapshot.json');
  await buildServices({entryPoints:['scripts/transfer-operational-state.mjs'],outfile:script,bundle:true,packages:'external',format:'esm',platform:'node'});
  const env={...process.env,ALLOWED_SHOP:shop};
  const run=()=>spawnSync(process.execPath,[script,'export',file],{env,encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);assert.equal(statSync(file).mode&0o777,0o600);
  const before=readFileSync(file,'utf8'),snapshot=JSON.parse(before);assert.equal(snapshot.version,5);validateSnapshot(snapshot,shop,fields);assert.equal(snapshot.records.rewardsAccount[0].points,48);
  const again=run();assert.notEqual(again.status,0);assert.match(again.stderr,/Refusing to overwrite/);assert.equal(readFileSync(file,'utf8'),before);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
