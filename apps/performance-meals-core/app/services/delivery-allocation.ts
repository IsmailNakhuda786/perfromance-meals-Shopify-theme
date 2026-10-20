import {calculateSingaporeDelivery,type DeliveryLine} from './delivery-policy';

export type VerifiedDeliveryAllocation={deliveryReference:string;lines:{lineId:string;netMinor:number}[]};
// Internal audit seam only: the caller must obtain allocations from an approved
// schedule. Native discounted line totals must be conserved exactly. Never infer
// allocation from shipping-line count or accept browser-supplied values.
export function calculateAllocatedDeliveries(lines:DeliveryLine[],allocations:VerifiedDeliveryAllocation[]){
 calculateSingaporeDelivery(lines);
 const ordinary=lines.filter(line=>line.kind==='ordinary_food');
 if(!Array.isArray(allocations)||allocations.length>250||new Set(allocations.map(row=>row?.deliveryReference)).size!==allocations.length)throw Error('Invalid verified delivery allocation');
 const totals=new Map(ordinary.map(line=>[line.id,0]));
 const deliveries=allocations.map(delivery=>{
  if(typeof delivery?.deliveryReference!=='string'||!delivery.deliveryReference.trim()||delivery.deliveryReference.length>512||[...delivery.deliveryReference].some(c=>c.charCodeAt(0)<32)||!Array.isArray(delivery.lines)||!delivery.lines.length||new Set(delivery.lines.map(line=>line?.lineId)).size!==delivery.lines.length)throw Error('Incomplete verified delivery allocation');
  const allocated:DeliveryLine[]=delivery.lines.map(line=>{
   if(!line||!totals.has(line.lineId)||!Number.isSafeInteger(line.netMinor)||line.netMinor<0)throw Error('Foreign or invalid allocated food line');
   const total=totals.get(line.lineId)!+line.netMinor;if(!Number.isSafeInteger(total)||total>2147483647)throw Error('Allocated delivery amount exceeds supported range');totals.set(line.lineId,total);
   return {id:line.lineId,kind:'ordinary_food',netMinor:line.netMinor};
  });
  return {deliveryReference:delivery.deliveryReference,...calculateSingaporeDelivery(allocated)};
 });
 if(ordinary.some(line=>totals.get(line.id)!==line.netMinor)||ordinary.length>0&&deliveries.length===0)throw Error('Allocated delivery food totals do not reconcile');
 const expectedFeeMinor=deliveries.reduce((sum,delivery)=>sum+delivery.feeMinor,0);
 if(!Number.isSafeInteger(expectedFeeMinor)||expectedFeeMinor>2147483647)throw Error('Allocated delivery fees exceed supported range');
 return {deliveries,expectedFeeMinor};
}
