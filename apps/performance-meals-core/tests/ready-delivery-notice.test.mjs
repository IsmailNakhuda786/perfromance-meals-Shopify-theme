import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/ready-delivery-notice.ts'],outdir:'.shopify/ready-notice-test',bundle:true,format:'esm',platform:'node'});
const {readyDeliveryNotice}=await import('../.shopify/ready-notice-test/ready-delivery-notice.js');
const fixture=()=>({orderReference:'#QA',occurrence:1,deliveries:3,deliveryAt:'2027-01-17T22:00:00Z',deliveryEndsAt:'2027-01-18T01:00:00Z',hoursBefore:72,noticeHours:72,shopDomain:'performance-meals-development.myshopify.com',accountUrl:'https://shopify.com/71166492756/account/pages/delivery',accountShopId:'71166492756',whatsappNumber:'6589318076'});
test('both reminder stages use the verified Singapore delivery window and separate billing explanation',()=>{
 for(const hoursBefore of [72,24]){
  const result=readyDeliveryNotice({...fixture(),hoursBefore});
  assert.match(result.email.text,/Monday, 18 January 2027/);assert.match(result.email.text,/06:00–09:00 \(Singapore time\)/);
  assert.match(result.email.text,/Delivery 1 of 3/);assert.match(result.email.text,/does not change your renewal billing date/);
  assert.match(result.email.text,/72 hours’ notice before both/);assert.equal(result.hoursBefore,hoursBefore);assert.equal(result.whatsapp.templateApprovalRequired,true);
  assert.equal(result.whatsapp.variables.deliveryWindow,'06:00–09:00 (Singapore time)');
 }
});
test('merchant-configured notice and original order text are preserved without HTML injection',()=>{
 const result=readyDeliveryNotice({...fixture(),noticeHours:96,orderReference:'<img src=x onerror=alert(1)>'});
 assert.match(result.email.html,/&lt;img/);assert.doesNotMatch(result.email.html,/<img/);assert.match(result.email.text,/96 hours’ notice/);
});
test('foreign or unsafe account links, invalid windows and unsupported reminder stages cannot render',()=>{
 for(const change of [{accountUrl:'https://evil.example/account'},{accountUrl:'https://shopify.com/999/account/pages/delivery'},{accountUrl:'https://shopify.com/71166492756/account/pages/delivery?token=secret'},{accountUrl:'https://user:qa@example.invalid/71166492756/account/pages/delivery'},{deliveryEndsAt:'2027-01-19T01:00:00Z'},{deliveryEndsAt:'2027-01-17T22:00:00Z'},{deliveryAt:'2027-02-30T00:00:00Z'},{hoursBefore:48},{occurrence:4},{noticeHours:0},{orderReference:'#QA\r\nBcc: other'},{whatsappNumber:'not-a-number'}])assert.throws(()=>readyDeliveryNotice({...fixture(),...change}));
 assert.match(readyDeliveryNotice({...fixture(),accountUrl:'https://performance-meals-development.myshopify.com/account'}).email.text,/View your delivery/);
});

test('immediate catch-up uses an upcoming delivery notice without a zero-hour claim',()=>{
 const result=readyDeliveryNotice({...fixture(),hoursBefore:0});
 assert.equal(result.hoursBefore,0);assert.match(result.email.subject,/upcoming/);
 assert.doesNotMatch(result.email.text,/0 hours|72 hours before delivery/);
});
