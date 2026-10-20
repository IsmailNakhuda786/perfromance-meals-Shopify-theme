import {readyDeliveryNotice} from './ready-delivery-notice';

type Notice=Parameters<typeof readyDeliveryNotice>[0];
type Delivery={customerGid:string;idempotencyKey:string;notice:Notice};
// Explicit development adapter only. Nothing consumes DRAFT reminder records.
// A future guarded caller must reverify booking/revision/recipient before sending.
// No scheduler, public route, production sender or WhatsApp connection is enabled.
export function developmentReadyDeliveryEmail(options:{apiKey:string;recipient:string;customerGid:string;transport?:typeof fetch}){
 const allowed=()=>process.env.NODE_ENV!=='production'&&process.env.READY_DELIVERY_TEST_RECIPIENT===options.recipient&&process.env.READY_DELIVERY_TEST_CUSTOMER===options.customerGid&&/^\S+@[^\s@]+\.[^\s@]+$/.test(options.recipient)&&/^gid:\/\/shopify\/Customer\/\d+$/.test(options.customerGid)&&/^re_[A-Za-z0-9_-]+$/.test(options.apiKey);
 if(!allowed())throw Error('Development delivery sender unavailable');
 return async(delivery:Delivery)=>{
  if(!allowed()||delivery.customerGid!==options.customerGid||!/^[-a-zA-Z0-9]{1,128}$/.test(delivery.idempotencyKey))throw Error('Development delivery recipient or key differs');
  const notice=readyDeliveryNotice(delivery.notice);
  if(delivery.notice.shopDomain!==process.env.ALLOWED_SHOP||Date.parse(delivery.notice.deliveryAt)<=Date.now())throw Error('Verified upcoming development delivery required');
  const response=await(options.transport??fetch)('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:'Bearer '+options.apiKey,'Content-Type':'application/json','Idempotency-Key':delivery.idempotencyKey},
   body:JSON.stringify({from:'Performance Meals Development <onboarding@resend.dev>',to:[options.recipient],subject:'[DEVELOPMENT TEST] '+notice.email.subject,text:'DEVELOPMENT TEST — no delivery has been booked by this test.\n\n'+notice.email.text}),signal:AbortSignal.timeout(15000)
  });
  let receipt:{id?:unknown};try{receipt=await response.json();}catch{throw Error('Delivery email acceptance unconfirmed');}
  if(!response.ok||typeof receipt.id!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(receipt.id))throw Error('Delivery email acceptance unconfirmed');
  return {reference:'resend:'+receipt.id};
 };
}
