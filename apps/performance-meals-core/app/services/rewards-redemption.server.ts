import db from '../db.server';
import {assertShop} from './security.server';
import {rewardRedemptionMinor,validateRewardRules} from './rewards-policy';
import {recordSettledWalletCredit} from './wallet.server';
import type {CreditContext} from './native-wallet-credit-ready.server';
type Receipt={id:string;ownerGid:string;currency:string;amountMinor:number};
type Gateway={assertWalletReady:(customerGid:string,context?:CreditContext)=>Promise<void>;credit:(customerGid:string,amountMinor:number)=>Promise<Receipt>};

// Points are deducted atomically before native credit. A lost native response
// holds the operation for reconciliation; it must NEVER blindly credit again.
export async function redeemRewards(shop:string,customerGid:string,requestKey:string,points:number,gateway:Gateway){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^[-a-zA-Z0-9]{16,80}$/.test(requestKey))throw Error('Invalid redemption context');
 const amountMinor=rewardRedemptionMinor(points);
 const key={shop_customerGid_requestKey:{shop,customerGid,requestKey}};
 const previous=await db.rewardRedemption.findUnique({where:key});
 if(!previous){
  const policy=await db.commercePolicy.findUnique({where:{shop},select:{rewardsEnabled:true}});
  if(!policy?.rewardsEnabled)throw Error('Rewards redemption is not activated');
 }
 if(!previous||previous.state==='PREPARED')await gateway.assertWalletReady(customerGid,{rewardRedemptionId:previous?.id});
 let operation=await db.$transaction(async tx=>{
  const existing=await tx.rewardRedemption.findUnique({where:key});
  if(existing){if(existing.points!==points||existing.amountMinor!==amountMinor)throw Error('Redemption request conflict');return existing;}
  // walletEnabled gates the legacy custom reservation path, not native
  // Shopify Store Credit. Redemption requires its own approved Rewards gate.
  const policy=await tx.commercePolicy.findUnique({where:{shop}});
  if(!policy?.rewardsEnabled||!policy.rewardsRules)throw Error('Rewards redemption is not activated');
  const rules=validateRewardRules(JSON.parse(policy.rewardsRules));
  if(rules.qaCustomerGid&&rules.qaCustomerGid!==customerGid)throw Error('Rewards outside approved QA scope');
  const account=await tx.rewardsAccount.findUnique({where:{shop_customerGid:{shop,customerGid}}});
  const ledger=await tx.rewardsEntry.aggregate({where:{shop,customerGid},_sum:{pointsDelta:true}});
  if(!account||account.points!==(ledger._sum.pointsDelta||0)||account.points<points)throw Error('Insufficient reconciled Rewards');
  const created=await tx.rewardRedemption.create({data:{shop,customerGid,requestKey,rulesVersion:rules.version,points,amountMinor}});
  const changed=await tx.rewardsAccount.updateMany({where:{id:account.id,revision:account.revision,points:{gte:points}},data:{points:{decrement:points},revision:{increment:1}}});
  if(changed.count!==1)throw Error('Rewards changed; retry');
  await tx.rewardsEntry.create({data:{shop,customerGid,sourceEvent:'rewards-redeemed:'+created.id,rulesVersion:rules.version,kind:'redeemed',pointsDelta:-points}});
  return created;
 });
 if(operation.state==='COMPLETED')return operation;
 if(['CREDIT_PENDING','RECONCILIATION_REQUIRED'].includes(operation.state))throw Error('Redemption requires reconciliation; no automatic credit retry');
 if(operation.state==='PREPARED'){
  const changed=await db.rewardRedemption.updateMany({where:{id:operation.id,state:'PREPARED'},data:{state:'CREDIT_PENDING'}});
  if(changed.count!==1)throw Error('Redemption changed; reload');
  try{
   const receipt=await gateway.credit(customerGid,amountMinor);
   if(!/^gid:\/\/shopify\/StoreCreditAccountCreditTransaction\/\d+$/.test(receipt.id)||receipt.ownerGid!==customerGid||receipt.currency!=='SGD'||receipt.amountMinor!==amountMinor)throw Error('Native redemption credit differs');
   operation=await db.rewardRedemption.update({where:{id:operation.id},data:{state:'AWAITING_LEDGER',nativeTransactionGid:receipt.id}});
  }catch{
   await db.rewardRedemption.updateMany({where:{id:operation.id,state:'CREDIT_PENDING'},data:{state:'RECONCILIATION_REQUIRED'}});
   throw Error('Redemption requires reconciliation; no automatic credit retry');
  }
 }
 if(operation.state!=='AWAITING_LEDGER'||!operation.nativeTransactionGid)throw Error('Native redemption receipt missing');
 const entry=await recordSettledWalletCredit({shop,customerGid,currency:'SGD',sourceKind:'reward_funded',sourceEvent:'rewards-redemption:'+operation.id,sourceGid:operation.id,amountMinor,nativeTransactionGid:operation.nativeTransactionGid});
 return db.rewardRedemption.update({where:{id:operation.id},data:{state:'COMPLETED',ledgerEntryId:entry.id}});
}
