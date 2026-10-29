import {createHash} from 'node:crypto';
import db from '../db.server';
import {minorAmount} from './gift-card-native.server';
import {prepaidExactPriceCorrectionCandidate,type PrepaidPlanSpec} from './prepaid-selling-plan';
import {prepaidPackageQuantity} from './prepaid-package-quantity';
import {PREPAID_CORRECTED_PAYMENT_QUERY,readPrepaidPayment,readCorrectedPrepaidPayment,type PrepaidPriceCorrection} from './prepaid-payment.server';
import {assertPrepaidEvidenceId,assertPrepaidRenewalEvidenceScope,registerPrepaidPurchaseEvidence} from './prepaid-renewal-evidence.server';
import {linkSubscriptionOrigin} from './subscription-links.server';
import {recordOrder} from './orders.server';
import {inspectPrepaidContract} from './prepaid-verification.server';

type Admin=Parameters<typeof registerPrepaidPurchaseEvidence>[0];
type Approval=PrepaidPlanSpec&{appGid:string;sellingPlanGid:string;correctionTitle:string|null;correctionApplication?:'PER_PACKAGE'};
type SavedApproval={version:1;customerGid:string;spec:Approval};
type ApprovalRow=NonNullable<Awaited<ReturnType<typeof db.prepaidPricingApproval.findUnique>>>;
const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
const ref=(kind:string,v:unknown):v is string=>typeof v==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(v);
export function assertPrepaidPurchaseIntakeScope(shop:string){
 const customer=assertPrepaidRenewalEvidenceScope(shop);
 if(process.env.CORE_PREPAID_PURCHASE_INTAKE_ENABLED!=='true')throw Error('Prepaid purchase intake is not activated');
 return customer;
}
function canonical(spec:Approval):Approval{
 const c=prepaidExactPriceCorrectionCandidate(spec);
 if(!ref('App',spec.appGid)||!ref('SellingPlan',spec.sellingPlanGid)||spec.correctionApplication!==undefined&&spec.correctionApplication!=='PER_PACKAGE'||c.discountPerPackageMinor>0&&(typeof spec.correctionTitle!=='string'||!spec.correctionTitle.trim()||spec.correctionTitle.length>255)||c.discountPerPackageMinor===0&&(spec.correctionTitle!==null||spec.correctionApplication!==undefined))throw Error('Explicit approved price correction required');
 return {productGid:spec.productGid,variantGid:spec.variantGid,months:spec.months,upfrontMinor:spec.upfrontMinor,appGid:spec.appGid,sellingPlanGid:spec.sellingPlanGid,correctionTitle:spec.correctionTitle,...(spec.correctionApplication?{correctionApplication:spec.correctionApplication}:{})};
}
function approval(row:ApprovalRow):SavedApproval{
 if(digest(row.snapshot)!==row.snapshotHash)throw Error('Pricing approval checksum differs');
 const saved=JSON.parse(row.snapshot) as SavedApproval;
 if(saved.version!==1||saved.customerGid!==row.customerGid||saved.spec.variantGid!==row.variantGid||saved.spec.sellingPlanGid!==row.sellingPlanGid||JSON.stringify(canonical(saved.spec))!==JSON.stringify(saved.spec))throw Error('Pricing approval identity differs');
 return saved;
}

// Internal service only. A caller must explicitly supply approved economics;
// no notification, current catalogue or client request can author this policy.
// Reusing a native plan/variant with different economics fails instead of
// silently rewriting the basis of an already-paid customer's purchase.
export async function registerPrepaidPricingApproval(shop:string,spec:Approval){
 const customer=assertPrepaidPurchaseIntakeScope(shop),s=canonical(spec),snapshot=JSON.stringify({version:1,customerGid:customer,spec:s} satisfies SavedApproval);
 try{return await db.prepaidPricingApproval.create({data:{shop,customerGid:customer,variantGid:s.variantGid,sellingPlanGid:s.sellingPlanGid,snapshot,snapshotHash:digest(snapshot)}});}catch(error){
  if((error as {code?:string}).code!=='P2002')throw error;
  const row=await db.prepaidPricingApproval.findUnique({where:{shop_variantGid_sellingPlanGid:{shop,variantGid:s.variantGid,sellingPlanGid:s.sellingPlanGid}}});
  if(!row||row.snapshot!==snapshot)throw Error('Different economics already approved for this native plan');
  approval(row);return row;
 }
}

// Only the authenticated contract-create route calls this entry point. Intake
// is intentionally independent of webhook/order arrival order and API latency.
export async function receivePrepaidPurchaseTrigger(shop:string,contractGid:string,eventId:string){
 const customer=assertPrepaidPurchaseIntakeScope(shop);
 if(!ref('SubscriptionContract',contractGid)||typeof eventId!=='string'||!/^[-a-zA-Z0-9_:]{1,200}$/.test(eventId))throw Error('Invalid purchase trigger identity');
 const receiptId=`${shop}:prepaid-purchase:${eventId}`,topic=`CORE_PREPAID_PURCHASE:${contractGid}`;
 const persist=()=>db.$transaction(async tx=>{
  const previous=await tx.prepaidPurchaseInbox.findUnique({where:{shop_contractGid:{shop,contractGid}}}),receipt=await tx.webhookReceipt.findUnique({where:{id:receiptId}});
  if(previous&&previous.customerGid!==customer||receipt&&(receipt.shop!==shop||receipt.topic!==topic||!previous))throw Error('Purchase trigger identity conflict');
  const row=previous??await tx.prepaidPurchaseInbox.create({data:{shop,customerGid:customer,contractGid}});
  if(!receipt)await tx.webhookReceipt.create({data:{id:receiptId,shop,topic}});
  return {inboxId:row.id,replayed:!!previous};
 });
 try{return await persist();}catch(error){if((error as {code?:string}).code!=='P2002')throw error;return persist();}
}

export const PREPAID_PURCHASE_INTAKE_QUERY=`#graphql
query PrepaidPurchaseIntake($id: ID!) {
 shop { myshopifyDomain currencyCode plan { partnerDevelopment } }
 currentAppInstallation { app { id } }
 subscriptionContract(id: $id) {
  id status currencyCode app { id } customer { id } originOrder { id }
  deliveryPrice { amount currencyCode }
  lines(first: 100) { nodes { id productId variantId sellingPlanId quantity currentPrice { amount currencyCode } } pageInfo { hasNextPage } }
  discounts(first: 100) { nodes {
   id title recurringCycleLimit rejectionReason targetType type
   value { __typename ... on SubscriptionDiscountFixedAmountValue { amount { amount currencyCode } appliesOnEachItem } }
   entitledLines { all lines(first: 100) { nodes { id } pageInfo { hasNextPage } } }
  } pageInfo { hasNextPage } }
 }
}
`;

type NativeLine={id:string;productId:string;variantId:string;sellingPlanId:string;quantity:number;currentPrice:{amount:string;currencyCode:string}};
type NativeDiscount={title:string;type:string;targetType:string;recurringCycleLimit:number|null;rejectionReason:string|null;value:{__typename:string;amount:{amount:string;currencyCode:string};appliesOnEachItem:boolean};entitledLines:{all:boolean;lines:{nodes:{id:string}[];pageInfo:{hasNextPage:boolean}}}};
// Read-only verification shared by recovery preview and durable intake. It
// cannot enqueue, link, issue credit or change any Shopify record.
export async function inspectRecoverablePrepaidPurchase(admin:Admin,shop:string,contractGid:string){
 const customer=assertPrepaidPurchaseIntakeScope(shop);
 if(!ref('SubscriptionContract',contractGid))throw Error('Exact native contract required');
 const response=await admin.graphql(PREPAID_PURCHASE_INTAKE_QUERY,{variables:{id:contractGid}}),body=await response.json(),d=body.data,c=d?.subscriptionContract;
 if(!response.ok||body.errors||d?.shop?.myshopifyDomain!==shop||d.shop.currencyCode!=='SGD'||d.shop.plan?.partnerDevelopment!==true||c?.id!==contractGid||!['ACTIVE','PAUSED','CANCELLED'].includes(c.status)||c.customer?.id!==customer||!ref('App',d.currentAppInstallation?.app?.id)||c.app?.id!==d.currentAppInstallation.app.id||c.currencyCode!=='SGD'||!ref('Order',c.originOrder?.id)||c.lines?.pageInfo?.hasNextPage!==false||c.discounts?.pageInfo?.hasNextPage!==false||!Array.isArray(c.lines.nodes)||!c.lines.nodes.length||!Array.isArray(c.discounts.nodes)||c.deliveryPrice?.currencyCode!=='SGD'||minorAmount(c.deliveryPrice.amount)!==0)throw Error('Complete native purchase contract unavailable');
 const lines=c.lines.nodes as NativeLine[],discounts=c.discounts.nodes as NativeDiscount[];
 if(new Set(lines.map(l=>l.id)).size!==lines.length)throw Error('Duplicate contract lines');
 const pr=await admin.graphql(PREPAID_CORRECTED_PAYMENT_QUERY,{variables:{id:c.originOrder.id}}),pb=await pr.json(),o=pb.data?.order;
 if(!pr.ok||pb.errors||pb.data?.shop?.myshopifyDomain!==shop||o?.id!==c.originOrder.id||o.customer?.id!==customer||o.lineItems?.pageInfo?.hasNextPage!==false||!Array.isArray(o.lineItems.nodes))throw Error('Original paid order unavailable');
 const plans=[],mapped=new Set<string>(),consumed=new Set<NativeDiscount>();
 for(const line of lines){
  if(!ref('Product',line.productId)||!ref('ProductVariant',line.variantId)||!ref('SellingPlan',line.sellingPlanId))throw Error('Incomplete contract product identity');
  const registered=await db.prepaidPricingApproval.findUnique({where:{shop_variantGid_sellingPlanGid:{shop,variantGid:line.variantId,sellingPlanGid:line.sellingPlanId}}});
  if(!registered||registered.customerGid!==customer)throw Error('Explicit approved pricing is missing');
  const spec=approval(registered).spec;
  if(spec.appGid!==c.app.id||spec.productGid!==line.productId)throw Error('Approved pricing ownership differs');
  const candidate=prepaidExactPriceCorrectionCandidate(spec,line.quantity),quantity=prepaidPackageQuantity(spec.months,line.quantity);
  if(line.currentPrice?.currencyCode!=='SGD'||minorAmount(line.currentPrice.amount)!==candidate.grossPerPackageMinor)throw Error('Native contract gross price differs');
  const originals=o.lineItems.nodes.filter((l:{product?:{id:string};variant?:{id:string};sellingPlan?:{sellingPlanId:string};quantity:number})=>l.product?.id===spec.productGid&&l.variant?.id===spec.variantGid&&l.sellingPlan?.sellingPlanId===spec.sellingPlanGid&&l.quantity===quantity.nativeOrderQuantity);
  if(originals.length!==1||!ref('LineItem',originals[0].id)||mapped.has(originals[0].id))throw Error('Original purchase line is ambiguous');mapped.add(originals[0].id);
  let correction:PrepaidPriceCorrection|undefined;
  if(candidate.totalCorrectionMinor){
   const matches=discounts.filter(discount=>discount.title===spec.correctionTitle);
   const discount=matches[0],targets=discount?.entitledLines;
   const perPackage=spec.correctionApplication==='PER_PACKAGE';
   if(matches.length!==1||consumed.has(discount)||discount.type!=='AUTOMATIC_DISCOUNT'||discount.targetType!=='LINE_ITEM'||discount.recurringCycleLimit!==null||discount.rejectionReason!==null||discount.value?.__typename!=='SubscriptionDiscountFixedAmountValue'||discount.value.appliesOnEachItem!==perPackage||discount.value.amount?.currencyCode!=='SGD'||minorAmount(discount.value.amount.amount)!==(perPackage?candidate.discountPerPackageMinor:candidate.totalCorrectionMinor)||!targets||(targets.all?lines.length!==1:targets.lines?.pageInfo?.hasNextPage!==false||targets.lines.nodes.length!==1||targets.lines.nodes[0].id!==line.id))throw Error('Persistent recurring correction differs');
   consumed.add(discount);
   if(o.totalTaxSet?.shopMoney?.currencyCode!=='SGD')throw Error('Original GST evidence unavailable');
   correction={baseMinor:candidate.grossTotalMinor,discountMinor:candidate.totalCorrectionMinor,applicationKind:'AUTOMATIC',title:spec.correctionTitle!,taxMinor:minorAmount(o.totalTaxSet.shopMoney.amount)};
  }
  const expected={months:spec.months,packageQuantity:line.quantity,paymentScope:o.lineItems.nodes.length===1?'ORDER' as const:'PREPAID_LINE' as const,appGid:spec.appGid,customerGid:customer,orderGid:o.id,orderLineGid:originals[0].id,productGid:spec.productGid,variantGid:spec.variantGid,sellingPlanGid:spec.sellingPlanGid,upfrontMinor:candidate.expectedTotalMinor};
  // Verify all money/ownership before creating or linking any operational row.
  if(correction)await readCorrectedPrepaidPayment(admin,shop,expected,correction);else await readPrepaidPayment(admin,shop,expected);
  const native=await inspectPrepaidContract(admin,shop,contractGid,expected);
  if(!native.billingConfigurationMatches||!native.deliveryPolicyMatches)throw Error('Approved prepaid policy differs');
  plans.push({expected,correction});
 }
 if(consumed.size!==discounts.length)throw Error('Unexpected native subscription discount');
 return {orderGid:o.id as string,plans};
}

export async function processPrepaidPurchaseTrigger(admin:Admin,shop:string,inboxId:string){
 const customer=assertPrepaidPurchaseIntakeScope(shop);assertPrepaidEvidenceId(inboxId);
 const row=await db.prepaidPurchaseInbox.findFirst({where:{id:inboxId,shop,customerGid:customer}});
 if(!row||!['PENDING_VERIFY','COMPLETED'].includes(row.state)||row.state==='COMPLETED'&&!row.completedAt)throw Error('Purchase inbox unavailable');
 const {orderGid,plans}=await inspectRecoverablePrepaidPurchase(admin,shop,row.contractGid);
 await recordOrder(shop,orderGid,`purchase-intake:${row.contractGid}`,admin as Parameters<typeof recordOrder>[3],'CORE_PREPAID_PURCHASE');
 await linkSubscriptionOrigin(admin,shop,row.contractGid);
 for(const plan of plans)await registerPrepaidPurchaseEvidence(admin,shop,row.contractGid,plan.expected,plan.correction);
 if(row.state!=='COMPLETED')await db.prepaidPurchaseInbox.updateMany({where:{id:row.id,shop,state:'PENDING_VERIFY'},data:{state:'COMPLETED',completedAt:new Date()}});
 const final=await db.prepaidPurchaseInbox.findUnique({where:{id:row.id}});
 if(final?.state!=='COMPLETED'||!final.completedAt)throw Error('Purchase intake completion requires recovery');
 return {inboxId:row.id,registeredLines:plans.length,replayed:row.state==='COMPLETED'};
}

export async function processPrepaidPurchaseTriggerBatch(admin:Admin,shop:string,options:{limit?:number;after?:string}={}){
 const customer=assertPrepaidPurchaseIntakeScope(shop),limit=options.limit??10;
 if(!Number.isSafeInteger(limit)||limit<1||limit>50)throw Error('Invalid purchase inbox bound');
 if(options.after!==undefined)assertPrepaidEvidenceId(options.after);
 const cursor=options.after?await db.prepaidPurchaseInbox.findFirst({where:{id:options.after,shop,customerGid:customer}}):null;
 if(options.after&&!cursor)throw Error('Invalid purchase inbox cursor');
 const rows=await db.prepaidPurchaseInbox.findMany({where:{shop,customerGid:customer,state:'PENDING_VERIFY',...(cursor?{OR:[{createdAt:{gt:cursor.createdAt}},{createdAt:cursor.createdAt,id:{gt:cursor.id}}]}:{})},orderBy:[{createdAt:'asc'},{id:'asc'}],take:limit+1});
 const results=[];
 for(const row of rows.slice(0,limit)){
  try{await processPrepaidPurchaseTrigger(admin,shop,row.id);results.push({inboxId:row.id,state:'COMPLETED'});}catch{results.push({inboxId:row.id,state:'HELD'});}
 }
 return {results,hasMore:rows.length>limit,nextCursor:rows.length>limit?results.at(-1)?.inboxId:null};
}
