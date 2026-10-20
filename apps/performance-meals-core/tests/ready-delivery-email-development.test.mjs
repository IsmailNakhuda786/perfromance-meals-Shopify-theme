import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-email-development.server.ts'],outdir:'.shopify/ready-email-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {developmentReadyDeliveryEmail:create}=await import('../.shopify/ready-email-test/ready-delivery-email-development.server.js');
const customerGid='gid://shopify/Customer/123',recipient='qa@example.test',shop='performance-meals-development.myshopify.com';
process.env.ALLOWED_SHOP=shop;process.env.READY_DELIVERY_TEST_RECIPIENT=recipient;process.env.READY_DELIVERY_TEST_CUSTOMER=customerGid;
const notice={orderReference:'#QA',occurrence:1,deliveries:3,deliveryAt:'2099-10-20T01:00:00Z',deliveryEndsAt:'2099-10-20T04:00:00Z',hoursBefore:72,noticeHours:72,shopDomain:shop,accountShopId:'123',accountUrl:'https://'+shop+'/account',whatsappNumber:'6589318076'};
const delivery={customerGid,idempotencyKey:'stable-reminder-revision-1',notice};
const options=transport=>({apiKey:'re_test',recipient,customerGid,transport});
test('all approved reminder stages use validated window and stable provider retry key without claiming a booking',async()=>{
 let calls=0;const send=create(options(async(url,request)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(request.headers['Idempotency-Key'],delivery.idempotencyKey);const body=JSON.parse(request.body);assert.deepEqual(body.to,[recipient]);assert.match(body.subject,/DEVELOPMENT TEST/);assert.match(body.text,/no delivery has been booked/);assert.match(body.text,/09:00–12:00/);assert.match(body.text,/renewal billing date/);assert.ok(!JSON.stringify(body).includes(customerGid));return Response.json({id:'22222222-2222-4222-8222-222222222222'});}));
 for(const hoursBefore of [0,24,72])assert.deepEqual(await send({...delivery,notice:{...notice,hoursBefore}}),{reference:'resend:22222222-2222-4222-8222-222222222222'});
 assert.equal(calls,3);
});
test('recipient changes, stale delivery, foreign shop, invalid windows and runtime production switch cannot send',async()=>{
 let calls=0;const send=create(options(async()=>{calls++;throw Error('Unexpected send');}));
 for(const change of [{customerGid:'gid://shopify/Customer/999'},{idempotencyKey:'bad\nheader'},{notice:{...notice,deliveryAt:'2000-01-01T01:00:00Z',deliveryEndsAt:'2000-01-01T04:00:00Z'}},{notice:{...notice,shopDomain:'other.myshopify.com',accountUrl:'https://other.myshopify.com/account'}},{notice:{...notice,deliveryEndsAt:notice.deliveryAt}},{notice:{...notice,accountUrl:'https://example.test/account'}}])await assert.rejects(send({...delivery,...change}));
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.throws(()=>create(options()));await assert.rejects(send(delivery));}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
 delete process.env.READY_DELIVERY_TEST_RECIPIENT;await assert.rejects(send(delivery));process.env.READY_DELIVERY_TEST_RECIPIENT=recipient;assert.equal(calls,0);
});
test('uncertain provider responses never record accepted delivery',async()=>{
 for(const transport of [async()=>{throw Error('timeout');},async()=>new Response('invalid'),async()=>Response.json({id:'22222222-2222-4222-8222-222222222222'},{status:500}),async()=>Response.json({id:'invalid'})])await assert.rejects(create(options(transport))(delivery));
});
