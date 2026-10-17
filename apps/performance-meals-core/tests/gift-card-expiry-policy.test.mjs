import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/gift-card-expiry-policy.server.ts'],outdir:'.shopify/gift-expiry-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {reviewGiftCardExpiry,applyApprovedGiftCardExpiry}=await import('../.shopify/gift-expiry-test/gift-card-expiry-policy.server.js');
const shop='gift-expiry-fixture.myshopify.com',cardGid='gid://shopify/GiftCard/1200',recipient='gid://shopify/Customer/1201';
process.env.ALLOWED_SHOP=shop;
const boundary='2026-10-15T00:00:00Z',now=new Date('2026-10-16T00:00:00Z');
const card=()=>({id:cardGid,createdAt:'2026-10-15T08:00:00Z',enabled:true,expiresOn:null,balance:{amount:'25.00',currencyCode:'SGD'},recipientAttributes:{recipient:{id:recipient}}});
const admin=(gift,change=()=>{})=>({graphql:async(query,{variables})=>{
 assert.match(query,/query GiftCardExpiryEvidence/);assert.doesNotMatch(query,/mutation|maskedCode|code|email/);assert.deepEqual(variables,{id:cardGid});
 const data={shop:{myshopifyDomain:shop,currencyCode:'SGD'},giftCard:structuredClone(gift)};change(data);return Response.json({data});
}});
test('new card review distinguishes missing, correct and merchant-set expiry without writing',async()=>{
 const gift=card(),missing=await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,now);
 assert.equal(missing.state,'EXPIRY_CONFIGURATION_REQUIRED');assert.equal(missing.expectedExpiresOn,'2027-10-15');assert.equal(missing.reminderDate,'2027-09-15');assert.equal(missing.nativeWritePerformed,false);
 gift.expiresOn='2027-10-15';assert.equal((await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,now)).state,'VERIFIED');
 gift.expiresOn='2028-10-15';assert.equal((await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,now)).state,'MERCHANT_REVIEW_REQUIRED');
});
test('historical, fully claimed, disabled and unnamed cards cannot be automatically scheduled as new credits',async()=>{
 const gift=card();gift.createdAt='2026-10-14T08:00:00Z';
 const old=await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,now);assert.equal(old.state,'HISTORICAL_UNCHANGED');assert.equal(old.expectedExpiresOn,null);assert.equal(old.reminderDate,null);
 for(const change of [g=>g.enabled=false,g=>g.balance.amount='0.00']){const g=card();change(g);assert.equal((await reviewGiftCardExpiry(admin(g),shop,cardGid,boundary,now)).state,'UNAVAILABLE');}
 const unnamed=card();unnamed.recipientAttributes=null;assert.equal((await reviewGiftCardExpiry(admin(unnamed),shop,cardGid,boundary,now)).state,'RECIPIENT_REQUIRED');
});
test('invalid native ownership, amounts, dates, future issuance and foreign stores fail closed',async()=>{
 for(const change of [d=>d.shop.myshopifyDomain='foreign.myshopify.com',d=>d.giftCard.id='gid://shopify/GiftCard/999',d=>d.giftCard.balance.currencyCode='USD',d=>d.giftCard.balance.amount='-1.00',d=>d.giftCard.expiresOn='2027-02-30',d=>d.giftCard.createdAt='2026-10-17T00:00:00Z',d=>d.giftCard.createdAt='2026-02-30T00:00:00Z',d=>d.giftCard.recipientAttributes.recipient.id='invalid'])await assert.rejects(reviewGiftCardExpiry(admin(card(),change),shop,cardGid,boundary,now));
 await assert.rejects(reviewGiftCardExpiry(admin(card()),'foreign.myshopify.com',cardGid,boundary,now));
 await assert.rejects(reviewGiftCardExpiry(admin(card()),shop,cardGid,'2026-02-30T00:00:00Z',now));
});

test('one-month reminder candidates respect Singapore expiry day and are never send authorization',async()=>{
 const gift=card();gift.expiresOn='2027-10-15';
 const before=await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,new Date('2027-09-14T15:59:59Z'));assert.equal(before.reminderDue,false);
 const due=await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,new Date('2027-09-14T16:00:00Z'));assert.equal(due.reminderDue,true);assert.equal(due.nativeWritePerformed,false);
 const lastDay=await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,new Date('2027-10-15T15:59:59Z'));assert.equal(lastDay.state,'VERIFIED');
 const expired=await reviewGiftCardExpiry(admin(gift),shop,cardGid,boundary,new Date('2027-10-15T16:00:00Z'));assert.equal(expired.state,'EXPIRED');assert.equal(expired.reminderDue,false);
});


test('expiry writer is off by default; approved new card gets exactly the one-year date and repeat does not write',async()=>{
 let writes=0;const gift=card();
 const native={graphql:async(query,{variables})=>{
  if(query.includes('mutation SetApprovedGiftCardExpiry')){writes++;assert.deepEqual(variables,{id:cardGid,input:{expiresOn:'2027-10-15'}});gift.expiresOn=variables.input.expiresOn;return Response.json({data:{giftCardUpdate:{giftCard:{id:cardGid,expiresOn:gift.expiresOn},userErrors:[]}}});}
  return admin(gift).graphql(query,{variables});
 }};
 delete process.env.GIFT_CARD_EXPIRY_WRITES_ENABLED;
 await assert.rejects(applyApprovedGiftCardExpiry(native,shop,cardGid,recipient,boundary,now),/not activated/);assert.equal(writes,0);
 process.env.GIFT_CARD_EXPIRY_WRITES_ENABLED='true';
 try{
  assert.equal((await applyApprovedGiftCardExpiry(native,shop,cardGid,recipient,boundary,now)).nativeWritePerformed,true);
  assert.equal((await applyApprovedGiftCardExpiry(native,shop,cardGid,recipient,boundary,now)).nativeWritePerformed,false);assert.equal(writes,1);
  gift.expiresOn='2028-10-15';await assert.rejects(applyApprovedGiftCardExpiry(native,shop,cardGid,recipient,boundary,now),/merchant review/);assert.equal(writes,1);
  gift.expiresOn=null;gift.createdAt='2026-10-14T08:00:00Z';await assert.rejects(applyApprovedGiftCardExpiry(native,shop,cardGid,recipient,boundary,now),/merchant review/);assert.equal(writes,1);
 }finally{delete process.env.GIFT_CARD_EXPIRY_WRITES_ENABLED;}
});
test('expiry write rejects wrong recipient and unconfirmed mutation without assuming success',async()=>{
 process.env.GIFT_CARD_EXPIRY_WRITES_ENABLED='true';let writes=0;
 const native={graphql:async(query,options)=>query.includes('mutation')?(writes++,Response.json({data:{giftCardUpdate:{giftCard:null,userErrors:[{message:'Access denied',field:null}]}}})):admin(card()).graphql(query,options)};
 try{
  await assert.rejects(applyApprovedGiftCardExpiry(native,shop,cardGid,'gid://shopify/Customer/999',boundary,now),/recipient differs/);assert.equal(writes,0);
  await assert.rejects(applyApprovedGiftCardExpiry(native,shop,cardGid,recipient,boundary,now),/unconfirmed/);assert.equal(writes,1);
 }finally{delete process.env.GIFT_CARD_EXPIRY_WRITES_ENABLED;}
});
