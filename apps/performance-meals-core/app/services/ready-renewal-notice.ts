// Renewal billing and physical delivery are independent. These times are based
// only on the verified next billing timestamp, never a rescheduled delivery.
const stamp=(value:string)=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))throw Error('Verified renewal timestamp required');return Date.parse(value);
};
export type RenewalStage='ONE_MONTH'|'FORTNIGHT'|'ONE_WEEK'|'FORTY_EIGHT_HOURS'|'RENEWAL_DAY';
export function planReadyRenewalNotices(contractGid:string,nextBillingAt:string){
 if(typeof contractGid!=='string'||!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(contractGid))throw Error('Verified renewal contract required');
 const billing=stamp(nextBillingAt),local=new Date(billing+8*3600000);
 const month=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()-1,1)),lastDay=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
 const monthBefore=Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),Math.min(local.getUTCDate(),lastDay),local.getUTCHours(),local.getUTCMinutes(),local.getUTCSeconds(),local.getUTCMilliseconds())-8*3600000;
 const renewalDayStart=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-8*3600000;
 const dates:Array<[RenewalStage,number]>=[['ONE_MONTH',monthBefore],['FORTNIGHT',billing-14*86400000],['ONE_WEEK',billing-7*86400000],['FORTY_EIGHT_HOURS',billing-48*3600000],['RENEWAL_DAY',renewalDayStart]];
 return dates.flatMap(([stage,at])=>(['email','whatsapp']as const).map(channel=>({contractGid,nextBillingAt:new Date(billing).toISOString(),stage,channel,scheduledAt:new Date(at).toISOString(),idempotencyKey:JSON.stringify(['ready-renewal',contractGid,new Date(billing).toISOString(),stage,channel])})));
}
export function planReadyRenewalCatchUp(contractGid:string,nextBillingAt:string,recoveredAt:string,completedKeys:string[]=[]){
 const recovered=stamp(recoveredAt),normal=planReadyRenewalNotices(contractGid,nextBillingAt),billing=stamp(nextBillingAt);
 if(recovered>billing)throw Error('Past-due renewal must be reconciled before reminder recovery');
 if(!Array.isArray(completedKeys)||completedKeys.length>10||new Set(completedKeys).size!==completedKeys.length||completedKeys.some(k=>!normal.some(p=>p.idempotencyKey===k)))throw Error('Verified reminder completion keys required');
 return (['email','whatsapp']as const).flatMap(channel=>{
  const remaining=normal.filter(p=>p.channel===channel&&!completedKeys.includes(p.idempotencyKey)),missed=remaining.filter(p=>stamp(p.scheduledAt)<recovered);
  if(!missed.length)return remaining.map(p=>({...p,kind:'SCHEDULED' as const,coversStages:[p.stage]as RenewalStage[]}));
  const covered=remaining.filter(p=>stamp(p.scheduledAt)<=recovered).map(p=>p.stage);
  return [{contractGid,nextBillingAt:new Date(billing).toISOString(),stage:'CATCH_UP' as const,channel,kind:'IMMEDIATE' as const,coversStages:covered,scheduledAt:new Date(recovered).toISOString(),idempotencyKey:JSON.stringify(['ready-renewal',contractGid,new Date(billing).toISOString(),'catch-up',channel,covered])},...remaining.filter(p=>stamp(p.scheduledAt)>recovered).map(p=>({...p,kind:'SCHEDULED' as const,coversStages:[p.stage]as RenewalStage[]}))];
 });
}
export function readyRenewalNotice(input:{contractGid:string;nextBillingAt:string;stage:RenewalStage|'CATCH_UP';coversStages?:RenewalStage[];months:3|6;packageName:string;amountMinor:number;accountUrl:string;accountShopId:string;shopDomain:string}){
 const plans=planReadyRenewalNotices(input.contractGid,input.nextBillingAt);
 const catchUp=input.stage==='CATCH_UP'&&Array.isArray(input.coversStages)&&input.coversStages.length>0&&input.coversStages.length<=5&&new Set(input.coversStages).size===input.coversStages.length&&input.coversStages.every(s=>plans.some(p=>p.stage===s));
 if(!catchUp&&!plans.some(p=>p.stage===input.stage)||![3,6].includes(input.months)||typeof input.packageName!=='string'||!input.packageName.trim()||input.packageName.length>200||/[\r\n]/.test(input.packageName)||!Number.isSafeInteger(input.amountMinor)||input.amountMinor<1||!/^\d+$/.test(input.accountShopId)||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(input.shopDomain))throw Error('Verified renewal notice context required');
 const url=new URL(input.accountUrl),allowed=url.hostname===input.shopDomain&&/^\/account(?:\/|$)/.test(url.pathname)||url.hostname==='shopify.com'&&url.pathname.startsWith('/'+input.accountShopId+'/account/');
 if(!allowed||url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)throw Error('Verified renewal account destination required');
 const when=new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'full',timeStyle:'short'}).format(new Date(stamp(input.nextBillingAt))),amount=new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD'}).format(input.amountMinor/100);
 const title=input.stage==='RENEWAL_DAY'?'Your Ready Series package is due to renew today':input.stage==='CATCH_UP'?'A reminder about your upcoming Ready Series renewal':'Your Ready Series package renewal is approaching';
 const text=[title,input.packageName,`Your ${input.months}-month prepaid package is scheduled to renew automatically on ${when} (Singapore time).`,`Scheduled package amount: ${amount}.`,`Review your package and future renewal settings: ${url.href}`,'Changing a delivery does not change your renewal billing date.','This is a scheduled-renewal reminder, not confirmation that payment has succeeded.'].join('\n\n');
 return {email:{subject:title,text},whatsapp:{templateApprovalRequired:true,variables:{packageName:input.packageName,months:String(input.months),renewalAt:when,amount,accountUrl:url.href}}};
}
