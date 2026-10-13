export type RewardRule={id:string;priority:number;kind:'regular'|'promotion';pointsPerSgd:number;stream?:'ready_series'|'meal_plan';productGid?:string;startsAt?:string;endsAt?:string};
export type RewardRules={version:string;merchantApproved:true;defaultPointsPerSgd:number;directPaymentGateways?:string[];earningStartsAt?:string;qaOrderGid?:string;qaCustomerGid?:string;rules:RewardRule[]};
export type RewardLine={productGid:string;stream:string;netMinor:number;funding:{direct_customer:number;customer_funded:number;gift_card_funded:number;reward_funded:number;bonus:number};giftCard:boolean;walletTopUp:boolean};
function integer(value:number){if(!Number.isSafeInteger(value)||value<0||value>2147483647)throw Error('Invalid Rewards amount');}
export function validateRewardRules(rules:RewardRules){
 if(!rules.version||rules.merchantApproved!==true||!Array.isArray(rules.rules))throw Error('Rewards rules require approval');
 integer(rules.defaultPointsPerSgd);
 if(rules.directPaymentGateways&&(!Array.isArray(rules.directPaymentGateways)||rules.directPaymentGateways.some(g=>typeof g!=='string'||!g||g.length>100)||new Set(rules.directPaymentGateways).size!==rules.directPaymentGateways.length))throw Error('Invalid verified direct gateways');
 if(rules.earningStartsAt&&!Number.isFinite(Date.parse(rules.earningStartsAt)))throw Error('Invalid Rewards start date');
 if(rules.qaOrderGid&&!/^gid:\/\/shopify\/Order\/\d+$/.test(rules.qaOrderGid)||rules.qaCustomerGid&&!/^gid:\/\/shopify\/Customer\/\d+$/.test(rules.qaCustomerGid))throw Error('Invalid Rewards QA scope');
 const ids=new Set<string>();
 for(const rule of rules.rules){
  integer(rule.pointsPerSgd);integer(rule.priority);
  if(!['regular','promotion'].includes(rule.kind)||rule.kind==='promotion'&&(!rule.productGid||!rule.startsAt||!rule.endsAt))throw Error('Promotion requires a product and explicit dates');
  if(!rule.id||ids.has(rule.id)||rule.stream&&!['ready_series','meal_plan'].includes(rule.stream)||rule.productGid&&!/^gid:\/\/shopify\/Product\/\d+$/.test(rule.productGid))throw Error('Invalid Rewards rule');
  ids.add(rule.id);
  const start=rule.startsAt?Date.parse(rule.startsAt):null,end=rule.endsAt?Date.parse(rule.endsAt):null;
  if(start!==null&&!Number.isFinite(start)||end!==null&&!Number.isFinite(end)||start!==null&&end!==null&&start>=end)throw Error('Invalid promotion dates');
 }
 return rules;
}
// Rates replace rather than stack. Overlapping rules need explicit distinct
// priorities; ambiguous matching configurations cannot silently grant points.
export function calculateRewardPoints(lines:RewardLine[],rules:RewardRules,paidAt:string){
 validateRewardRules(rules);
 const time=Date.parse(paidAt);if(!Number.isFinite(time))throw Error('Invalid Rewards payment date');
 const buckets=new Map<number,number>();
 for(const line of lines){
  integer(line.netMinor);
  const kinds=['direct_customer','customer_funded','gift_card_funded','reward_funded','bonus'] as const;
  if(!line.funding||Object.keys(line.funding).sort().join(',')!==[...kinds].sort().join(','))throw Error('Food funding attribution incomplete');
  for(const kind of kinds)integer(line.funding[kind]);
  if(kinds.reduce((sum,kind)=>sum+line.funding[kind],0)!==line.netMinor)throw Error('Food funding allocations differ from native net value');
  if(line.giftCard||line.walletTopUp)continue;
  if(!['ready_series','meal_plan'].includes(line.stream)||!/^gid:\/\/shopify\/Product\/\d+$/.test(line.productGid))throw Error('Rewards line evidence incomplete');
  const matching=rules.rules.filter(rule=>(!rule.stream||rule.stream===line.stream)&&(!rule.productGid||rule.productGid===line.productGid)&&(!rule.startsAt||time>=Date.parse(rule.startsAt))&&(!rule.endsAt||time<Date.parse(rule.endsAt))).sort((a,b)=>Number(b.kind==='promotion')-Number(a.kind==='promotion')||b.priority-a.priority);
  if(matching.length>1&&matching[0].kind===matching[1].kind&&matching[0].priority===matching[1].priority)throw Error('Rewards rules overlap without precedence');
  const rate=matching[0]?.pointsPerSgd??rules.defaultPointsPerSgd;
  const amount=(buckets.get(rate)||0)+line.funding.direct_customer+line.funding.customer_funded;integer(amount);buckets.set(rate,amount);
 }
 // Ignore cents once per rate bucket, avoiding per-line rounding losses.
 const points=[...buckets].reduce((sum,[rate,minor])=>sum+Math.floor(minor/100)*rate,0);integer(points);return points;
}
export function rewardRedemptionMinor(points:number){
 integer(points);if(!points)throw Error('Redeem a positive whole number of points');
 const minor=points*10;integer(minor);return minor;
}

export type OrderFunding=RewardLine['funding'];
// Merchant-confirmed: Gift Card funds cover food before delivery, distributed
// proportionally across food lines. Wallet lot consumption remains FIFO.
export function allocateGiftCardFirstFood(lines:Array<Omit<RewardLine,'funding'>>,funding:OrderFunding,orderTotalMinor:number):RewardLine[]{
 integer(orderTotalMinor);
 const kinds=['direct_customer','customer_funded','gift_card_funded','reward_funded','bonus'] as const;
 for(const kind of kinds)integer(funding[kind]);
 if(kinds.reduce((sum,kind)=>sum+funding[kind],0)!==orderTotalMinor)throw Error('Native paid funding total differs');
 // Merchant has confirmed Gift Card allocation. Reward/bonus mixed allocation
 // needs independent evidence rather than silently inventing a priority.
 if(funding.reward_funded||funding.bonus)throw Error('Reward/bonus food funding requires verified line allocations');
 if(lines.some(line=>line.giftCard||line.walletTopUp))throw Error('Mixed shared-commerce funding requires separate allocation');
 const total=lines.reduce((sum,line)=>{integer(line.netMinor);return sum+line.netMinor;},0);integer(total);
 if(total>orderTotalMinor)throw Error('Food exceeds native order total');
 if(!total)return lines.map(line=>({...line,funding:{direct_customer:0,customer_funded:0,gift_card_funded:0,reward_funded:0,bonus:0}}));
 const giftFood=Math.min(total,funding.gift_card_funded);
 const allocate=(amount:number,weights:number[])=>{
  const denominator=weights.reduce((a,b)=>a+b,0);if(!denominator)return weights.map(()=>0);
  const parts=weights.map((weight,index)=>{const value=BigInt(weight)*BigInt(amount);return {index,minor:Number(value/BigInt(denominator)),remainder:value%BigInt(denominator)};});
  let left=amount-parts.reduce((sum,part)=>sum+part.minor,0);
  for(const part of [...parts].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(!left)break;part.minor++;left--;}
  return parts.map(part=>part.minor);
 };
 const gifts=allocate(giftFood,lines.map(line=>line.netMinor));
 const eligible=lines.map((line,index)=>line.netMinor-gifts[index]);
 const eligibleTotal=eligible.reduce((a,b)=>a+b,0);
 const customerPool=funding.direct_customer+funding.customer_funded;
 if(customerPool<eligibleTotal)throw Error('Customer food funding incomplete');
 // Both customer sources qualify equally; proportional attribution preserves
 // their separate audit values without creating different earning rates.
 const walletFood=customerPool?Number(BigInt(eligibleTotal)*BigInt(funding.customer_funded)/BigInt(customerPool)):0;
 const wallets=allocate(walletFood,eligible);
 return lines.map((line,index)=>({...line,funding:{direct_customer:eligible[index]-wallets[index],customer_funded:wallets[index],gift_card_funded:gifts[index],reward_funded:0,bonus:0}}));
}
