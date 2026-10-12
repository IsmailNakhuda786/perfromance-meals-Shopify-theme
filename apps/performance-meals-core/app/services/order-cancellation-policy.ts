type CancellationEvidence={
 createdAt:string;
 paid:boolean;
 alreadyCancelled:boolean;
 hasEverDispatched:boolean|null;
 businessStreams:ReadonlyArray<string>;
};
const windowMs=48*60*60*1000;

// Merchant-confirmed mapping: a successful native fulfillment is dispatch.
// Persisted history is still required when a fulfillment is later cancelled.
export function nativeDispatchEvidence(statuses:ReadonlyArray<string>,historicalDispatch:boolean|null,evidenceComplete:boolean):boolean|null{
 if(historicalDispatch===true||statuses.includes('SUCCESS'))return true;
 if(!evidenceComplete||historicalDispatch===null||statuses.some(status=>!['OPEN','PENDING','ERROR','FAILURE'].includes(status)))return null;
 return false;
}

// Server-owned elapsed time and verified dispatch history only. A fulfilled,
// cancelled or returned shipment must never erase an earlier dispatch event.
// Eligibility is not itself evidence that a native cancellation/refund occurred.
export function assessOrderCancellation(evidence:CancellationEvidence,now=new Date()){
 const placed=Date.parse(evidence.createdAt),current=now.getTime();
 if(!Number.isFinite(placed)||!Number.isFinite(current)||placed>current)return {eligible:false,reason:'INVALID_ORDER_TIME'};
 if(evidence.alreadyCancelled)return {eligible:false,reason:'ALREADY_CANCELLED'};
 if(!evidence.paid)return {eligible:false,reason:'PAYMENT_REVIEW_REQUIRED'};
 if(evidence.hasEverDispatched===null)return {eligible:false,reason:'DISPATCH_EVIDENCE_REQUIRED'};
 if(evidence.hasEverDispatched)return {eligible:false,reason:'DISPATCHED_CONTACT_SUPPORT'};
 if(current-placed>windowMs)return {eligible:false,reason:'CANCELLATION_WINDOW_CLOSED'};
 if(!evidence.businessStreams.length||evidence.businessStreams.some(stream=>!['ready_series','meal_plan'].includes(stream)))return {eligible:false,reason:'MIXED_COMMERCE_REVIEW_REQUIRED'};
 return {eligible:true,reason:'UNDISPATCHED_WITHIN_48_HOURS',refundDestination:'wallet',refundScope:'full_paid_total_including_delivery',stopFutureRenewals:true};
}
