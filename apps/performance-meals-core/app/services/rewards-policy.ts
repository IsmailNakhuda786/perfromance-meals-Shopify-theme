export type RewardRule={id:string;priority:number;kind:'regular'|'promotion';pointsPerSgd:number;stream?:'ready_series'|'meal_plan';productGid?:string;startsAt?:string;endsAt?:string};
export type RewardRules={version:string;merchantApproved:true;defaultPointsPerSgd:number;rules:RewardRule[]};
export type RewardLine={productGid:string;stream:string;netMinor:number;funding:{direct_customer:number;customer_funded:number;gift_card_funded:number;reward_funded:number;bonus:number};giftCard:boolean;walletTopUp:boolean};
function integer(value:number){if(!Number.isSafeInteger(value)||value<0||value>2147483647)throw Error('Invalid Rewards amount');}
export function validateRewardRules(rules:RewardRules){
 if(!rules.version||rules.merchantApproved!==true||!Array.isArray(rules.rules))throw Error('Rewards rules require approval');
 integer(rules.defaultPointsPerSgd);
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
 integer(points);if(!points||points%10)throw Error('Redeem a positive multiple of 10 points');
 const minor=points*10;integer(minor);return minor;
}
