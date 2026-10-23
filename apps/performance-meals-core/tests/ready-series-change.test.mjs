import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-series-change.ts'],outdir:'.shopify/ready-series-change-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {planReadySeriesDeliveryChange:plan}=await import('../.shopify/ready-series-change-test/ready-series-change.js');
const occurrence=(n,date)=>({id:'delivery-'+n,occurrence:n,revision:1,slotId:'slot-'+n,deliveryAt:date+'T01:00:00Z',deliveryEndsAt:date+'T04:00:00Z',dispatchState:'UNDISPATCHED'});
function input(count=3){const current=Array.from({length:count},(_,i)=>occurrence(i+1,`2027-${String(i+1).padStart(2,'0')}-18`));return {deliveries:count,occurrence:2,expectedRevision:1,requestedAt:'2027-02-01T01:00:00Z',replacementSlotId:'replacement',noticeHours:72,current,slots:[{id:'replacement',deliveryAt:'2027-02-22T01:00:00Z',deliveryEndsAt:'2027-02-22T04:00:00Z',available:true}]};}
test('one change preserves other paid deliveries and never changes billing or confirms a booking',()=>{
 for(const count of[3,6]){const data=input(count),before=structuredClone(data),p=plan(data);assert.equal(p.state,'READY_FOR_REVALIDATION');assert.equal(p.change.replacement.revision,2);assert.equal(p.change.term.length,count);assert.deepEqual(data,before);for(const row of data.current){if(row.occurrence!==2)assert.deepEqual(p.change.term.find(x=>x.id===row.id),row);}for(const flag of['bookingConfirmed','nativeScheduleChanged','billingScheduleChanged','paidEntitlementsChanged','refundIssued'])assert.equal(p[flag],false);assert.equal(p.planningOnly,true);}
});
test('72-hour boundary includes equality and requires notice for both old and replacement slots',()=>{
 const data=input();data.requestedAt='2027-02-15T01:00:00Z';assert.equal(plan(data).state,'READY_FOR_REVALIDATION');data.requestedAt='2027-02-15T01:00:00.001Z';assert.equal(plan(data).reason,'NOTICE_NOT_MET');
 const other=input();other.slots[0].deliveryAt='2027-02-04T00:59:59Z';other.slots[0].deliveryEndsAt='2027-02-04T04:00:00Z';assert.equal(plan(other).reason,'NOTICE_NOT_MET');other.slots[0].deliveryAt='2027-02-04T01:00:00Z';assert.equal(plan(other).state,'READY_FOR_REVALIDATION');
});
test('merchant-configured notice replaces 72 hours without hard-coded customer cutoff',()=>{
 const data=input();data.noticeHours=96;data.requestedAt='2027-02-14T01:00:00Z';assert.equal(plan(data).state,'READY_FOR_REVALIDATION');data.requestedAt='2027-02-14T01:00:01Z';assert.equal(plan(data).reason,'NOTICE_NOT_MET');
 for(const hours of[undefined,null,0,-1,1.5,8761,NaN])assert.throws(()=>plan({...input(),noticeHours:hours}));
});
test('dispatched and uncertain deliveries go to Support without preparing changes or reminders',()=>{
 for(const state of['DISPATCHED','UNKNOWN']){const data=input();data.current[1].dispatchState=state;const p=plan(data);assert.equal(p.state,'SUPPORT_REQUIRED');assert.equal(p.change,null);assert.equal(p.refundIssued,false);}
});
test('unavailable, missing and ambiguous merchant slots fail instead of choosing another date',()=>{
 for(const edit of[d=>d.slots=[],d=>d.slots[0].available=false,d=>d.slots.push({...d.slots[0]}),d=>d.slots[0].available='true',d=>d.slots[0].id='']){const data=input();edit(data);assert.throws(()=>plan(data));}
});
test('stale, incomplete and duplicate term identities cannot prepare a change',()=>{
 for(const edit of[d=>d.expectedRevision=2,d=>d.current.pop(),d=>d.current[1].occurrence=1,d=>d.current[1].id=d.current[0].id,d=>d.current[1].id='',d=>d.current[1].revision=0,d=>d.current[1].dispatchState='CLOSED',d=>d.deliveries=1,d=>d.occurrence=4,d=>d.expectedRevision=2147483647]){const data=input();edit(data);assert.throws(()=>plan(data));}
});
test('duplicate delivery dates and replacement collisions require Support review',()=>{
 const data=input();data.slots[0].deliveryAt=data.current[2].deliveryAt;data.slots[0].deliveryEndsAt=data.current[2].deliveryEndsAt;assert.throws(()=>plan(data),/overlaps/);
 const duplicate=input();duplicate.current[1].deliveryAt=duplicate.current[0].deliveryAt;duplicate.current[1].deliveryEndsAt=duplicate.current[0].deliveryEndsAt;assert.throws(()=>plan(duplicate),/overlap/);
});
test('no-op keeps the original revision and prepares no duplicate reminders',()=>{
 const data=input(),row=data.current[1];data.slots=[{id:row.slotId,deliveryAt:row.deliveryAt,deliveryEndsAt:row.deliveryEndsAt,available:true}];data.replacementSlotId=row.slotId;const p=plan(data);assert.equal(p.state,'UNCHANGED');assert.equal(p.change,null);assert.equal(data.current[1].revision,1);
});
test('changed occurrence replaces only its old revision reminders with 72/24-hour email and WhatsApp drafts',()=>{
 const p=plan(input()),c=p.change;assert.equal(c.reminders.length,4);assert.equal(c.remindersToSupersede.length,4);for(const row of c.reminders){assert.equal(row.occurrenceId,'delivery-2');assert.equal(row.revision,2);assert.ok([72,24].includes(row.hoursBefore));assert.ok(['email','whatsapp'].includes(row.channel));assert.equal(Date.parse(c.replacement.deliveryAt)-Date.parse(row.scheduledAt),row.hoursBefore*3600000);}assert.equal(new Set([...c.reminders,...c.remindersToSupersede].map(x=>x.idempotencyKey)).size,8);
});
test('invalid or cross-day Singapore windows fail even if UTC dates look plausible',()=>{
 for(const edit of[d=>d.slots[0].deliveryAt='2027-02-30T01:00:00Z',d=>d.slots[0].deliveryEndsAt=d.slots[0].deliveryAt,d=>{d.slots[0].deliveryAt='2027-02-22T15:00:00Z';d.slots[0].deliveryEndsAt='2027-02-22T17:00:00Z';},d=>d.requestedAt='invalid']){const data=input();edit(data);assert.throws(()=>plan(data));}
});
