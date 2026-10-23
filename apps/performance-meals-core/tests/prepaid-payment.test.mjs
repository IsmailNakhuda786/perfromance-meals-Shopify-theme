import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/prepaid-payment.server.ts'],outdir:'.shopify/prepaid-payment-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readPrepaidPayment,PREPAID_PAYMENT_QUERY}=await import('../.shopify/prepaid-payment-test/prepaid-payment.server.js');
const shop='prepaid-payment-fixture.myshopify.com';process.env.ALLOWED_SHOP=shop;
const expected={months:3,customerGid:'gid://shopify/Customer/2',orderGid:'gid://shopify/Order/3',orderLineGid:'gid://shopify/LineItem/9',productGid:'gid://shopify/Product/4',variantGid:'gid://shopify/ProductVariant/5',sellingPlanGid:'gid://shopify/SellingPlan/6',upfrontMinor:25520};
const money=amount=>({shopMoney:{amount,currencyCode:'SGD'}});
const payment=(id,amount,kind='SALE')=>({id:`gid://shopify/OrderTransaction/${id}`,test:true,status:'SUCCESS',kind,gateway:'test-gateway',manualPaymentGateway:false,processedAt:'2026-10-20T01:01:00Z',amountSet:money(amount)});
const fixture=()=>({shop:{myshopifyDomain:shop,currencyCode:'SGD'},order:{id:expected.orderGid,test:true,createdAt:'2026-10-20T01:00:00Z',cancelledAt:null,currencyCode:'SGD',taxesIncluded:true,displayFinancialStatus:'PAID',customer:{id:expected.customerGid},disputes:[],totalPriceSet:money('255.20'),currentTotalPriceSet:money('255.20'),totalReceivedSet:money('255.20'),totalRefundedSet:money('0'),totalShippingPriceSet:money('0'),totalDiscountsSet:money('0'),transactions:[payment(10,'255.20')],lineItems:{nodes:[{id:expected.orderLineGid,quantity:3,currentQuantity:3,isGiftCard:false,product:{id:expected.productGid},variant:{id:expected.variantGid},sellingPlan:{sellingPlanId:expected.sellingPlanGid}}],pageInfo:{hasNextPage:false}}}});
const admin=(data,status=200)=>({graphql:async(query,options)=>{assert.equal(query,PREPAID_PAYMENT_QUERY);assert.doesNotMatch(query,/\bmutation\b/);assert.equal(options.variables.id,expected.orderGid);return Response.json({data},{status});}});
test('native prepaid-only capture proves full package value and payment time, never a charge or activation',async()=>{
 const proof=await readPrepaidPayment(admin(fixture()),shop,expected);
 assert.equal(proof.upfrontMinor,25520);assert.equal(proof.paidAt,'2026-10-20T01:01:00.000Z');assert.equal(proof.payments.length,1);
 assert.equal('activated' in proof,false);
});
test('multiple captured receipts sum once; authorization and failed attempts are not counted',async()=>{
 const data=fixture();data.order.transactions=[payment(10,'100'),{...payment(11,'155.20','CAPTURE'),processedAt:'2026-10-20T01:05:00+00:00'},payment(12,'255.20','AUTHORIZATION'),{...payment(13,'255.20'),status:'FAILURE'}];
 const proof=await readPrepaidPayment(admin(data),shop,expected);
 assert.equal(proof.upfrontMinor,25520);assert.equal(proof.payments.length,2);assert.equal(proof.paidAt,'2026-10-20T01:05:00.000Z');
});
test('wrong stores, identity, non-test payments, unpaid/cancelled/disputed orders and incomplete lines hold',async()=>{
 for(const change of [d=>d.shop.myshopifyDomain='foreign.myshopify.com',d=>d.order.id='gid://shopify/Order/99',d=>d.order.customer.id='gid://shopify/Customer/99',d=>d.order.test=false,d=>d.order.transactions[0].test=false,d=>d.order.displayFinancialStatus='PARTIALLY_PAID',d=>d.order.cancelledAt='2026-10-20T01:10:00Z',d=>d.order.disputes=[{id:'dispute'}],d=>d.order.taxesIncluded=false,d=>d.order.lineItems.pageInfo.hasNextPage=true,d=>delete d.order.lineItems.pageInfo,d=>d.order.lineItems.nodes[0].sellingPlan=null,d=>d.order.lineItems.nodes[0].variant.id='gid://shopify/ProductVariant/99',d=>d.order.lineItems.nodes[0].currentQuantity=0,d=>d.order.lineItems.nodes[0].isGiftCard=true,d=>d.order.lineItems.nodes.push(structuredClone(d.order.lineItems.nodes[0]))]){
  const data=fixture();change(data);await assert.rejects(readPrepaidPayment(admin(data),shop,expected));
 }
});
test('incorrect totals, extra delivery, discounts, edited orders and aggregate-only paid labels are insufficient',async()=>{
 for(const change of [d=>d.order.totalReceivedSet=money('0'),d=>d.order.currentTotalPriceSet=money('254.20'),d=>d.order.totalRefundedSet=money('1'),d=>d.order.totalShippingPriceSet=money('10'),d=>d.order.totalDiscountsSet=money('1'),d=>d.order.transactions=[],d=>d.order.transactions[0].amountSet=money('100'),d=>d.order.transactions[0].amountSet.shopMoney.currencyCode='USD',d=>d.order.transactions[0].status='PENDING',d=>d.order.transactions[0].kind='REFUND',d=>d.order.transactions[0].kind='VOID',d=>d.order.transactions[0].kind='AUTHORIZATION',d=>d.order.transactions.push(structuredClone(d.order.transactions[0])),d=>d.order.transactions=Array.from({length:100},(_,i)=>payment(i+100,'2.552'))]){
  const data=fixture();change(data);await assert.rejects(readPrepaidPayment(admin(data),shop,expected));
 }
});
test('invalid receipt references, times, money and expected snapshots cannot become successful proof',async()=>{
 for(const change of [d=>d.order.createdAt='2026-02-30T00:00:00Z',d=>d.order.transactions[0].processedAt=null,d=>d.order.transactions[0].processedAt='2026-02-30T01:00:00Z',d=>d.order.transactions[0].id='10',d=>d.order.transactions[0].gateway='',d=>d.order.transactions[0].amountSet=money('255.200'),d=>d.order.transactions[0].amountSet=money('-255.20')]){
  const data=fixture();change(data);await assert.rejects(readPrepaidPayment(admin(data),shop,expected));
 }
 for(const change of [{upfrontMinor:0},{upfrontMinor:25520.5},{customerGid:2},{orderLineGid:'gid://shopify/Order/9'}])await assert.rejects(readPrepaidPayment(admin(fixture()),shop,{...expected,...change}));
 await assert.rejects(readPrepaidPayment(admin(fixture(),500),shop,expected));
 await assert.rejects(readPrepaidPayment({graphql:async()=>Response.json({errors:[{message:'denied'}],data:fixture()})},shop,expected));
});

test('manually marked payments and missing gateway classification cannot prove captured funds',async()=>{
 for(const flag of [true,undefined,null]){
  const data=fixture();data.order.transactions[0].manualPaymentGateway=flag;
  await assert.rejects(readPrepaidPayment(admin(data),shop,expected),/Manual or unverified/);
 }
});

test('prepaid order quantity represents all deliveries, never the single checkout quantity',async()=>{
 const wrong=fixture();wrong.order.lineItems.nodes[0].quantity=1;wrong.order.lineItems.nodes[0].currentQuantity=1;
 await assert.rejects(readPrepaidPayment(admin(wrong),shop,expected),/package differs/);
 const six=fixture();six.order.lineItems.nodes[0].quantity=6;six.order.lineItems.nodes[0].currentQuantity=6;
 assert.equal((await readPrepaidPayment(admin(six),shop,{...expected,months:6})).upfrontMinor,25520);
});

const {readCorrectedPrepaidPayment:readCorrected,PREPAID_CORRECTED_PAYMENT_QUERY}=await import('../.shopify/prepaid-payment-test/prepaid-payment.server.js');
const correction=(months=3,kind='AUTOMATIC',taxMinor=0)=>({baseMinor:months===3?25521:49362,discountMinor:months===3?1:2,applicationKind:kind,title:'Approved exact-price correction',taxMinor});
function corrected(months=3,kind='AUTOMATIC',taxMinor=0){
 const d=fixture(),c=correction(months,kind,taxMinor),total=months===3?'255.20':'493.60',line=d.order.lineItems.nodes[0];
 for(const key of ['totalPriceSet','currentTotalPriceSet','totalReceivedSet'])d.order[key]=money(total);d.order.transactions[0].amountSet=money(total);
 d.order.totalDiscountsSet=money((c.discountMinor/100).toFixed(2));d.order.totalTaxSet=money((taxMinor/100).toFixed(2));d.order.currentTotalTaxSet=money((taxMinor/100).toFixed(2));
 line.quantity=months;line.currentQuantity=months;line.originalTotalSet=money((c.baseMinor/100).toFixed(2));line.discountAllocations=[{allocatedAmountSet:money((c.discountMinor/100).toFixed(2)),discountApplication:{__typename:kind==='AUTOMATIC'?'AutomaticDiscountApplication':'ManualDiscountApplication',title:c.title}}];return d;
}
const correctedAdmin=d=>({graphql:async(q,{variables})=>{assert.equal(q,PREPAID_CORRECTED_PAYMENT_QUERY);assert.doesNotMatch(q,/\bmutation\b/);assert.equal(variables.id,expected.orderGid);return Response.json({data:d});}});
test('explicit approved corrections prove exact three/six-term net paid amounts while retaining release holds',async()=>{
 for(const months of[3,6])for(const kind of['AUTOMATIC','MANUAL']){const e={...expected,months,upfrontMinor:months===3?25520:49360},p=await readCorrected(correctedAdmin(corrected(months,kind)),shop,e,correction(months,kind));assert.equal(p.upfrontMinor,e.upfrontMinor);assert.equal(p.correction.discountMinor,months===3?1:2);assert.equal(p.checkoutPropagationVerified,false);assert.equal(p.futureRenewalVerified,false);await assert.rejects(readPrepaidPayment(admin(corrected(months,kind)),shop,e));}
});
test('explicit GST must match both original and current native tax evidence',async()=>{
 const c=correction(3,'AUTOMATIC',2107),d=corrected(3,'AUTOMATIC',2107);assert.equal((await readCorrected(correctedAdmin(d),shop,expected,c)).correction.taxMinor,2107);
 for(const edit of[d=>d.order.totalTaxSet=money('21.08'),d=>d.order.currentTotalTaxSet=money('0'),d=>delete d.order.totalTaxSet,d=>d.order.totalTaxSet.shopMoney.currencyCode='USD']){const d=corrected(3,'AUTOMATIC',2107);edit(d);await assert.rejects(readCorrected(correctedAdmin(d),shop,expected,c));}
});
test('correct total alone cannot hide missing, extra, foreign or differently titled native correction allocations',async()=>{
 for(const edit of[d=>delete d.order.lineItems.nodes[0].discountAllocations,d=>d.order.lineItems.nodes[0].discountAllocations=[],d=>d.order.lineItems.nodes[0].discountAllocations.push(structuredClone(d.order.lineItems.nodes[0].discountAllocations[0])),d=>d.order.lineItems.nodes[0].discountAllocations[0].discountApplication.__typename='DiscountCodeApplication',d=>d.order.lineItems.nodes[0].discountAllocations[0].discountApplication.title='Other promotion',d=>d.order.lineItems.nodes[0].originalTotalSet=money('255.22'),d=>d.order.lineItems.nodes[0].discountAllocations[0].allocatedAmountSet=money('0.02'),d=>d.order.totalDiscountsSet=money('0.02')]){const d=corrected();edit(d);await assert.rejects(readCorrected(correctedAdmin(d),shop,expected,correction()));}
});
test('approved cent correction does not permit delivery fees, short payments, foreign ownership or real charges',async()=>{
 for(const edit of[d=>d.order.totalShippingPriceSet=money('5'),d=>d.order.transactions[0].amountSet=money('255.18'),d=>d.order.customer.id='gid://shopify/Customer/99',d=>d.order.test=false,d=>d.order.transactions[0].test=false,d=>d.order.totalRefundedSet=money('0.01'),d=>d.order.lineItems.nodes[0].currentQuantity=0]){const d=corrected();edit(d);await assert.rejects(readCorrected(correctedAdmin(d),shop,expected,correction()));}
});
test('missing or broadened correction authority is refused before a native request',async()=>{
 const api={graphql:async()=>assert.fail('No request authorized')};
 for(const c of[null,{...correction(),discountMinor:0},{...correction(),discountMinor:3,baseMinor:25523},{...correction(),baseMinor:25522},{...correction(),title:''},{...correction(),applicationKind:'CODE'},{...correction(),taxMinor:undefined},{...correction(),taxMinor:-1},{...correction(),taxMinor:25521}])await assert.rejects(readCorrected(api,shop,expected,c));
});

test('native capture may precede order creation; both receipt paths retain actual payment time',async()=>{
 const d=fixture();d.order.transactions[0].processedAt='2026-10-20T00:59:57Z';
 assert.equal((await readPrepaidPayment(admin(d),shop,expected)).paidAt,'2026-10-20T00:59:57.000Z');
 const c=corrected();c.order.transactions[0].processedAt='2026-10-20T00:59:57Z';
 assert.equal((await readCorrected(correctedAdmin(c),shop,expected,correction())).paidAt,'2026-10-20T00:59:57.000Z');
});
