export type Commencement = 'before_start'|'commenced'|'unknown';

// The merchant confirmed commencement is the saved start date. Dispatch is
// separate Support evidence; it never substitutes for an absent start date.
export function commencementStatus(startsOn:string|null|undefined,now=new Date()):Commencement{
 if(!startsOn||!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)||!Number.isFinite(now.getTime()))return 'unknown';
 const date=new Date(startsOn+'T00:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==startsOn)return 'unknown';
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=value('year')+'-'+value('month')+'-'+value('day');
 return today<startsOn?'before_start':'commenced';
}
