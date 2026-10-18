import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient,buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/gift-card-reminder.server.ts','app/services/gift-card-reminder-batch.server.ts','app/services/gift-card-reminder-development.server.ts'],outdir:'.shopify/gift-reminder-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {registerGiftCardReminder,prepareGiftCardReminder,finishGiftCardReminder}=await import('../.shopify/gift-reminder-test/gift-card-reminder.server.js');
const {runGiftCardReminderBatch}=await import('../.shopify/gift-reminder-test/gift-card-reminder-batch.server.js');
const {developmentGiftCardReminderSender}=await import('../.shopify/gift-reminder-test/gift-card-reminder-development.server.js');
const db=new PrismaClient(),shop=`gift-reminder-${randomUUID()}.myshopify.com`,customer='gid://shopify/Customer/1401',boundary='2026-10-15T00:00:00Z',due=new Date('2027-09-14T16:00:00Z');
process.env.ALLOWED_SHOP=shop;
let sequence=1402;
const gift=()=>({id:`gid://shopify/GiftCard/${++sequence}`,createdAt:'2026-10-15T08:00:00Z',enabled:true,expiresOn:'2027-10-15',balance:{amount:'25.00',currencyCode:'SGD'},recipientAttributes:{recipient:{id:customer}}});
const admin=(card,nativeShop=shop)=>({graphql:async query=>{assert.match(query,/query GiftCardExpiryEvidence/);assert.doesNotMatch(query,/mutation|maskedCode|email/);return Response.json({data:{shop:{myshopifyDomain:nativeShop,currencyCode:'SGD'},giftCard:structuredClone(card)}});}});
async function registered(){const card=gift();return {card,record:await registerGiftCardReminder(admin(card),shop,customer,card.id,boundary,new Date('2026-10-16T00:00:00Z'))};}
test.after(async()=>{await db.giftCardExpiryReminder.deleteMany({where:{shop}});await db.$disconnect();});

test('only verified one-year named-recipient expiry can register once without sending or changing card',async()=>{
 const {card,record}=await registered();
 assert.equal(record.reminderAt.toISOString(),due.toISOString());assert.equal(record.state,'PENDING');assert.equal(record.deliveryKey,null);
 assert.equal((await registerGiftCardReminder(admin(card),shop,customer,card.id,boundary)).id,record.id);
 for(const change of [c=>c.expiresOn=null,c=>c.createdAt='2026-10-14T00:00:00Z',c=>c.recipientAttributes.recipient.id='gid://shopify/Customer/999',c=>c.balance.amount='0.00',c=>c.enabled=false]){
  const invalid=gift();change(invalid);await assert.rejects(registerGiftCardReminder(admin(invalid),shop,customer,invalid.id,boundary));
 }
 assert.equal(await db.giftCardExpiryReminder.count({where:{shop}}),1);
});

test('reminders default off, are due-only and two workers cannot claim the same send',async()=>{
 const {card,record}=await registered();delete process.env.GIFT_CARD_EXPIRY_REMINDERS_ENABLED;
 await assert.rejects(prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due),/not activated/);
 process.env.GIFT_CARD_EXPIRY_REMINDERS_ENABLED='true';
 assert.deepEqual(await prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,new Date(due.getTime()-1)),{state:'NOT_DUE'});
 const attempts=await Promise.allSettled([prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due),prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due)]);
 assert.equal(attempts.filter(item=>item.status==='fulfilled'&&item.value.deliveryKey).length,1);
 const saved=await db.giftCardExpiryReminder.findUnique({where:{id:record.id}});assert.equal(saved.state,'DELIVERING');
 await finishGiftCardReminder(shop,customer,record.id,saved.deliveryKey,{reference:'fixture-receipt-1'});
 assert.equal((await finishGiftCardReminder(shop,customer,record.id,saved.deliveryKey,{reference:'fixture-receipt-1'})).state,'SENT');
 assert.deepEqual(await prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due),{state:'SENT'});
});

test('fully claimed, disabled and expired cards are suppressed rather than emailed',async()=>{
 for(const [change,now,state]of [[c=>c.balance.amount='0.00',due,'UNAVAILABLE'],[c=>c.enabled=false,due,'UNAVAILABLE'],[()=>{},new Date('2027-10-15T16:00:00Z'),'EXPIRED']]){
  const {card,record}=await registered();change(card);
  const prepared=await prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,now);assert.equal(prepared.state,state);assert.equal(prepared.deliveryKey,undefined);
 }
});

test('changed recipient/expiry is held and uncertain delivery never automatically resends',async()=>{
 const {card,record}=await registered();card.recipientAttributes.recipient.id='gid://shopify/Customer/999';
 await assert.rejects(prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due),/reconciliation/);
 card.recipientAttributes.recipient.id=customer;card.expiresOn='2027-10-16';
 await assert.rejects(prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due),/reconciliation/);
 card.expiresOn='2027-10-15';const claimed=await prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due);
 await assert.rejects(finishGiftCardReminder(shop,customer,record.id,'wrong-key',{reference:'fixture'}));
 await finishGiftCardReminder(shop,customer,record.id,claimed.deliveryKey,{unknown:true});
 assert.deepEqual(await prepareGiftCardReminder(admin(card),shop,customer,record.id,boundary,due),{state:'UNKNOWN'});
 await assert.rejects(finishGiftCardReminder(shop,customer,record.id,claimed.deliveryKey,{reference:'late-receipt'}),/held/);
 await assert.rejects(prepareGiftCardReminder(admin(card),'foreign.myshopify.com',customer,record.id,boundary,due));
});

test('batch continuation survives state changes and never retries uncertain provider sends',async()=>{
 // Close prior isolated cases; only this test's three records are due.
 await db.giftCardExpiryReminder.updateMany({where:{shop,state:'PENDING'},data:{state:'UNAVAILABLE'}});
 const samples=await Promise.all([registered(),registered(),registered()]);
 const cards=new Map(samples.map(item=>[item.card.id,item.card]));let sends=0;
 const gateway={adminFor:()=>({graphql:async(query,{variables})=>admin(cards.get(variables.id)).graphql(query)}),send:async delivery=>{
  assert.equal(delivery.customerGid,customer);assert.equal(delivery.remainingMinor,2500);assert.equal(delivery.expiresOn,'2027-10-15');
  sends++;if(sends===1)throw Error('simulated provider timeout');return {reference:'fixture-batch-'+sends};
 }};
 let after;let count=0;
 do{
  const page=await runGiftCardReminderBatch(shop,boundary,gateway,{now:due,limit:1,after});count+=page.processed;after=page.nextCursor;
 }while(after);
 assert.equal(count,3);assert.equal(sends,3);
 assert.equal((await runGiftCardReminderBatch(shop,boundary,gateway,{now:due})).processed,0);assert.equal(sends,3);
 const states=await db.giftCardExpiryReminder.findMany({where:{id:{in:samples.map(item=>item.record.id)}},select:{state:true}});
 assert.equal(states.filter(item=>item.state==='UNKNOWN').length,1);assert.equal(states.filter(item=>item.state==='SENT').length,2);
 await assert.rejects(runGiftCardReminderBatch(shop,boundary,gateway,{now:due,limit:101}));
 await assert.rejects(runGiftCardReminderBatch(shop,boundary,gateway,{now:due,after:'not-a-cursor'}));
});

test('development email adapter composes with the durable batch and keeps timed-out sends held',async()=>{
 await db.giftCardExpiryReminder.updateMany({where:{shop,state:'PENDING'},data:{state:'UNAVAILABLE'}});
 const samples=await Promise.all([registered(),registered()]);const cards=new Map(samples.map(item=>[item.card.id,item.card]));
 process.env.GIFT_CARD_REMINDER_TEST_RECIPIENT='qa@example.invalid';process.env.GIFT_CARD_REMINDER_TEST_CUSTOMER=customer;
 let calls=0;const send=developmentGiftCardReminderSender({apiKey:'re_test',recipient:'qa@example.invalid',customerGid:customer,transport:async(url,request)=>{
  calls++;const body=JSON.parse(request.body);assert.deepEqual(body.to,['qa@example.invalid']);assert.match(body.text,/15 October 2027/);assert.ok(!body.text.includes(customer));
  if(calls===2)throw Error('Uncertain provider response');return Response.json({id:'22222222-2222-4222-8222-222222222222'});
 }});
 const gateway={adminFor:()=>({graphql:async(query,{variables})=>admin(cards.get(variables.id)).graphql(query)}),send};
 const page=await runGiftCardReminderBatch(shop,boundary,gateway,{now:due,limit:2});assert.equal(page.processed,2);assert.equal(calls,2);
 const rows=await db.giftCardExpiryReminder.findMany({where:{id:{in:samples.map(s=>s.record.id)}}});
 assert.equal(rows.filter(r=>r.state==='SENT'&&r.deliveryReference==='resend:22222222-2222-4222-8222-222222222222').length,1);assert.equal(rows.filter(r=>r.state==='UNKNOWN').length,1);
 assert.equal((await runGiftCardReminderBatch(shop,boundary,gateway,{now:due})).processed,0);assert.equal(calls,2);
});
