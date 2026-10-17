export const MONEY_LIMIT=2_000_000_000;
export type WalletLine={stream:'ready_series'|'meal_plan'|'shared';purchaseMode:'single'|'bundle'|'subscription';sellingPlanGid:string|null;isGiftCard:boolean;amountMinor:number};
export function money(value:number){if(!Number.isSafeInteger(value)||value<0||value>MONEY_LIMIT)throw new Error('Invalid money amount');return value;}
// Historical reservation policy only. Never use for the approved 15 October
// source-lot flow; planApprovedWalletSpend owns the current merchant rules.
export function bonusEligible(line:WalletLine){
 return line.stream==='ready_series'&&!line.isGiftCard&&!line.sellingPlanGid&&(line.purchaseMode==='single'||line.purchaseMode==='bundle');
}
export function allocateWallet(lines:WalletLine[],funded:number,bonus:number){
 money(funded);money(bonus);
 let fundedUsed=0,bonusUsed=0;
 const allocations=lines.map(line=>{
  money(line.amountMinor);
  // Bonus is applied only to eligible native lines. It never restricts funded money.
  const b=bonusEligible(line)?Math.min(bonus-bonusUsed,line.amountMinor):0;
  const f=Math.min(funded-fundedUsed,line.amountMinor-b);
  bonusUsed+=b;fundedUsed+=f;
  return {fundedMinor:f,bonusMinor:b,remainderMinor:line.amountMinor-b-f};
 });
 return {allocations,fundedUsed,bonusUsed};
}
