import db from '../db.server';
import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {PREPAID_PURCHASE_INTAKE_QUERY} from './prepaid-purchase-intake.server';
import {readRegisteredPrepaidPurchase} from './prepaid-renewal-evidence.server';
import {planReadyRenewalNotices,planReadyRenewalCatchUp} from './ready-renewal-notice';
import {bookingHash} from './ready-booking-native.server';
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
const KIND='READY_RENEWAL_NOTICE';
export const READY_RENEWAL_NOTICE_QUERY=PREPAID_PURCHASE_INTAKE_QUERY.replace('query PrepaidPurchaseIntake','query ReadyRenewalNoticeSchedule').replace('myshopifyDomain currencyCode plan','myshopifyDomain currencyCode taxesIncluded plan').replace('id status currencyCode app','id status nextBillingDate billingPolicy { interval intervalCount minCycles maxCycles } currencyCode app');
function scope(shop:string,customerGid:string,contractGid:string){
 assertShop(shop);const ids=(process.env.CORE_READY_RENEWAL_NOTICE_QA_CONTRACTS??'').split(',').filter(Boolean);
 if(process.env.NODE_ENV==='production'||process.env.CORE_READY_RENEWAL_NOTICES_ENABLED!=='true'||customerGid!==process.env.CORE_READY_BOOKING_QA_CUSTOMER||!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(contractGid)||!ids.includes(contractGid))throw Error('Isolated renewal notices are not activated');
}
// Only native reads: no billing attempt, contract change, payment or message.
export async function readReadyRenewalNoticeSchedule(admin:Admin,shop:string,customerGid:string,contractGid:string,options:{now?:Date}={}){
 scope(shop,customerGid,contractGid);const now=options.now??new Date();if(!Number.isFinite(now.getTime()))throw Error('Verified renewal notice time required');
 const r=await admin.graphql(READY_RENEWAL_NOTICE_QUERY,{variables:{id:contractGid}}),b=await r.json(),d=b.data,c=d?.subscriptionContract;
 if(!r.ok||b.errors||d?.shop?.myshopifyDomain!==shop||d.shop.currencyCode!=='SGD'||d.shop.plan?.partnerDevelopment!==true||c?.id!==contractGid||c.customer?.id!==customerGid||c.app?.id!==d.currentAppInstallation?.app?.id||!/^gid:\/\/shopify\/App\/\d+$/.test(c.app?.id??'')||!['ACTIVE','PAUSED','CANCELLED'].includes(c.status))throw Error('Owned native renewal schedule unavailable');
 if(c.status!=='ACTIVE')return {state:'INACTIVE' as const,contractGid,plans:[]};
 if(d.shop.taxesIncluded!==true||c.currencyCode!=='SGD'||c.deliveryPrice?.currencyCode!=='SGD'||minorAmount(c.deliveryPrice.amount)!==0||c.billingPolicy?.interval!=='MONTH'||![3,6].includes(c.billingPolicy.intervalCount)||c.billingPolicy.minCycles!==1||c.billingPolicy.maxCycles!==null||!Array.isArray(c.lines?.nodes)||!c.lines.nodes.length||c.lines.nodes.length>100||c.lines.pageInfo?.hasNextPage!==false||!Array.isArray(c.discounts?.nodes)||c.discounts.nodes.length>100||c.discounts.pageInfo?.hasNextPage!==false)throw Error('Complete renewing prepaid price required');
 const plans=planReadyRenewalNotices(contractGid,c.nextBillingDate),nextBillingAt=plans[0].nextBillingAt;
 if(Date.parse(nextBillingAt)<now.getTime())throw Error('Past-due renewal requires reconciliation before new reminders');
 const purchases=await db.prepaidPurchaseEvidence.findMany({where:{shop,customerGid,contractGid},take:101});
 if(!purchases.length||purchases.length>100||purchases.length!==c.lines.nodes.length||new Set(c.lines.nodes.map((l:{id:string})=>l.id)).size!==c.lines.nodes.length)throw Error('Original paid package coverage differs');
 const consumed=new Set<unknown>(),mapped=new Set<string>();let totalMinor=0;const paid=[];
 for(const purchase of purchases){
  const p=readRegisteredPrepaidPurchase(purchase),e=p.expected,correction=p.correction;
  if(purchase.originalOrderGid!==c.originOrder?.id||e.appGid!==c.app.id||e.months!==c.billingPolicy.intervalCount||!Number.isSafeInteger(e.upfrontMinor)||e.upfrontMinor<1)throw Error('Original renewal price binding differs');
  const matches=c.lines.nodes.filter((l:{productId:string;variantId:string;sellingPlanId:string})=>l.productId===e.productGid&&l.variantId===e.variantGid&&l.sellingPlanId===e.sellingPlanGid),line=matches[0],quantity=e.packageQuantity??1;
  if(matches.length!==1||mapped.has(line.id)||!Number.isSafeInteger(quantity)||quantity<1||line.quantity!==quantity||line.currentPrice?.currencyCode!=='SGD'||minorAmount(line.currentPrice.amount)*quantity!==(correction?.baseMinor??e.upfrontMinor))throw Error('Native recurring package amount changed');mapped.add(line.id);
  if(correction){
   const matches=c.discounts.nodes.filter((v:{title:string})=>v.title===correction.title),v=matches[0],target=v?.entitledLines;
   if(matches.length!==1||consumed.has(v)||v.type!==(correction.applicationKind==='AUTOMATIC'?'AUTOMATIC_DISCOUNT':'MANUAL')||v.targetType!=='LINE_ITEM'||v.recurringCycleLimit!==null||v.rejectionReason!==null||v.value?.__typename!=='SubscriptionDiscountFixedAmountValue'||typeof v.value.appliesOnEachItem!=='boolean'||v.value.amount?.currencyCode!=='SGD'||minorAmount(v.value.amount.amount)*(v.value.appliesOnEachItem?quantity:1)!==correction.discountMinor||correction.baseMinor-correction.discountMinor!==e.upfrontMinor||!target||(target.all?c.lines.nodes.length!==1:target.all!==false||target.lines?.pageInfo?.hasNextPage!==false||target.lines.nodes?.length!==1||target.lines.nodes[0].id!==line.id))throw Error('Recurring price correction changed');consumed.add(v);
  }
  totalMinor+=e.upfrontMinor;if(!Number.isSafeInteger(totalMinor)||totalMinor>2147483647)throw Error('Renewal amount exceeds supported bound');paid.push({id:purchase.id,hash:purchase.snapshotHash});
 }
 if(consumed.size!==c.discounts.nodes.length)throw Error('Unexpected renewal discount');
 return {state:'READY' as const,contractGid,customerGid,nextBillingAt,months:c.billingPolicy.intervalCount as 3|6,totalMinor,purchases:paid.sort((a,b)=>a.id.localeCompare(b.id)),plans};
}
// Durable preparation only. No worker, timer or sender consumes these DRAFTs.
// Sending must freshly reverify ACTIVE status/date/amount and resolve a verified
// recipient. Missed stages coalesce into one catch-up per channel; uncertain
// sends hold recovery so a provider timeout cannot generate a second message.
export async function stageReadyRenewalNotices(admin:Admin,shop:string,customerGid:string,contractGid:string,options:{now?:Date}={}){
 const now=options.now??new Date();
 const schedule=await readReadyRenewalNoticeSchedule(admin,shop,customerGid,contractGid,{now});
 const fresh=await readReadyRenewalNoticeSchedule(admin,shop,customerGid,contractGid,{now});
 if(bookingHash(schedule)!==bookingHash(fresh))throw Error('Renewal schedule changed during preparation');
 return db.$transaction(async tx=>{
  const rows=await tx.planOperation.findMany({where:{shop,selectionId:'customer:'+customerGid.split('/').at(-1),kind:KIND,cycleReference:contractGid},take:1001});if(rows.length>1000)throw Error('Renewal reminder history requires reconciliation');
  const completed=new Set<string>();
  if(schedule.state==='READY')for(const row of rows){
   if(!row.productionReference)throw Error('Renewal reminder history is incomplete');const saved=JSON.parse(row.productionReference);
   if(saved.plan?.nextBillingAt!==schedule.nextBillingAt)continue;
   if(['DELIVERING','UNKNOWN'].includes(row.state))return {state:'HELD' as const,created:0};
   if(row.state==='SENT'){
    if(saved.scheduleHash!==bookingHash(schedule)||saved.customerGid!==customerGid||saved.contractGid!==contractGid||!['email','whatsapp'].includes(saved.plan.channel))throw Error('Sent renewal reminder differs');
    if(typeof saved.receipt?.reference!=='string'||!/^[-a-zA-Z0-9:_.]{1,200}$/.test(saved.receipt.reference)||typeof saved.receipt.acceptedAt!=='string'||!Number.isFinite(Date.parse(saved.receipt.acceptedAt))||Date.parse(saved.receipt.acceptedAt)<Date.parse(saved.plan.scheduledAt)||Date.parse(saved.receipt.acceptedAt)>now.getTime())throw Error('Verified reminder receipt required before skipping a stage');
    const stages=saved.plan.coversStages??[saved.plan.stage];if(!Array.isArray(stages)||!stages.length||stages.length>5||new Set(stages).size!==stages.length)throw Error('Sent reminder coverage differs');
    for(const stage of stages){const plan=schedule.plans.find(p=>p.channel===saved.plan.channel&&p.stage===stage);if(!plan)throw Error('Sent reminder stage differs');completed.add(plan.idempotencyKey);}
   }
  }
  const plans=schedule.state==='READY'?planReadyRenewalCatchUp(contractGid,schedule.nextBillingAt,now.toISOString(),[...completed]):[];
  const ids=plans.map(p=>'renewal-notice:'+bookingHash([shop,p.idempotencyKey]));
  for(const row of rows.filter(r=>r.state==='DRAFT'&&!ids.includes(r.id)))await tx.planOperation.updateMany({where:{id:row.id,shop,state:'DRAFT',productionReference:row.productionReference},data:{state:'SUPERSEDED'}});
  if(schedule.state!=='READY')return {state:'INACTIVE' as const,created:0};
  let created=0;
  for(const proposed of plans){const id='renewal-notice:'+bookingHash([shop,proposed.idempotencyKey]),old=await tx.planOperation.findUnique({where:{id}});let plan=proposed;
   if(old&&proposed.kind==='IMMEDIATE'){const previous=JSON.parse(old.productionReference??'null');const at=previous?.plan?.scheduledAt;if(typeof at!=='string'||!Number.isFinite(Date.parse(at))||Date.parse(at)>now.getTime())throw Error('Original catch-up time differs');plan={...proposed,scheduledAt:at};}
   const reference=JSON.stringify({version:1,contractGid,customerGid,scheduleHash:bookingHash(schedule),plan,amountMinor:schedule.totalMinor,months:schedule.months});if(old){if(old.shop!==shop||old.kind!==KIND||old.cycleReference!==contractGid||old.productionReference!==reference||!['DRAFT','SENT','DELIVERING','UNKNOWN'].includes(old.state))throw Error('Existing renewal reminder differs');continue;}await tx.planOperation.create({data:{id,shop,selectionId:'customer:'+customerGid.split('/').at(-1),kind:KIND,state:'DRAFT',cycleReference:contractGid,productionReference:reference}});created++;}
  return {state:'PREPARED' as const,created,nextBillingAt:schedule.nextBillingAt};
 },{timeout:30000});
}

type RenewalMessage={customerGid:string;channel:'email'|'whatsapp';idempotencyKey:string;content:ReturnType<typeof import('./ready-renewal-notice').readyRenewalNotice>};
export type ReadyRenewalMessageGateway={send:(message:RenewalMessage)=>Promise<{reference:string}>};
// Explicit internal invocation only. A queued date is never authority to send:
// status, owner, cycle date, price and persistent corrections are read again.
export async function sendReadyRenewalNotice(admin:Admin,shop:string,customerGid:string,id:string,gateway:ReadyRenewalMessageGateway,options:{now?:Date}={}){
 if(typeof id!=='string'||!/^renewal-notice:[a-f0-9]{64}$/.test(id))throw Error('Exact saved renewal notice required');
 const row=await db.planOperation.findFirstOrThrow({where:{id,shop,selectionId:'customer:'+customerGid.split('/').at(-1),kind:KIND}}),p=JSON.parse(row.productionReference??'null');
 if(p?.version!==1||p.customerGid!==customerGid||p.contractGid!==row.cycleReference)throw Error('Owned reminder binding differs');scope(shop,customerGid,p.contractGid);
 if(!['email','whatsapp'].includes(p.plan?.channel)||typeof p.plan.idempotencyKey!=='string'||'renewal-notice:'+bookingHash([shop,p.plan.idempotencyKey])!==id)throw Error('Renewal message identity differs');
 const now=options.now??new Date();if(!Number.isFinite(now.getTime()))throw Error('Verified message time required');
 if(['SENT','UNKNOWN','DELIVERING'].includes(row.state))return {state:row.state,reference:p.receipt?.reference??null,replayed:true};
 if(row.state!=='DRAFT'||typeof p.plan.scheduledAt!=='string'||!Number.isFinite(Date.parse(p.plan.scheduledAt))||Date.parse(p.plan.scheduledAt)>now.getTime())throw Error('Current due renewal message required');
 const verify=async()=>{
  const schedule=await readReadyRenewalNoticeSchedule(admin,shop,customerGid,p.contractGid,{now});
  if(schedule.state!=='READY'||p.scheduleHash!==bookingHash(schedule)||p.plan.nextBillingAt!==schedule.nextBillingAt||p.amountMinor!==schedule.totalMinor||p.months!==schedule.months)throw Error('Current native renewal schedule changed');
  const {readyRenewalNotice}=await import('./ready-renewal-notice');
  const accountShopId=process.env.CORE_ACCOUNT_SHOP_ID??'',accountUrl=process.env.CORE_CUSTOMER_ACCOUNT_URL??'';
  return readyRenewalNotice({contractGid:p.contractGid,nextBillingAt:schedule.nextBillingAt,stage:p.plan.stage,coversStages:p.plan.coversStages,months:schedule.months,packageName:'Ready Series prepaid package',amountMinor:schedule.totalMinor,accountUrl,accountShopId,shopDomain:shop});
 };
 await verify();
 const claimed=await db.planOperation.updateMany({where:{id,shop,state:'DRAFT',productionReference:row.productionReference},data:{state:'DELIVERING'}});
 if(claimed.count!==1)return {state:'HELD',reference:null,replayed:true};
 let attempted=false,reference:string|null=null;
 try{
  const content=await verify();
  const current=await db.planOperation.findUniqueOrThrow({where:{id}});if(current.state!=='DELIVERING'||current.productionReference!==row.productionReference)throw Error('Notice changed before sending');
  attempted=true;const receipt=await gateway.send({customerGid,channel:p.plan.channel,idempotencyKey:bookingHash([shop,p.plan.idempotencyKey]),content});
  if(typeof receipt?.reference!=='string'||!/^[-a-zA-Z0-9:_.]{1,200}$/.test(receipt.reference))throw Error('Renewal provider acceptance unconfirmed');reference=receipt.reference;
  const changed=await db.planOperation.updateMany({where:{id,shop,state:'DELIVERING',productionReference:row.productionReference},data:{state:'SENT',productionReference:JSON.stringify({...p,receipt:{reference,acceptedAt:now.toISOString()}})}});if(changed.count!==1)throw Error('Renewal receipt commit unconfirmed');
  return {state:'SENT',reference,replayed:false};
 }catch{
  const final=await db.planOperation.findUniqueOrThrow({where:{id}});
  if(final.state==='DELIVERING')await db.planOperation.updateMany({where:{id,shop,state:'DELIVERING',productionReference:row.productionReference},data:{state:attempted?'UNKNOWN':'SUPERSEDED',productionReference:JSON.stringify({...p,...(reference?{receipt:{reference,acceptedAt:now.toISOString()}}:{})})}});
  return {state:final.state==='SENT'?'SENT':attempted?'UNKNOWN':'SUPERSEDED',reference,replayed:false};
 }
}
