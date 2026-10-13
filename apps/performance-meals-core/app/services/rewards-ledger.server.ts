import db from '../db.server';
import {assertShop} from './security.server';
import {calculateRewardPoints,validateRewardRules,type RewardLine,type RewardRules} from './rewards-policy';

function customerContext(shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Invalid Rewards customer');
}
// Read-only, persistent balances. No prototype demo points or tier are returned.
export async function readRewardsLedger(shop:string,customerGid:string){
 customerContext(shop,customerGid);
 return db.$transaction(async tx=>{
  const where={shop,customerGid};
  const account=await tx.rewardsAccount.findUnique({where:{shop_customerGid:where}});
  const sum=await tx.rewardsEntry.aggregate({where,_sum:{pointsDelta:true}});
  const history=await tx.rewardsEntry.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],take:51,select:{id:true,kind:true,pointsDelta:true,createdAt:true}});
  return {points:account?.points||0,lifetimeEarned:account?.lifetimeEarned||0,balanceMatchesLedger:(account?.points||0)===(sum._sum.pointsDelta||0),history:history.slice(0,50),hasMore:history.length>50};
 });
}

// Internal accounting primitive only. The future delivery/rules verifier must
// provide the event and rules version. There is no public grant/redeem endpoint.
// Rule configuration alone is not proof of native delivery or discount settlement.
export async function recordVerifiedRewardEvent(input:{shop:string;customerGid:string;sourceEvent:string;orderGid:string;rulesVersion:string;kind:'earned'|'reversed';pointsDelta:number}){
 const {shop,customerGid,sourceEvent,orderGid,rulesVersion,kind,pointsDelta}=input;
 customerContext(shop,customerGid);
 if(!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid)||!sourceEvent||sourceEvent.length>200||!rulesVersion||!['earned','reversed'].includes(kind)||!Number.isSafeInteger(pointsDelta)||!pointsDelta||Math.abs(pointsDelta)>2147483647||(kind==='earned')!==(pointsDelta>0)||(kind==='earned'&&sourceEvent!=='rewards-earned:'+orderGid))throw Error('Invalid Rewards event');
 return db.$transaction(async tx=>{
  const policy=await tx.commercePolicy.findUnique({where:{shop}});
  if(!policy?.rewardsEnabled||!policy.rewardsRules)throw Error('Rewards rules are not activated');
  const rules=JSON.parse(policy.rewardsRules);
  if(rules.version!==rulesVersion||rules.merchantApproved!==true)throw Error('Rewards rules require approval');
  if(rules.qaOrderGid&&rules.qaOrderGid!==orderGid||rules.qaCustomerGid&&rules.qaCustomerGid!==customerGid)throw Error('Rewards event outside approved QA scope');
  const existing=await tx.rewardsEntry.findUnique({where:{shop_sourceEvent:{shop,sourceEvent}}});
  if(existing){if(existing.customerGid!==customerGid||existing.orderGid!==orderGid||existing.rulesVersion!==rulesVersion||existing.kind!==kind||existing.pointsDelta!==pointsDelta)throw Error('Rewards event conflict');return existing;}
  if(kind==='reversed'){
   const original=await tx.rewardsEntry.findFirst({where:{shop,customerGid,orderGid,kind:'earned',rulesVersion}});
   const sum=await tx.rewardsEntry.aggregate({where:{shop,customerGid,orderGid,kind:'reversed'},_sum:{pointsDelta:true}});
   if(!original||original.pointsDelta+(sum._sum.pointsDelta||0)+pointsDelta<0)throw Error('Rewards reversal exceeds original earning');
  }
  const account=await tx.rewardsAccount.upsert({where:{shop_customerGid:{shop,customerGid}},create:{shop,customerGid},update:{}});
  const points=account.points+pointsDelta,lifetime=account.lifetimeEarned+(kind==='earned'?pointsDelta:0);
  if(points<0||points>2147483647||lifetime>2147483647)throw Error('Rewards balance requires reconciliation');
  const changed=await tx.rewardsAccount.updateMany({where:{id:account.id,revision:account.revision},data:{points,lifetimeEarned:lifetime,revision:{increment:1}}});
  if(changed.count!==1)throw Error('Rewards changed; retry');
  return tx.rewardsEntry.create({data:input});
 });
}

// Internal configuration hook only; no merchant Admin UI is introduced.
export async function configureRewards(shop:string,rules:RewardRules){
 assertShop(shop);validateRewardRules(rules);
 return db.$transaction(async tx=>{
  const value=JSON.stringify(rules);
  const existing=await tx.rewardRuleVersion.findUnique({where:{shop_version:{shop,version:rules.version}}});
  if(existing&&existing.rules!==value)throw Error('Rewards version is immutable');
  if(!existing)await tx.rewardRuleVersion.create({data:{shop,version:rules.version,rules:value}});
  return tx.commercePolicy.upsert({where:{shop},create:{shop,rewardsRules:value},update:{rewardsRules:value}});
 });
}
// The native-order verifier must supply post-discount food values and exact
// Reward-funded allocations. Browser prices and unreconciled totals are rejected.
export async function earnVerifiedOrderRewards(input:{shop:string;customerGid:string;orderGid:string;paidAt:string;lines:RewardLine[]}){
 customerContext(input.shop,input.customerGid);
 const existing=await db.rewardsEntry.findUnique({where:{shop_sourceEvent:{shop:input.shop,sourceEvent:'rewards-earned:'+input.orderGid}}});
 if(existing){if(existing.customerGid!==input.customerGid||existing.orderGid!==input.orderGid||existing.kind!=='earned')throw Error('Rewards event conflict');return existing;}
 const policy=await db.commercePolicy.findUnique({where:{shop:input.shop}});
 if(!policy?.rewardsEnabled||!policy.rewardsRules)throw Error('Rewards rules are not activated');
 const rules=validateRewardRules(JSON.parse(policy.rewardsRules));
 const pointsDelta=calculateRewardPoints(input.lines,rules,input.paidAt);
 if(!pointsDelta)return null;
 return recordVerifiedRewardEvent({shop:input.shop,customerGid:input.customerGid,orderGid:input.orderGid,sourceEvent:'rewards-earned:'+input.orderGid,rulesVersion:rules.version,kind:'earned',pointsDelta});
}
