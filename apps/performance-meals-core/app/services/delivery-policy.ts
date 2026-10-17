export type DeliveryLine={id:string;kind:'ordinary_food'|'delivery_included'|'gift_card'|'wallet_top_up';netMinor:number};
export const CONFIRMED_SINGAPORE_DELIVERY=Object.freeze({reducedAtMinor:7500,freeAtMinor:12500,standardFeeMinor:1000,reducedFeeMinor:500});
// Calculation only. Callers must classify native products and supply verified
// discounted food values; browser prices/properties are not shipping evidence.
export function calculateSingaporeDelivery(lines:DeliveryLine[],policy=CONFIRMED_SINGAPORE_DELIVERY){
 for(const value of Object.values(policy))if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid delivery policy');
 if(policy.reducedAtMinor>=policy.freeAtMinor||policy.reducedFeeMinor>policy.standardFeeMinor)throw Error('Invalid delivery thresholds');
 if(new Set(lines.map(line=>line.id)).size!==lines.length)throw Error('Duplicate delivery line');
 for(const line of lines)if(!line.id||!['ordinary_food','delivery_included','gift_card','wallet_top_up'].includes(line.kind)||!Number.isSafeInteger(line.netMinor)||line.netMinor<0)throw Error('Invalid delivery line evidence');
 const ordinary=lines.filter(line=>line.kind==='ordinary_food');
 const eligibleSubtotalMinor=ordinary.reduce((sum,line)=>sum+line.netMinor,0);
 if(!Number.isSafeInteger(eligibleSubtotalMinor))throw Error('Delivery subtotal exceeds supported range');
 const feeMinor=!ordinary.length||eligibleSubtotalMinor>=policy.freeAtMinor?0:eligibleSubtotalMinor>=policy.reducedAtMinor?policy.reducedFeeMinor:policy.standardFeeMinor;
 return {currency:'SGD',eligibleSubtotalMinor,feeMinor,hasOrdinaryFood:ordinary.length>0};
}
