import {createHash} from 'node:crypto';
import type {Prisma,OperationalLine} from '@prisma/client';

type Tx=Prisma.TransactionClient;
type Line=Pick<OperationalLine,'shop'|'customerGid'|'contractGid'|'orderGid'|'orderLineGid'|'productGid'|'variantGid'>;
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
// Internal paid evidence reader. No billing, remote mutation or entitlement is
// invented from a contract's current catalogue/price. Renewals must already have
// their verified paid order linked and immutable evidence marked COMPLETED.
export async function readReadyDeliveryEntitlement(tx:Tx,shop:string,customerGid:string,line:Line){
 if(line.shop!==shop||line.customerGid!==customerGid||!line.contractGid)throw Error('Immutable paid entitlement required');
 const initial=await tx.prepaidPurchaseEvidence.findUnique({where:{shop_originalLineGid:{shop,originalLineGid:line.orderLineGid}}});
 const readPurchase=(paid:NonNullable<typeof initial>)=>{
  if(paid.shop!==shop||paid.customerGid!==customerGid||paid.contractGid!==line.contractGid||digest(paid.snapshot)!==paid.snapshotHash)throw Error('Immutable paid entitlement required');
  const p=JSON.parse(paid.snapshot),e=p.expected;
  if(p.version!==1||p.contractGid!==paid.contractGid||!e||e.customerGid!==customerGid||e.orderGid!==paid.originalOrderGid||e.orderLineGid!==paid.originalLineGid||e.productGid!==line.productGid||e.variantGid!==line.variantGid||![3,6].includes(e.months)||!Number.isSafeInteger(e.packageQuantity??1)||(e.packageQuantity??1)<1||(e.packageQuantity??1)*e.months>2147483647)throw Error('Visit exceeds its purchased entitlement');
  return p;
 };
 if(initial){
  const p=readPurchase(initial);if(initial.originalOrderGid!==line.orderGid)throw Error('Paid order identity differs');
  return {months:p.expected.months as 3|6,packages:(p.expected.packageQuantity??1) as number,purchaseEvidenceId:initial.id,renewalEvidenceId:null};
 }
 const candidates=await tx.prepaidRenewalEvidence.findMany({where:{shop,customerGid,contractGid:line.contractGid,renewalOrderGid:line.orderGid},take:251});
 if(candidates.length>250)throw Error('Renewal entitlement requires reconciliation');
 const matching=[];
 for(const row of candidates){
  if(digest(row.snapshot)!==row.snapshotHash)throw Error('Immutable paid entitlement checksum differs');
  const r=JSON.parse(row.snapshot);
  if(r.expected?.renewalOrderLineGid===line.orderLineGid)matching.push({row,r});
 }
 if(matching.length!==1)throw Error('Immutable paid renewal entitlement required');
 const {row,r}=matching[0];
 if(row.state!=='COMPLETED'||!row.completedAt||r.version!==1||r.expected.attemptGid!==row.attemptGid||r.expected.renewalOrderGid!==row.renewalOrderGid)throw Error('Verified paid renewal linkage required');
 const paid=await tx.prepaidPurchaseEvidence.findFirst({where:{id:row.purchaseEvidenceId,shop,customerGid,contractGid:line.contractGid}});
 if(!paid||r.purchaseHash!==paid.snapshotHash)throw Error('Renewal purchase evidence differs');
 const p=readPurchase(paid);
 if(!Object.entries(p.expected).every(([k,v])=>JSON.stringify(r.expected[k])===JSON.stringify(v)))throw Error('Renewal changed the original paid entitlement');
 return {months:p.expected.months as 3|6,packages:(p.expected.packageQuantity??1) as number,purchaseEvidenceId:paid.id,renewalEvidenceId:row.id};
}
