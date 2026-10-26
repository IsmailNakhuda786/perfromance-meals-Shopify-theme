export function readyDeliverySlotForm(form:FormData){
 const date=form.get('date'),start=form.get('start'),end=form.get('end'),capacity=form.get('capacity'),revision=form.get('revision'),available=form.get('available');
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||typeof start!=='string'||typeof end!=='string'||![start,end].every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t))||typeof capacity!=='string'||!/^[1-9]\d{0,9}$/.test(capacity)||Number(capacity)>2147483647||typeof revision!=='string'||!/^(0|[1-9]\d{0,9})$/.test(revision)||Number(revision)>=2147483647||available!==null&&available!=='yes')throw Error('Enter a valid Singapore date, time window and whole-number delivery limit');
 const utc=(time:string)=>new Date(Date.parse(date+'T'+time+':00Z')-8*3600000).toISOString();
 const deliveryAt=utc(start),deliveryEndsAt=utc(end);
 if(deliveryEndsAt<=deliveryAt)throw Error('The end time must be later than the start time on the same day');
 return {deliveryAt,deliveryEndsAt,capacity:Number(capacity),available:available==='yes',expectedRevision:Number(revision)};
}
