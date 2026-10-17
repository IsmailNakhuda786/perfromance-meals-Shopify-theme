type FulfillmentEvidence = {
 id:string;orderGid:string;lineGid:string;fulfillAt:string|null;
 status:string;quantity:number;
};
type DeliveryExpectation={deliveries:3|6;deliveryDates:string[];orderGid:string;lineGid:string;quantityPerDelivery:number};
// Compare native scheduled fulfilments with an explicitly verified merchant
// calendar. Use the latest approved monthly calendar including one-off availability adjustments.
// Adjusted/paused dates must come from that stored plan, not be inferred here.
export function verifyReadySeriesFulfillments(evidence:FulfillmentEvidence[],expected:DeliveryExpectation){
 if(![3,6].includes(expected.deliveries)||!Number.isSafeInteger(expected.quantityPerDelivery)||expected.quantityPerDelivery<1||!Array.isArray(expected.deliveryDates)||expected.deliveryDates.length!==expected.deliveries||new Set(expected.deliveryDates).size!==expected.deliveries)throw Error('Invalid prepaid entitlement');
 if(!/^gid:\/\/shopify\/Order\/\d+$/.test(expected.orderGid)||!/^gid:\/\/shopify\/LineItem\/\d+$/.test(expected.lineGid))throw Error('Invalid original order reference');
 for(const date of expected.deliveryDates){const time=Date.parse(date+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date)throw Error('Invalid approved delivery date');}
 const selected=evidence.filter(item=>item.lineGid===expected.lineGid),issues:string[]=[],actualDates:string[]=[];
 if(selected.length!==expected.deliveries)issues.push('Delivery count does not match the purchased term');
 if(new Set(selected.map(item=>item.id)).size!==selected.length)issues.push('Duplicate fulfillment evidence');
 for(const item of selected){
  if(!/^gid:\/\/shopify\/FulfillmentOrder\/\d+$/.test(item.id)||item.orderGid!==expected.orderGid)issues.push('Fulfillment must belong to the original Shopify order');
  if(!['OPEN','SCHEDULED','IN_PROGRESS','CLOSED'].includes(item.status))issues.push('Held, cancelled or unknown fulfillment cannot prove scheduled coverage');
  if(item.quantity!==expected.quantityPerDelivery)issues.push('Delivery quantity does not match the purchased entitlement');
  const time=item.fulfillAt?Date.parse(item.fulfillAt):NaN;
  if(!item.fulfillAt||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(item.fulfillAt)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==item.fulfillAt.slice(0,19)){issues.push('Native scheduled delivery date is missing or invalid');continue;}
  actualDates.push(new Date(time+8*3600000).toISOString().slice(0,10));
 }
 if(JSON.stringify(actualDates.sort())!==JSON.stringify([...expected.deliveryDates].sort()))issues.push('Native delivery dates differ from the approved merchant calendar');
 return {scheduleMatches:issues.length===0,issues,deliveryCount:selected.length};
}
