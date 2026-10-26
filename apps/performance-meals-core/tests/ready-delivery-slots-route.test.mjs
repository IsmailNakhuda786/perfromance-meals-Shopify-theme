import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
const shop=`ready-slot-route-${randomUUID()}.myshopify.com`,other=`other-${randomUUID()}.myshopify.com`;
globalThis.readySlotAdminFixture={shop,authorized:true};
await buildServices({entryPoints:['app/routes/app.ready-delivery-slots.tsx','app/services/ready-delivery-slot-form.ts'],outdir:'.shopify/ready-slot-route-test',outbase:'app',bundle:true,packages:'external',format:'esm',platform:'node',plugins:[{name:'slot-admin-auth',setup(b){b.onResolve({filter:/shopify\.server$/},a=>({path:a.path,namespace:'slot-auth'}));b.onLoad({filter:/.*/,namespace:'slot-auth'},()=>({loader:'js',contents:'export const authenticate={admin:async()=>{const s=globalThis.readySlotAdminFixture;if(!s.authorized)throw new Response(null,{status:401});return {session:{shop:s.shop}};}};'}));}}]});
const {loader,action}=await import('../.shopify/ready-slot-route-test/routes/app.ready-delivery-slots.js');
const {readyDeliverySlotForm:parse}=await import('../.shopify/ready-slot-route-test/services/ready-delivery-slot-form.js');
const db=new PrismaClient();process.env.ALLOWED_SHOP=shop;process.env.READY_DELIVERY_CAPACITY_ENABLED='true';
const form=(edits={})=>new URLSearchParams({intent:'create',revision:'0',date:'2026-11-02',start:'09:00',end:'12:00',capacity:'30',available:'yes',...edits});
const post=body=>action({request:new Request('https://core.example.invalid/app/ready-delivery-slots',{method:'POST',body})});
const get=search=>loader({request:new Request('https://core.example.invalid/app/ready-delivery-slots'+(search??''))});
test.after(async()=>{await db.readyDeliverySlot.deleteMany({where:{shop:{in:[shop,other]}}});await db.$disconnect();});
test('merchant form converts Singapore dates exactly, independent of browser timezone',()=>{
 const f=new FormData();for(const[k,v]of form())f.set(k,v);assert.deepEqual(parse(f),{deliveryAt:'2026-11-02T01:00:00.000Z',deliveryEndsAt:'2026-11-02T04:00:00.000Z',capacity:30,available:true,expectedRevision:0});
 f.set('start','00:15');f.set('end','01:00');assert.equal(parse(f).deliveryAt,'2026-11-01T16:15:00.000Z');
 for(const change of[{date:'2026-02-30'},{start:'24:00'},{end:'00:00'},{capacity:'0'},{capacity:'2.5'},{capacity:'2147483648'},{revision:'-1'},{available:'true'}]){const bad=new FormData();for(const[k,v]of form(change))bad.set(k,v);assert.throws(()=>parse(bad));}
});
test('only authenticated admins of the authorized store can read or save slots',async()=>{
 globalThis.readySlotAdminFixture.authorized=false;try{await assert.rejects(get(),e=>e.status===401);await assert.rejects(post(form()),e=>e.status===401);}finally{globalThis.readySlotAdminFixture.authorized=true;}
 globalThis.readySlotAdminFixture.shop=other;try{await assert.rejects(get(),e=>e.status===403);await assert.rejects(post(form()),e=>e.status===403);}finally{globalThis.readySlotAdminFixture.shop=shop;}
 assert.equal(await db.readyDeliverySlot.count({where:{shop}}),0);
});
test('default-off page has no controls or writes, even with a forged form',async()=>{
 process.env.READY_DELIVERY_CAPACITY_ENABLED='false';try{assert.deepEqual(await get(),{enabled:false,slots:[],nextUrl:null});await assert.rejects(post(form()),e=>e.status===403);}finally{process.env.READY_DELIVERY_CAPACITY_ENABLED='true';}
 assert.equal(await db.readyDeliverySlot.count({where:{shop}}),0);
});
test('admin creates and edits own slot; posted store identity cannot redirect writes',async()=>{
 const result=await post(form({shop:other}));assert.equal(result.error,null);const slot=await db.readyDeliverySlot.findFirstOrThrow({where:{shop}});assert.equal(slot.capacity,30);assert.equal(await db.readyDeliverySlot.count({where:{shop:other}}),0);
 const page=await get();assert.equal(page.slots.length,1);assert.equal(page.slots[0].start,'09:00');assert.equal(page.slots[0].end,'12:00');assert.equal(page.slots[0].date,'2026-11-02');
 const update=form({intent:'update',slotKey:slot.slotKey,revision:'1',capacity:'40'});update.delete('available');assert.equal((await post(update)).error,null);
 const changed=await db.readyDeliverySlot.findUnique({where:{id:slot.id}});assert.equal(changed.capacity,40);assert.equal(changed.available,false);assert.equal(changed.revision,2);
 assert.ok((await post(form({intent:'update',slotKey:slot.slotKey,revision:'1',capacity:'50'}))).error);assert.equal((await db.readyDeliverySlot.findUnique({where:{id:slot.id}})).capacity,40);
});
test('bad inputs and unsupported methods fail without creating or changing records',async()=>{
 const before=await db.readyDeliverySlot.findMany({where:{shop},orderBy:{id:'asc'}});
 for(const edit of[{capacity:'0'},{date:'2026-02-30'},{intent:'update',slotKey:'missing',revision:'0'},{intent:'create',revision:'1'}])assert.ok((await post(form(edit))).error);
 await assert.rejects(post(form({intent:'delete'})),e=>e.status===400);
 await assert.rejects(action({request:new Request('https://core.example.invalid/app/ready-delivery-slots',{method:'DELETE',body:form()})}),e=>e.status===405);
 assert.deepEqual(await db.readyDeliverySlot.findMany({where:{shop},orderBy:{id:'asc'}}),before);
});
test('slot pagination is complete, store-scoped and preserves embedded-app parameters',async()=>{
 await db.readyDeliverySlot.createMany({data:Array.from({length:27},(_,i)=>({shop,slotKey:randomUUID(),deliveryAt:new Date(Date.UTC(2027,0,i+1,1)),deliveryEndsAt:new Date(Date.UTC(2027,0,i+1,4)),capacity:10}))});
 const foreign=await db.readyDeliverySlot.create({data:{shop:other,slotKey:randomUUID(),deliveryAt:new Date('2027-01-01T01:00:00Z'),deliveryEndsAt:new Date('2027-01-01T04:00:00Z'),capacity:10}});
 const first=await get('?host=fixture&embedded=1');assert.equal(first.slots.length,25);assert.match(first.nextUrl,/host=fixture/);assert.match(first.nextUrl,/embedded=1/);
 const next=await loader({request:new Request('https://core.example.invalid'+first.nextUrl)});assert.equal(next.slots.length,3);assert.equal(next.nextUrl,null);assert.equal(new Set([...first.slots,...next.slots].map(s=>s.slotKey)).size,28);
 await assert.rejects(get('?after='+foreign.id),/cursor/);await assert.rejects(get('?after='),/page/);
});
