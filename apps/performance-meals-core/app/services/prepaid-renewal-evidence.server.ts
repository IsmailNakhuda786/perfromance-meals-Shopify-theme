import {createHash} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {inspectPrepaidContract,type PrepaidExpectation} from './prepaid-verification.server';
import {readPrepaidPayment,readCorrectedPrepaidPayment,type PrepaidPaymentExpectation,type PrepaidPriceCorrection} from './prepaid-payment.server';
import {inspectPrepaidRenewal,inspectCorrectedPrepaidRenewal,type PrepaidRenewalExpectation} from './prepaid-renewal.server';
import {linkVerifiedPrepaidRenewal} from './subscription-renewal-links.server';
import {recordOrder} from './orders.server';

type Admin=Parameters<typeof inspectPrepaidContract>[0];
type Initial=PrepaidExpectation&PrepaidPaymentExpectation;
type PurchaseSnapshot={version:1;contractGid:string;expected:Initial;correction:PrepaidPriceCorrection|null};
type RenewalSnapshot={version:1;purchaseHash:string;expected:PrepaidRenewalExpectation&Initial;correction:PrepaidPriceCorrection|null};
type Purchase=NonNullable<Awaited<ReturnType<typeof db.prepaidPurchaseEvidence.findUnique>>>;
type Renewal=NonNullable<Awaited<ReturnType<typeof db.prepaidRenewalEvidence.findUnique>>>;
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function assertPrepaidEvidenceId(value:unknown){if(typeof value!=='string'||! /^[A-Za-z0-9_-]{1,200}$/.test(value))throw Error('Invalid saved prepaid evidence identity');}
export function assertPrepaidRenewalEvidenceScope(shop:string,customerGid?:string){
 assertShop(shop);
 if(process.env.NODE_ENV==='production'||process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED!=='true')throw Error('Prepaid renewal evidence is not activated');
 const customer=process.env.CORE_PREPAID_RENEWAL_LINKS_QA_CUSTOMER;
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customer??'')||customerGid!==undefined&&customerGid!==customer)throw Error('Isolated prepaid QA customer required');
 return customer!;
}
const initial=(e:Initial):Initial=>({months:e.months,appGid:e.appGid,customerGid:e.customerGid,orderGid:e.orderGid,orderLineGid:e.orderLineGid,productGid:e.productGid,variantGid:e.variantGid,sellingPlanGid:e.sellingPlanGid,upfrontMinor:e.upfrontMinor});
const correction=(c?:PrepaidPriceCorrection|null):PrepaidPriceCorrection|null=>c?{baseMinor:c.baseMinor,discountMinor:c.discountMinor,applicationKind:c.applicationKind,title:c.title,taxMinor:c.taxMinor}:null;
function readPurchase(row:Purchase):PurchaseSnapshot{
 if(hash(row.snapshot)!==row.snapshotHash)throw Error('Purchased evidence checksum differs');
 const value=JSON.parse(row.snapshot) as PurchaseSnapshot;
 if(value.version!==1||value.contractGid!==row.contractGid||value.expected.customerGid!==row.customerGid||value.expected.orderGid!==row.originalOrderGid||value.expected.orderLineGid!==row.originalLineGid)throw Error('Purchased evidence identity differs');
 return value;
}
function readRenewal(row:Renewal,purchase:Purchase):RenewalSnapshot{
 if(hash(row.snapshot)!==row.snapshotHash||row.purchaseEvidenceId!==purchase.id||row.shop!==purchase.shop||row.customerGid!==purchase.customerGid||row.contractGid!==purchase.contractGid||!['PENDING_LINK','COMPLETED'].includes(row.state)||row.state==='COMPLETED'&&!row.completedAt)throw Error('Renewal evidence identity differs');
 const value=JSON.parse(row.snapshot) as RenewalSnapshot;
 const original=readPurchase(purchase);
 if(value.version!==1||value.purchaseHash!==purchase.snapshotHash||value.expected.attemptGid!==row.attemptGid||value.expected.renewalOrderGid!==row.renewalOrderGid||JSON.stringify(initial(value.expected))!==JSON.stringify(original.expected))throw Error('Renewal does not retain its purchased snapshot');
 return value;
}
async function createOrVerifyPurchase(data:Omit<Purchase,'id'|'createdAt'>){
 try{return await db.prepaidPurchaseEvidence.create({data});}catch(error){
  if((error as {code?:string}).code!=='P2002')throw error;
  const previous=await db.prepaidPurchaseEvidence.findUnique({where:{shop_contractGid:{shop:data.shop,contractGid:data.contractGid}}});
  if(!previous||previous.snapshot!==data.snapshot||previous.snapshotHash!==data.snapshotHash||previous.customerGid!==data.customerGid||previous.originalLineGid!==data.originalLineGid||previous.originalOrderGid!==data.originalOrderGid)throw Error('A different purchased snapshot is already registered');
  readPurchase(previous);return previous;
 }
}

// Server-only immutable evidence. This records existing paid proof, not permission
// to collect money. No route accepts a browser-supplied package or price snapshot.
export async function registerPrepaidPurchaseEvidence(admin:Admin,shop:string,contractGid:string,expected:Initial,priceCorrection?:PrepaidPriceCorrection){
 assertPrepaidRenewalEvidenceScope(shop,expected.customerGid);
 const e=initial(expected),c=correction(priceCorrection);
 if(c)await readCorrectedPrepaidPayment(admin,shop,e,c);else await readPrepaidPayment(admin,shop,e);
 const native=await inspectPrepaidContract(admin,shop,contractGid,e);
 if(!native.billingConfigurationMatches||!native.deliveryPolicyMatches||native.contract.lines.nodes.length!==1||minorAmount(native.contract.lines.nodes[0].currentPrice.amount)!==(c?.baseMinor??e.upfrontMinor))throw Error('Purchased contract or price requires review');
 const rows=await db.operationalLine.findMany({where:{shop,orderGid:e.orderGid}}),row=rows[0];
 if(rows.length!==1||row.validationStatus!=='VALIDATED'||row.businessStream!=='ready_series'||row.customerGid!==e.customerGid||row.contractGid!==contractGid||row.orderLineGid!==e.orderLineGid||row.productGid!==e.productGid||row.variantGid!==e.variantGid||row.selectionId!==null||row.bundleReviewId!==null)throw Error('Validated original purchase binding required');
 const snapshot=JSON.stringify({version:1,contractGid,expected:e,correction:c} satisfies PurchaseSnapshot);
 return createOrVerifyPurchase({shop,customerGid:e.customerGid,contractGid,originalOrderGid:e.orderGid,originalLineGid:e.orderLineGid,snapshot,snapshotHash:hash(snapshot)});
}

// Stage only an already successful native billing attempt. Native payment and
// attempt linkage must match the purchased price; corrections are never inferred.
export async function registerPrepaidRenewalEvidence(admin:Admin,shop:string,purchaseId:string,attempt:Pick<PrepaidRenewalExpectation,'attemptGid'|'idempotencyKey'|'renewalOrderGid'|'renewalOrderLineGid'>,renewalCorrection?:PrepaidPriceCorrection){
 const customer=assertPrepaidRenewalEvidenceScope(shop);assertPrepaidEvidenceId(purchaseId);
 const purchase=await db.prepaidPurchaseEvidence.findFirst({where:{id:purchaseId,shop,customerGid:customer}});
 if(!purchase)throw Error('Registered purchase unavailable');
 const original=readPurchase(purchase),c=correction(renewalCorrection);
 if(!!original.correction!==!!c||original.correction&&c&&(c.baseMinor!==original.correction.baseMinor||c.discountMinor!==original.correction.discountMinor||c.title!==original.correction.title))throw Error('Renewal correction differs from purchased price');
 const expected={...original.expected,attemptGid:attempt.attemptGid,idempotencyKey:attempt.idempotencyKey,renewalOrderGid:attempt.renewalOrderGid,renewalOrderLineGid:attempt.renewalOrderLineGid};
 if(c)await inspectCorrectedPrepaidRenewal(admin,shop,purchase.contractGid,expected,c);else await inspectPrepaidRenewal(admin,shop,purchase.contractGid,expected);
 const snapshot=JSON.stringify({version:1,purchaseHash:purchase.snapshotHash,expected,correction:c} satisfies RenewalSnapshot),snapshotHash=hash(snapshot);
 const data={shop,customerGid:customer,contractGid:purchase.contractGid,purchaseEvidenceId:purchase.id,attemptGid:expected.attemptGid,renewalOrderGid:expected.renewalOrderGid,snapshot,snapshotHash};
 try{return await db.prepaidRenewalEvidence.create({data});}catch(error){
  if((error as {code?:string}).code!=='P2002')throw error;
  const previous=await db.prepaidRenewalEvidence.findUnique({where:{shop_attemptGid:{shop,attemptGid:expected.attemptGid}}});
  if(!previous||previous.snapshot!==snapshot||previous.snapshotHash!==snapshotHash)throw Error('Renewal attempt or order is already bound differently');
  readRenewal(previous,purchase);return previous;
 }
}

export async function processPrepaidRenewalEvidence(admin:Admin,shop:string,evidenceId:string){
 const customer=assertPrepaidRenewalEvidenceScope(shop);assertPrepaidEvidenceId(evidenceId);
 const row=await db.prepaidRenewalEvidence.findFirst({where:{id:evidenceId,shop,customerGid:customer}});
 if(!row)throw Error('Registered renewal unavailable');
 const purchase=await db.prepaidPurchaseEvidence.findFirst({where:{id:row.purchaseEvidenceId,shop,customerGid:customer}});
 if(!purchase)throw Error('Purchased renewal context unavailable');
 const saved=readRenewal(row,purchase);
 // Re-read success/payment before routing, so a refund/dispute or a changed
 // native identity cannot make a stale verified registration a new entitlement.
 if(saved.correction)await inspectCorrectedPrepaidRenewal(admin,shop,row.contractGid,saved.expected,saved.correction);else await inspectPrepaidRenewal(admin,shop,row.contractGid,saved.expected);
 await recordOrder(shop,row.renewalOrderGid,`registered-renewal:${row.attemptGid}`,admin as Parameters<typeof recordOrder>[3],'CORE_REGISTERED_RENEWAL');
 await linkVerifiedPrepaidRenewal(admin,shop,row.contractGid,saved.expected,saved.correction??undefined);
 if(row.state!=='COMPLETED')await db.prepaidRenewalEvidence.updateMany({where:{id:row.id,shop,snapshotHash:row.snapshotHash,state:'PENDING_LINK'},data:{state:'COMPLETED',completedAt:new Date()}});
 const final=await db.prepaidRenewalEvidence.findUnique({where:{id:row.id}});
 if(final?.state!=='COMPLETED'||final.snapshotHash!==row.snapshotHash||!final.completedAt)throw Error('Renewal completion requires recovery');
 return {evidenceId:row.id,orderGid:row.renewalOrderGid,linked:true as const,replayed:row.state==='COMPLETED'};
}

// Callable by a future durable worker. Bounded scanning, not a timer in a web
// request. Failed proof stays pending for review/retry; no charge is ever retried.
export async function processPrepaidRenewalEvidenceBatch(admin:Admin,shop:string,options:{limit?:number;after?:string}={}){
 const customer=assertPrepaidRenewalEvidenceScope(shop),limit=options.limit??10;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw Error('Invalid renewal batch bound');
 if(options.after!==undefined)assertPrepaidEvidenceId(options.after);
 const cursor=options.after?await db.prepaidRenewalEvidence.findFirst({where:{id:options.after,shop,customerGid:customer}}):null;
 if(options.after&&!cursor)throw Error('Invalid renewal batch cursor');
 const rows=await db.prepaidRenewalEvidence.findMany({where:{shop,customerGid:customer,state:'PENDING_LINK',...(cursor?{OR:[{createdAt:{gt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{gt:cursor.id}}]}:{})},orderBy:[{createdAt:'asc'},{id:'asc'}],take:limit+1});
 const results=[];
 for(const row of rows.slice(0,limit)){
  try{await processPrepaidRenewalEvidence(admin,shop,row.id);results.push({evidenceId:row.id,state:'COMPLETED'});}catch{results.push({evidenceId:row.id,state:'HELD'});}
 }
 return {results,hasMore:rows.length>limit,nextCursor:rows.length>limit?results.at(-1)?.evidenceId:null};
}
