import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/wallet-reminder-development.server.ts'],outdir:'.shopify/reminder-development-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {developmentWalletReminderSender}=await import('../.shopify/reminder-development-test/wallet-reminder-development.server.js');
process.env.WALLET_REMINDER_TEST_RECIPIENT='qa@example.invalid';process.env.WALLET_REMINDER_TEST_CUSTOMER='gid://shopify/Customer/123';
const customer='gid://shopify/Customer/123',delivery={customerGid:customer,currency:'SGD',remainingMinor:100,expiresAt:'2027-10-15T15:59:59.999Z',idempotencyKey:'11111111-1111-4111-8111-111111111111'};
test('development reminder sends only to approved recipient and records provider acceptance with stable key',async()=>{
 let calls=0;
 const send=developmentWalletReminderSender({apiKey:'re_test',recipient:'qa@example.invalid',customerGid:customer,transport:async(url,request)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(request.headers['Idempotency-Key'],delivery.idempotencyKey);const body=JSON.parse(request.body);assert.deepEqual(body.to,['qa@example.invalid']);assert.match(body.subject,/DEVELOPMENT TEST/);assert.match(body.text,/SGD 1.00/);assert.match(body.text,/15 October 2027/);assert.ok(!JSON.stringify(body).includes(customer));return Response.json({id:'22222222-2222-4222-8222-222222222222'});}});
 assert.deepEqual(await send(delivery),{reference:'resend:22222222-2222-4222-8222-222222222222'});assert.equal(calls,1);
 await assert.rejects(send({...delivery,customerGid:'gid://shopify/Customer/999'}));assert.equal(calls,1);
});
test('missing config, foreign recipient, malformed delivery and unconfirmed response fail closed',async()=>{
 assert.throws(()=>developmentWalletReminderSender({apiKey:'',recipient:'qa@example.invalid',customerGid:customer}));
 assert.throws(()=>developmentWalletReminderSender({apiKey:'re_test',recipient:'other@example.com',customerGid:customer}));
 const send=developmentWalletReminderSender({apiKey:'re_test',recipient:'qa@example.invalid',customerGid:customer,transport:async()=>Response.json({error:'no'}, {status:403})});
 await assert.rejects(send({...delivery,remainingMinor:0}),/Invalid/);await assert.rejects(send(delivery),/unconfirmed/);
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.throws(()=>developmentWalletReminderSender({apiKey:'re_test',recipient:'qa@example.invalid',customerGid:customer}));}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
});
