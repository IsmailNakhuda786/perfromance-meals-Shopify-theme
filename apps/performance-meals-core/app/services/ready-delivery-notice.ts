import {planReadyDeliveryReminders} from './ready-series-calendar';

type Notice={orderReference:string;occurrence:number;deliveries:3|6;deliveryAt:string;deliveryEndsAt:string;hoursBefore:0|24|72;noticeHours:number;shopDomain:string;accountUrl:string;accountShopId:string;whatsappNumber:string;packageDeliveries?:Array<{occurrence:number;deliveries:3|6;quantity:number}>};
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
// Pure content preparation. No address resolution, email/WhatsApp send or worker
// activation. Provider receipt/consent/template approval are separate gates.
export function readyDeliveryNotice(input:Notice){
 const {orderReference,occurrence,deliveries,deliveryAt,deliveryEndsAt,hoursBefore,noticeHours,shopDomain,accountUrl,accountShopId,whatsappNumber}=input;
 if(typeof orderReference!=='string'||!orderReference.trim()||orderReference.length>100||/[\r\n]/.test(orderReference)||![3,6].includes(deliveries)||!Number.isSafeInteger(occurrence)||occurrence<1||occurrence>deliveries||![0,24,72].includes(hoursBefore)||!Number.isSafeInteger(noticeHours)||noticeHours<1||noticeHours>8760||!/^\d{8,15}$/.test(whatsappNumber)||!/^\d+$/.test(accountShopId)||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain))throw Error('Verified delivery notice context required');
 planReadyDeliveryReminders('content-validation',1,deliveryAt);planReadyDeliveryReminders('content-validation',1,deliveryEndsAt);
 const start=Date.parse(deliveryAt),end=Date.parse(deliveryEndsAt);
 const localDate=(time:number)=>new Date(time+8*3600000).toISOString().slice(0,10);
 if(end<=start||localDate(start)!==localDate(end))throw Error('Verified same-day delivery window required');
 let account:URL;try{account=new URL(accountUrl);}catch{throw Error('Verified account destination required');}
 const pathAllowed=account.hostname===shopDomain&&/^\/account(?:\/|$)/.test(account.pathname)||account.hostname==='shopify.com'&&account.pathname.startsWith('/'+accountShopId+'/account/');
 if(account.protocol!=='https:'||account.username||account.password||account.port||account.search||account.hash||!pathAllowed)throw Error('Verified account destination required');
 const date=new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(start));
 const clock=new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const window=clock.format(new Date(start))+'–'+clock.format(new Date(end))+' (Singapore time)';
 const supportUrl='https://wa.me/'+whatsappNumber;
 if(input.packageDeliveries&&(!Array.isArray(input.packageDeliveries)||!input.packageDeliveries.length||input.packageDeliveries.length>100||input.packageDeliveries.some(p=>![3,6].includes(p.deliveries)||!Number.isSafeInteger(p.occurrence)||p.occurrence<1||p.occurrence>p.deliveries||!Number.isSafeInteger(p.quantity)||p.quantity<1||p.quantity>2147483647)))throw Error('Verified package delivery summary required');
 const summary=input.packageDeliveries?.map(p=>`${p.quantity} package${p.quantity===1?'':'s'} · Delivery ${p.occurrence} of ${p.deliveries}`).join('; ');
 const description=summary?`Order ${orderReference} · One delivery visit: ${summary}`:`Order ${orderReference} · Delivery ${occurrence} of ${deliveries}`;
 const lines=['Your Ready Series delivery',description,date,window,`View your delivery: ${account.href}`,`Delivery changes require at least ${noticeHours} hours’ notice before both the current and replacement delivery. For later requests, contact Support: ${supportUrl}`,'Changing a delivery does not change your renewal billing date.'];
 const html='<h1>'+escape(lines[0])+'</h1><p>'+escape(lines[1])+'</p><p><strong>'+escape(date)+'</strong><br>'+escape(window)+'</p><p><a href="'+escape(account.href)+'">View your delivery</a></p><p>Delivery changes require at least '+noticeHours+' hours’ notice before both the current and replacement delivery. For later requests, <a href="'+supportUrl+'">contact Support</a>.</p><p>'+escape(lines.at(-1)!)+'</p>';
 return {hoursBefore,email:{subject:'Your upcoming Ready Series delivery',text:lines.join('\n\n'),html},whatsapp:{templateApprovalRequired:true,variables:{orderReference,occurrence:String(occurrence),deliveries:String(deliveries),deliveryDate:date,deliveryWindow:window,accountUrl:account.href,supportUrl,noticeHours:String(noticeHours),...(summary?{packageSummary:summary}:{})}}};
}
