// Approved 15 October 2026. These are credit rules, never payment authorization.
export const WALLET_CREDIT_POLICY_VERSION = 'merchant-20261015';
export type WalletCreditKind = 'customer_funded'|'gift_card_funded'|'bonus'|'reward_funded';
export const WALLET_SPEND_ORDER:ReadonlyArray<WalletCreditKind> = ['customer_funded','gift_card_funded','bonus','reward_funded'];
export const APPROVED_TOP_UP_PACKAGES = Object.freeze([
 Object.freeze({id:'regular',paidMinor:87000,bonusMinor:8500,totalMinor:95500,marketingMonths:6}),
 Object.freeze({id:'frequent',paidMinor:174000,bonusMinor:18500,totalMinor:192500,marketingMonths:12}),
 Object.freeze({id:'habitual',paidMinor:269000,bonusMinor:40000,totalMinor:309000,marketingMonths:18}),
]);
export function approvedTopUpPackage(paidMinor:number){
 const pack=APPROVED_TOP_UP_PACKAGES.find(item=>item.paidMinor===paidMinor);
 if(!pack)throw Error('Select an approved Wallet top-up package');
 return pack;
}
function days(year:number,month:number){return new Date(Date.UTC(year,month,0)).getUTCDate();}
function date(year:number,month:number,day:number){return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
// One calendar year, expiring at the end of that date in Asia/Singapore.
// February anniversaries clamp to the final valid day; no fixed 365-day offset.
export function walletCreditTerm(issuedAt:string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(issuedAt))throw Error('Verified credit issuance timestamp required');
 const instant=new Date(issuedAt);
 if(!Number.isFinite(instant.getTime())||instant.toISOString().slice(0,19)!==issuedAt.slice(0,19))throw Error('Invalid credit issuance timestamp');
 const local=new Date(instant.getTime()+8*60*60*1000);
 const year=local.getUTCFullYear()+1,month=local.getUTCMonth()+1,day=Math.min(local.getUTCDate(),days(year,month));
 const expiryDate=date(year,month,day);
 const reminderMonth=month===1?12:month-1,reminderYear=month===1?year-1:year;
 return {policyVersion:WALLET_CREDIT_POLICY_VERSION,issuedAt:instant.toISOString(),expiryDate,expiresAt:new Date(Date.UTC(year,month-1,day+1)-8*60*60*1000-1).toISOString(),reminderDate:date(reminderYear,reminderMonth,Math.min(day,days(reminderYear,reminderMonth)))};
}
// Jerome's17October clarification: conversion retains the original card date.
// New claims persist this original expiry before debit; historical records stay unchanged.
export function giftCardClaimTerm(expiresOn:string,claimedAt:string){
 const issued=walletCreditTerm(claimedAt).issuedAt;
 if(typeof expiresOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn))throw Error('Verified original Gift Card expiry required');
 const midnight=new Date(expiresOn+'T00:00:00Z');
 if(!Number.isFinite(midnight.getTime())||midnight.toISOString().slice(0,10)!==expiresOn)throw Error('Invalid original Gift Card expiry');
 const year=midnight.getUTCFullYear(),month=midnight.getUTCMonth()+1,day=midnight.getUTCDate();
 const expiresAt=new Date(midnight.getTime()+24*60*60*1000-8*60*60*1000-1).toISOString();
 if(Date.parse(issued)>Date.parse(expiresAt))throw Error('Gift Card has expired');
 const reminderMonth=month===1?12:month-1,reminderYear=month===1?year-1:year;
 return {policyVersion:'merchant-20261017',issuedAt:issued,expiryDate:expiresOn,expiresAt,reminderDate:date(reminderYear,reminderMonth,Math.min(day,days(reminderYear,reminderMonth)))};
}
export type WalletCreditLot={id:string;sourceKind:WalletCreditKind;remainingMinor:number;issuedAt:string;expiresAt:string};
export type WalletPurchaseLine={id:string;kind:'food'|'delivery'|'gift_card'|'top_up';amountMinor:number};
// Planning only. The native checkout must independently prove eligibility and
// settlement. This function neither debits Shopify nor posts ledger entries.
export function planApprovedWalletSpend(lots:WalletCreditLot[],lines:WalletPurchaseLine[],now:string){
 const timestamp=(value:string)=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))throw Error('Invalid Wallet planning timestamp');
  const parsed=Date.parse(value);
  if(!Number.isFinite(parsed)||new Date(parsed).toISOString().slice(0,19)!==value.slice(0,19))throw Error('Invalid Wallet planning timestamp');
  return parsed;
 };
 const moment=timestamp(now);
 if(!Array.isArray(lots)||!Array.isArray(lines)||lots.length>5000||lines.length>250)throw Error('Invalid Wallet planning evidence');
 const id=(value:unknown)=>typeof value==='string'&&value.trim().length>0&&value.length<=512&&!Array.from(value).some(character=>character.charCodeAt(0)<32);
 if(lots.some(lot=>!lot)||lines.some(line=>!line))throw Error('Invalid Wallet planning evidence');
 if(new Set(lots.map(lot=>lot.id)).size!==lots.length||new Set(lines.map(line=>line.id)).size!==lines.length)throw Error('Duplicate Wallet evidence');
 for(const lot of lots)if(!id(lot.id)||!WALLET_SPEND_ORDER.includes(lot.sourceKind)||!Number.isSafeInteger(lot.remainingMinor)||lot.remainingMinor<0||lot.remainingMinor>2147483647||timestamp(lot.expiresAt)<=timestamp(lot.issuedAt))throw Error('Invalid Wallet credit evidence');
 for(const line of lines)if(!id(line.id)||!['food','delivery','gift_card','top_up'].includes(line.kind)||!Number.isSafeInteger(line.amountMinor)||line.amountMinor<0||line.amountMinor>2147483647)throw Error('Invalid Wallet purchase evidence');
 const grossTotal=lines.reduce((sum,line)=>sum+line.amountMinor,0);
 if(!Number.isSafeInteger(grossTotal)||grossTotal>2147483647)throw Error('Wallet purchase exceeds supported range');
 const eligibleTotal=lines.filter(line=>line.kind!=='top_up').reduce((sum,line)=>sum+line.amountMinor,0);
 const foodTotal=lines.filter(line=>line.kind==='food').reduce((sum,line)=>sum+line.amountMinor,0);
 if(!Number.isSafeInteger(eligibleTotal))throw Error('Wallet purchase exceeds supported range');
 let remaining=eligibleTotal,remainingFood=foodTotal,remainingOther=eligibleTotal-foodTotal,bonusUsed=0;
 const allocations:Array<{creditId:string;sourceKind:WalletCreditKind;amountMinor:number;foodMinor:number;otherMinor:number}>=[];
 const available=lots.filter(lot=>Date.parse(lot.expiresAt)>moment&&Date.parse(lot.issuedAt)<=moment).sort((a,b)=>WALLET_SPEND_ORDER.indexOf(a.sourceKind)-WALLET_SPEND_ORDER.indexOf(b.sourceKind)||Date.parse(a.issuedAt)-Date.parse(b.issuedAt)||a.id.localeCompare(b.id));
 for(const lot of available){
  const used=Math.min(lot.remainingMinor,remaining,lot.sourceKind==='bonus'?remainingFood:remaining);
  if(!used)continue;
  // Confirmed15 October: principal covers delivery/non-food before food,
  // Gift Card covers remaining food first, bonus only remaining food, and
  // Reward credit is proportional across the amounts still unpaid.
  const foodMinor=lot.sourceKind==='customer_funded'?Math.max(0,used-remainingOther):lot.sourceKind==='gift_card_funded'||lot.sourceKind==='bonus'?Math.min(used,remainingFood):Number(BigInt(used)*BigInt(remainingFood)/BigInt(remaining));
  const otherMinor=used-foodMinor;
  allocations.push({creditId:lot.id,sourceKind:lot.sourceKind,amountMinor:used,foodMinor,otherMinor});
  remainingFood-=foodMinor;remainingOther-=otherMinor;remaining-=used;
  if(lot.sourceKind==='bonus')bonusUsed+=used;
 }
 return {policyVersion:WALLET_CREDIT_POLICY_VERSION,allocations,foodOnlyBonusMinor:bonusUsed,remainingPurchaseMinor:remaining,excludedTopUpMinor:lines.filter(line=>line.kind==='top_up').reduce((sum,line)=>sum+line.amountMinor,0)};
}
