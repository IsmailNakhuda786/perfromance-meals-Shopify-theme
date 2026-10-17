import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-series-calendar.ts','app/services/wallet-credit-policy.ts'],outdir:'.shopify/ready-calendar-test',bundle:true,format:'esm',platform:'node'});
const {planReadySeriesDeliveries,reviewDeliveryChangeNotice}=await import('../.shopify/ready-calendar-test/ready-series-calendar.js');
test('Ready Series preserves the selected first delivery and repeats monthly, clamps short months and restores the original day',()=>{
 const days=['2027-01-31','2027-02-28','2027-03-31','2027-04-30','2027-05-31','2027-06-30'];
 assert.deepEqual(planReadySeriesDeliveries(days[0],6,days).map(x=>x.deliveryDate),days);
 assert.equal(planReadySeriesDeliveries(days[0],3,days).length,3);
});
test('a closure shifts only that occurrence and never changes the original monthly anchor',()=>{
 const result=planReadySeriesDeliveries('2027-01-31',3,['2027-02-01','2027-03-01','2027-03-31']);
 assert.deepEqual(result.map(x=>x.nominalDate),['2027-01-31','2027-02-28','2027-03-31']);
 assert.deepEqual(result.map(x=>x.deliveryDate),['2027-02-01','2027-03-01','2027-03-31']);
 assert.deepEqual(result.map(x=>x.adjusted),[true,true,false]);
});
test('missing, duplicate or impossible availability never invents a delivery date',()=>{
 for(const days of [[],['2027-01-31'],['2027-02-30'],['2027-01-31','2027-01-31']])assert.throws(()=>planReadySeriesDeliveries('2027-01-31',3,days));
 assert.throws(()=>planReadySeriesDeliveries('2027-02-30',3,[]));
 assert.throws(()=>planReadySeriesDeliveries('2027-01-31',1,[]));
});
test('both current and replacement delivery require the configured notice, inclusive at exactly 72 hours',()=>{
 const request='2027-01-01T00:00:00Z',boundary='2027-01-04T00:00:00Z',early='2027-01-03T23:59:59Z';
 assert.equal(reviewDeliveryChangeNotice(request,boundary,boundary).selfServiceNoticeMet,true);
 assert.equal(reviewDeliveryChangeNotice(request,early,boundary).supportRequired,true);
 assert.equal(reviewDeliveryChangeNotice(request,boundary,early).supportRequired,true);
 assert.equal(reviewDeliveryChangeNotice(request,'2027-01-03T00:00:00Z','2027-01-03T00:00:00Z',48).selfServiceNoticeMet,true);
 assert.throws(()=>reviewDeliveryChangeNotice(request,boundary,boundary,0));
 assert.throws(()=>reviewDeliveryChangeNotice('2027-02-30T00:00:00Z',boundary,boundary));
});

const {giftCardClaimTerm}=await import('../.shopify/ready-calendar-test/wallet-credit-policy.js');
test('claiming a Gift Card retains its original Singapore expiry without starting a fresh year',()=>{
 const result=giftCardClaimTerm('2027-11-01','2027-10-01T00:00:00Z');
 assert.equal(result.expiryDate,'2027-11-01');assert.equal(result.expiresAt,'2027-11-01T15:59:59.999Z');assert.equal(result.reminderDate,'2027-10-01');
 assert.equal(giftCardClaimTerm('2028-03-31','2028-03-01T00:00:00Z').reminderDate,'2028-02-29');
 assert.equal(giftCardClaimTerm('2027-11-01','2027-11-01T15:59:59.999Z').expiryDate,'2027-11-01');
 assert.throws(()=>giftCardClaimTerm('2027-11-01','2027-11-01T16:00:00Z'),/expired/);
 for(const date of [null,'','2027-02-29','2027-11-01T00:00:00Z'])assert.throws(()=>giftCardClaimTerm(date,'2027-01-01T00:00:00Z'));
});
const {planReadyDeliveryReminders}=await import('../.shopify/ready-calendar-test/ready-series-calendar.js');
test('every delivery has separate email and WhatsApp reminders at 72 and 24 hours',()=>{
 const reminders=planReadyDeliveryReminders('delivery-1',1,'2027-03-01T00:00:00Z');
 assert.equal(reminders.length,4);assert.equal(new Set(reminders.map(x=>x.idempotencyKey)).size,4);
 assert.deepEqual(reminders.map(x=>[x.channel,x.scheduledAt]),[['email','2027-02-26T00:00:00.000Z'],['whatsapp','2027-02-26T00:00:00.000Z'],['email','2027-02-28T00:00:00.000Z'],['whatsapp','2027-02-28T00:00:00.000Z']]);
 const changed=planReadyDeliveryReminders('delivery-1',2,'2027-03-02T00:00:00Z');
 assert.ok(changed.every(x=>!reminders.some(old=>old.idempotencyKey===x.idempotencyKey)));
 assert.throws(()=>planReadyDeliveryReminders('',1,'2027-03-01T00:00:00Z'));
});

test('a long closure cannot silently merge two separate meal entitlements into one date',()=>{
 assert.throws(()=>planReadySeriesDeliveries('2027-01-01',3,['2027-02-15','2027-03-01']),/merges occurrences/);
});

 test('monthly planning preserves leap years and the year boundary without cumulative drift',()=>{
 assert.deepEqual(planReadySeriesDeliveries('2027-12-31',3,['2027-12-31','2028-01-31','2028-02-29']).map(x=>x.nominalDate),['2027-12-31','2028-01-31','2028-02-29']);
 assert.deepEqual(planReadySeriesDeliveries('2028-02-29',3,['2028-02-29','2028-03-29','2028-04-29']).map(x=>x.nominalDate),['2028-02-29','2028-03-29','2028-04-29']);
 });

const {nextReadySeriesDeliverySlot}=await import('../.shopify/ready-calendar-test/ready-series-calendar.js');
test('package commencement chooses the earliest future merchant slot in Singapore, not input order',()=>{
 const slots=[{id:'later',deliveryAt:'2027-02-02T00:00:00Z'},{id:'first',deliveryAt:'2027-02-01T16:00:00Z'},{id:'past',deliveryAt:'2027-01-01T00:00:00Z'}];
 assert.deepEqual(nextReadySeriesDeliverySlot('2027-02-01T00:00:00Z',slots),{id:'first',deliveryAt:'2027-02-01T16:00:00Z',deliveryDate:'2027-02-02'});
 assert.equal(slots[0].id,'later','do not mutate merchant input');
 assert.throws(()=>nextReadySeriesDeliverySlot('2027-02-03T00:00:00Z',slots),/No future/);
 assert.throws(()=>nextReadySeriesDeliverySlot('2027-02-01T00:00:00Z',[slots[0],slots[0]]),/Invalid/);
 assert.throws(()=>nextReadySeriesDeliverySlot('2027-02-01T00:00:00Z',[{id:'x',deliveryAt:'2027-02-30T00:00:00Z'}]),/Invalid/);
});

test('earliest Singapore slot, monthly anchor and reminder timing remain consistent across a closed month end',()=>{
 const first=nextReadySeriesDeliverySlot('2027-01-30T00:00:00Z',[{id:'first',deliveryAt:'2027-01-31T00:00:00Z'}]);
 const calendar=planReadySeriesDeliveries(first.deliveryDate,3,['2027-01-31','2027-03-01','2027-03-31']);
 assert.deepEqual(calendar.map(x=>[x.nominalDate,x.deliveryDate]),[['2027-01-31','2027-01-31'],['2027-02-28','2027-03-01'],['2027-03-31','2027-03-31']]);
 const adjustedAt=calendar[1].deliveryDate+'T00:00:00Z';
 const notices=planReadyDeliveryReminders('second',1,adjustedAt);
 assert.equal(notices.filter(x=>x.scheduledAt==='2027-02-26T00:00:00.000Z').length,2);
 assert.equal(notices.filter(x=>x.scheduledAt==='2027-02-28T00:00:00.000Z').length,2);
 assert.equal(reviewDeliveryChangeNotice('2027-02-26T00:00:01Z',adjustedAt,'2027-03-05T00:00:00Z').supportRequired,true);
});
