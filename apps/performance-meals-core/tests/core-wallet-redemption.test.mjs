import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/core-wallet-redemption.ts'],outdir:'.shopify/core-wallet-redemption-test',bundle:true,format:'esm',platform:'node'});
const {prepareCoreWalletRedemption:prepare,transitionCoreWalletRedemption:transition,assertCoreWalletRedemption:validate}=await import('../.shopify/core-wallet-redemption-test/core-wallet-redemption.js');
const scope={shop:'wallet-fixture.myshopify.com',customerGid:'gid://shopify/Customer/1',currency:'SGD'};
const now='2026-10-17T00:00:00Z',deadline='2026-10-17T00:10:00Z';
const quote=()=>({...scope,cartReference:'native-cart-1',cartRevision:'v1',ledgerRevision:1,lines:[{id:'food',kind:'food',amountMinor:10000},{id:'delivery',kind:'delivery',amountMinor:1000}]});
const credit=(id,sourceKind,remainingMinor)=>({...scope,id,sourceKind,remainingMinor,issuedAt:'2026-10-01T00:00:00Z',expiresAt:'2027-10-01T15:59:59.999Z'});
const draft=()=>prepare({id:'attempt-1',quote:quote(),credits:[credit('bonus','bonus',2000),credit('principal','customer_funded',10000)],now,reservationDeadline:deadline});
const submit=d=>transition(d,d.revision,{type:'SUBMIT',at:now,quote:quote()});
const receipt=(d,overrides={})=>({...scope,id:'receipt-1',attemptId:d.id,cartDigest:d.digest,amountMinor:d.amountMinor,occurredAt:'2026-10-17T00:01:00Z',...overrides});
test('redemption draft preserves exact source priority, delivery-first principal and food-only bonus',()=>{
 const d=draft();assert.equal(d.amountMinor,11000);assert.deepEqual(d.allocations.map(a=>[a.creditId,a.foodMinor,a.otherMinor]),[['principal',9000,1000],['bonus',1000,0]]);
 assert.equal(d.state,'PREPARED');assert.equal(d.revision,0);
 const original=JSON.stringify(d);const sent=submit(d);assert.equal(sent.state,'SUBMITTING');assert.equal(JSON.stringify(d),original);
});
test('foreign store/customer/currency, duplicate credits and no available balance fail before planning',()=>{
 for(const patch of [{shop:'other.myshopify.com'},{customerGid:'gid://shopify/Customer/2'},{currency:'USD'}])assert.throws(()=>prepare({id:'attempt-1',quote:quote(),credits:[{...credit('x','customer_funded',100),...patch}],now,reservationDeadline:deadline}));
 assert.throws(()=>prepare({id:'attempt-1',quote:quote(),credits:[],now,reservationDeadline:deadline}),/No eligible/);
 const c=credit('x','customer_funded',100);assert.throws(()=>prepare({id:'attempt-1',quote:quote(),credits:[c,c],now,reservationDeadline:deadline}));
});
test('cart, customer, price or ledger changes invalidate submission; reordering identical lines does not',()=>{
 const d=draft();for(const patch of [{ledgerRevision:2},{cartRevision:'v2'},{customerGid:'gid://shopify/Customer/2'},{lines:[{id:'food',kind:'food',amountMinor:1}]}])assert.throws(()=>transition(d,0,{type:'SUBMIT',at:now,quote:{...quote(),...patch}}),/changed/);
 const reordered=quote();reordered.lines.reverse();assert.equal(transition(d,0,{type:'SUBMIT',at:now,quote:reordered}).state,'SUBMITTING');
 assert.throws(()=>transition(d,1,{type:'SUBMIT',at:now,quote:quote()}),/changed/);
});
test('expired credit cannot remain usable through a longer requested reservation',()=>{
 const c={...credit('x','customer_funded',1000),expiresAt:'2026-10-17T00:02:00Z'};
 const d=prepare({id:'attempt-1',quote:quote(),credits:[c],now,reservationDeadline:deadline});assert.equal(d.deadline,'2026-10-17T00:02:00.000Z');
 assert.throws(()=>transition(d,0,{type:'SUBMIT',at:'2026-10-17T00:02:00Z',quote:quote()}),/expired/);
});
test('unknown responses never release credit even after timeout; definitive zero-value rejection can close it',()=>{
 const sent=submit(draft()),unknown=transition(sent,1,{type:'TIMEOUT',at:'2026-10-17T00:02:00Z'});assert.equal(unknown.state,'UNKNOWN');
 assert.throws(()=>transition(unknown,2,{type:'RELEASE_UNSUBMITTED',at:'2026-10-18T00:00:00Z'}),/cannot be released/);
 const released=transition(unknown,2,{type:'REJECTED_FINAL',at:'2026-10-18T00:00:00Z',receipt:receipt(unknown,{amountMinor:0})});assert.equal(released.state,'RELEASED');
 assert.deepEqual(transition(released,3,{type:'REJECTED_FINAL',at:'2026-10-18T00:01:00Z',receipt:receipt(unknown,{amountMinor:0})}),released);
});
test('confirmed payment has one outcome and duplicate receipt is idempotent, not a second settlement',()=>{
 const sent=submit(draft()),proof=receipt(sent);const paid=transition(sent,1,{type:'CONFIRMED',at:'2026-10-17T00:02:00Z',receipt:proof});assert.equal(paid.state,'SETTLED');
 assert.deepEqual(transition(paid,2,{type:'CONFIRMED',at:'2026-10-17T00:03:00Z',receipt:proof}),paid);
 assert.throws(()=>transition(paid,2,{type:'CONFIRMED',at:'2026-10-17T00:03:00Z',receipt:{...proof,id:'another'}}),/Terminal/);
 assert.throws(()=>submit(sent),/repeated/);
});
test('partial, excessive and after-expiry confirmations are held instead of crediting or releasing anything',()=>{
 for(const patch of [{amountMinor:100},{amountMinor:99999},{occurredAt:'2026-10-17T00:11:00Z'}]){
  const sent=submit(draft());assert.equal(transition(sent,1,{type:'CONFIRMED',at:'2026-10-17T00:12:00Z',receipt:receipt(sent,patch)}).state,'HELD');
 }
});
test('wrong owner, cart, reference, forged amount types and future receipts cannot confirm a payment',()=>{
 const sent=submit(draft());for(const patch of [{customerGid:'gid://shopify/Customer/2'},{shop:'other.myshopify.com'},{cartDigest:'wrong'},{attemptId:'another'},{amountMinor:'11000'},{occurredAt:'2026-10-18T00:00:00Z'}])assert.throws(()=>transition(sent,1,{type:'CONFIRMED',at:'2026-10-17T00:02:00Z',receipt:receipt(sent,patch)}));
 assert.throws(()=>transition({...sent,digest:'changed'},1,{type:'TIMEOUT',at:now}));
});

test('receipt chronology, allocation mutation and ambiguous prior outcomes require reconciliation',()=>{
 const d=draft();assert.throws(()=>transition({...d,allocations:d.allocations.map(a=>({...a,sourceKind:'bonus'}))},0,{type:'SUBMIT',at:now,quote:quote()}));
 const sent=submit(d);assert.throws(()=>transition(sent,1,{type:'TIMEOUT',at:'2026-10-16T23:59:59Z'}),/chronology/);
 assert.throws(()=>transition(sent,1,{type:'CONFIRMED',at:'2026-10-17T00:02:00Z',receipt:receipt(sent,{occurredAt:'2026-10-16T23:59:59Z'})}),/identity/);
 const held=transition(sent,1,{type:'CONFIRMED',at:'2026-10-17T00:02:00Z',receipt:receipt(sent,{amountMinor:1})});assert.equal(held.receipt.amountMinor,1);
 assert.throws(()=>transition(held,2,{type:'REJECTED_FINAL',at:'2026-10-17T00:03:00Z',receipt:receipt(sent,{amountMinor:0})}),/audited reconciliation/);
});

test('reloaded drafts cannot invent submission or terminal evidence from corrupted state fields',()=>{
 const d=draft(),sent=submit(d);validate(d);validate(sent);
 for(const value of [{...d,state:'SUBMITTING'},{...d,state:'RELEASED'},{...d,submittedAt:now},{...sent,state:'SETTLED'},{...sent,state:'RELEASED'},{...sent,state:'UNKNOWN',receipt:receipt(sent)},{...sent,lastEventAt:'2026-10-16T00:00:00Z'}])assert.throws(()=>validate(value));
});
