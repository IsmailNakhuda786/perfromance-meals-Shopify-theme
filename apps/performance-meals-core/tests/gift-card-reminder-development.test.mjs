import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/gift-card-reminder-development.server.ts'],outdir:'.shopify/gift-reminder-development-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {developmentGiftCardReminderSender:create}=await import('../.shopify/gift-reminder-development-test/gift-card-reminder-development.server.js');
const customer='gid://shopify/Customer/123',recipient='qa@example.invalid';
process.env.GIFT_CARD_REMINDER_TEST_RECIPIENT=recipient;process.env.GIFT_CARD_REMINDER_TEST_CUSTOMER=customer;
const delivery={customerGid:customer,currency:'SGD',remainingMinor:2500,expiresOn:'2099-02-28',idempotencyKey:'11111111-1111-4111-8111-111111111111'};
const config=transport=>({apiKey:'re_test',recipient,customerGid:customer,transport});
test('Gift Card test sender retains the original date, uses stable delivery key and discloses no claim code or customer ID',async()=>{
 let calls=0;
 const send=create(config(async(url,request)=>{
  calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(request.headers['Idempotency-Key'],delivery.idempotencyKey);
  const body=JSON.parse(request.body);assert.deepEqual(body.to,[recipient]);assert.match(body.subject,/DEVELOPMENT TEST/);assert.match(body.text,/SGD 25.00/);assert.match(body.text,/28 February 2099/);assert.match(body.text,/retains the original Gift Card expiry/);assert.match(body.text,/Only the named recipient/);assert.ok(!JSON.stringify(body).includes(customer));return Response.json({id:'22222222-2222-4222-8222-222222222222'});
 }));
 assert.deepEqual(await send(delivery),{reference:'resend:22222222-2222-4222-8222-222222222222'});assert.equal(calls,1);
});
test('wrong recipient, malformed dates, expired credit and invalid amounts cannot reach the provider',async()=>{
 let calls=0;const send=create(config(async()=>{calls++;throw Error('Unexpected send');}));
 for(const change of [{customerGid:'gid://shopify/Customer/999'},{currency:'USD'},{remainingMinor:0},{remainingMinor:2147483648},{remainingMinor:'2500'},{expiresOn:'2099-02-30'},{expiresOn:'2000-01-01'},{expiresOn:'2099-02-28\nInjected'},{idempotencyKey:'bad\nkey'}])await assert.rejects(send({...delivery,...change}));
 assert.equal(calls,0);assert.throws(()=>create({...config(),recipient:'qa@example.invalid'}));assert.throws(()=>create({...config(),apiKey:''}));
});
test('timeouts and uncertain or malformed provider receipts never become successful delivery receipts',async()=>{
 for(const transport of [async()=>{throw Error('timeout');},async()=>new Response('invalid JSON'),async()=>Response.json({id:'22222222-2222-4222-8222-222222222222'},{status:500}),async()=>Response.json({id:'not-a-receipt'})])await assert.rejects(create(config(transport))(delivery));
 const send=create(config(async()=>{throw Error('Must not send in production');}));const old=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{assert.throws(()=>create(config()));await assert.rejects(send(delivery),/Invalid development/);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});
