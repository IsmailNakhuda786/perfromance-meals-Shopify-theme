// Complete operational recovery inventory. OAuth sessions are intentionally
// excluded: tokens must be reauthenticated rather than copied between hosts.
export const legacyModels=['mealPlanDraft','mealPlanSelection','operationalLine','webhookReceipt','planOperation','migrationMapping','customerWallet','walletEntry','walletReservation','commercePolicy','mealPlanMenuRevision'];
export const operationalModels=[...legacyModels,'orderCancellation','rewardsAccount','rewardsEntry','giftCardWalletClaim','walletTopUpSettlement','walletTopUpIntent','rewardRedemption','orderSupportRequest','rewardRuleVersion','rewardRuleActivation','walletCreditExpiry','giftCardExpiryReminder','readyDeliveryDraft','readyDeliveryReminder','readyDeliverySlot','readyDeliverySlotReservation','bundlePurchaseReview','coreWalletRedemptionDraft','subscriptionRenewalStop','prepaidPurchaseEvidence','prepaidRenewalEvidence','prepaidRenewalInbox','prepaidPricingApproval','prepaidPurchaseInbox'];
const json=v=>JSON.parse(JSON.stringify(v));
const validShop=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v);
export function snapshotFields(prismaModels){
 return Object.fromEntries(prismaModels.filter(m=>m.name!=='Session').map(m=>[m.name[0].toLowerCase()+m.name.slice(1),m.fields.filter(f=>f.kind!=='object').map(f=>f.name).sort()]));
}
export function validateSnapshot(snapshot,shop,fields){
 if(!validShop(shop)||!snapshot||![1,2,3].includes(snapshot.version)||snapshot.shop!==shop||!snapshot.records||typeof snapshot.records!=='object'||Array.isArray(snapshot.records))throw Error('Snapshot scope/model mismatch.');
 const expected=snapshot.version===1?legacyModels.filter(m=>m!=='mealPlanMenuRevision'):snapshot.version===2?legacyModels:operationalModels;
 if(Object.keys(snapshot.records).sort().join()!==[...expected].sort().join()||Object.keys(fields).sort().join()!==[...operationalModels].sort().join())throw Error('Snapshot scope/model mismatch.');
 const records={};
 for(const model of operationalModels){
  const rows=expected.includes(model)?snapshot.records[model]:[];
  if(!Array.isArray(rows))throw Error('Snapshot records must be arrays.');
  const seen=new Set();
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row)||row.shop!==shop)throw Error('Cross-store record rejected.');
   const keys=Object.keys(row).sort(),allowed=fields[model];
   if(keys.some(k=>!allowed.includes(k))||snapshot.version===3&&keys.join()!==allowed.join())throw Error('Snapshot record fields differ from the current schema.');
   const id=model==='commercePolicy'?row.shop:row.id;
   if(typeof id!=='string'||!id||seen.has(id))throw Error('Duplicate or missing snapshot identity.');seen.add(id);
  }
  records[model]=rows;
 }
 return records;
}
export async function exportOperationalSnapshot(tx,shop,fields){
 if(!validShop(shop))throw Error('Explicit store scope required.');
 const records={};
 for(const model of operationalModels)records[model]=await tx[model].findMany({where:{shop},orderBy:model==='commercePolicy'?{shop:'asc'}:{id:'asc'}});
 const snapshot=json({version:3,shop,records});validateSnapshot(snapshot,shop,fields);return snapshot;
}
export async function importOperationalSnapshot(tx,snapshot,shop,fields){
 const records=validateSnapshot(snapshot,shop,fields);
 for(const model of operationalModels)for(const record of records[model]){
  const where=model==='commercePolicy'?{shop}:{id:record.id};
  const existing=await tx[model].findUnique({where});
  if(existing){
   const normalized=json(existing);
   if(Object.keys(record).some(k=>JSON.stringify(normalized[k])!==JSON.stringify(record[k])))throw Error('Conflicting destination record; nothing overwritten.');
  }else await tx[model].create({data:record});
 }
}
