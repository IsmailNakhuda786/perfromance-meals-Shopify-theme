type CancellationEvidence={
 createdAt:string;
 paid:boolean;
 alreadyCancelled:boolean;
 hasEverDispatched:boolean|null;
 businessStreams:ReadonlyArray<string>;
};

// Merchant-confirmed mapping: a successful native fulfillment is dispatch.
// Persisted history is still required when a fulfillment is later cancelled.
export function nativeDispatchEvidence(statuses:ReadonlyArray<string>,historicalDispatch:boolean|null,evidenceComplete:boolean):boolean|null{
 if(historicalDispatch===true||statuses.includes('SUCCESS'))return true;
 if(!evidenceComplete||historicalDispatch===null||statuses.some(status=>!['OPEN','PENDING','ERROR','FAILURE'].includes(status)))return null;
 return false;
}

// Dispatch evidence remains useful to Support; it never authorizes a refund.
export function assessOrderCancellation(_evidence:CancellationEvidence,_now?:Date){
 void _evidence;void _now;
 return {eligible:false,reason:'SUPPORT_APPROVAL_REQUIRED'};
}
