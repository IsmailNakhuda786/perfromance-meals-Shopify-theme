export type FundedAllocation={creditEntryId:string;sourceKind:string;amountMinor:number};
type Entry={id:string;sourceKind:string;fundedDelta:number;fundedAllocations:string};
const fundedKinds=['customer_funded','gift_card_funded'];
export function parseFundedAllocations(value:string,amount:number):FundedAllocation[]{
 const allocations=JSON.parse(value);
 if(!Array.isArray(allocations)||!allocations.length||allocations.some(a=>typeof a.creditEntryId!=='string'||!fundedKinds.includes(a.sourceKind)||!Number.isSafeInteger(a.amountMinor)||a.amountMinor<1)||new Set(allocations.map(a=>a.creditEntryId)).size!==allocations.length||allocations.reduce((sum,a)=>sum+a.amountMinor,0)!==amount)throw new Error('Invalid funded allocation evidence');
 return allocations;
}
// Entries are ordered by persisted creation time, then ID. Bonus is never consumed.
export function allocateFundedFifo(entries:Entry[],amount:number):FundedAllocation[]{
 if(!Number.isSafeInteger(amount)||amount<1)throw new Error('Invalid funded debit');
 const lots:Array<{id:string;sourceKind:string;remaining:number}>=[];
 for(const entry of entries){
  if(entry.fundedDelta>0){
   if(!fundedKinds.includes(entry.sourceKind))throw new Error('Unknown funding source requires reconciliation');
   lots.push({id:entry.id,sourceKind:entry.sourceKind,remaining:entry.fundedDelta});
  }else if(entry.fundedDelta<0){
   let allocations:FundedAllocation[];
   if(entry.fundedAllocations==='[]'){
    // Preserve the previously verified single-source debit without inventing mixed attribution.
    const available=lots.filter(lot=>lot.remaining>0);
    if(available.length!==1||available[0].sourceKind!==entry.sourceKind)throw new Error('Legacy debit requires allocation reconciliation');
    allocations=[{creditEntryId:available[0].id,sourceKind:entry.sourceKind,amountMinor:-entry.fundedDelta}];
   }else allocations=parseFundedAllocations(entry.fundedAllocations,-entry.fundedDelta);
   for(const allocation of allocations){
    const lot=lots.find(item=>item.id===allocation.creditEntryId);
    if(!lot||lot.sourceKind!==allocation.sourceKind||lot.remaining<allocation.amountMinor)throw new Error('Funded allocation exceeds verified credit');
    lot.remaining-=allocation.amountMinor;
   }
  }
 }
 let remaining=amount;
 const result:FundedAllocation[]=[];
 for(const lot of lots){
  const used=Math.min(remaining,lot.remaining);
  if(used){result.push({creditEntryId:lot.id,sourceKind:lot.sourceKind,amountMinor:used});remaining-=used;}
  if(!remaining)return result;
 }
 throw new Error('Insufficient verified funded credit');
}
