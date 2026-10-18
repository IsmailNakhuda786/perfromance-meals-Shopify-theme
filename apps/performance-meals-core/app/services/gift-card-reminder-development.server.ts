import type {GiftCardReminderDelivery} from './gift-card-reminder-batch.server';

// Explicit development adapter only: no scheduler, route or production sender.
// The reminder batch supplies freshly verified named-recipient/expiry evidence.
export function developmentGiftCardReminderSender(options:{apiKey:string;recipient:string;customerGid:string;transport?:typeof fetch}){
 if(process.env.NODE_ENV==='production'||!process.env.GIFT_CARD_REMINDER_TEST_RECIPIENT||options.recipient!==process.env.GIFT_CARD_REMINDER_TEST_RECIPIENT||options.customerGid!==process.env.GIFT_CARD_REMINDER_TEST_CUSTOMER||!/^gid:\/\/shopify\/Customer\/\d+$/.test(options.customerGid)||!/^re_[A-Za-z0-9_-]+$/.test(options.apiKey)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(options.recipient))throw Error('Development Gift Card reminder configuration unavailable');
 return async(delivery:GiftCardReminderDelivery)=>{
  if(process.env.NODE_ENV==='production'||delivery.customerGid!==options.customerGid||delivery.currency!=='SGD'||!Number.isSafeInteger(delivery.remainingMinor)||delivery.remainingMinor<1||delivery.remainingMinor>2147483647||typeof delivery.expiresOn!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(delivery.expiresOn)||!/^[-a-zA-Z0-9]{1,128}$/.test(delivery.idempotencyKey))throw Error('Invalid development Gift Card reminder');
  const day=new Date(delivery.expiresOn+'T00:00:00Z');
  const expiry=new Date(delivery.expiresOn+'T23:59:59.999+08:00');
  if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==delivery.expiresOn||expiry.getTime()<=Date.now())throw Error('Gift Card expiry is invalid or already passed');
  const date=new Intl.DateTimeFormat('en-SG',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Singapore'}).format(expiry);
  const text=`DEVELOPMENT TEST — Performance Meals Gift Card expiry reminder\n\nThis is a test reminder, not a new Gift Card or Wallet credit.\n\nTest Gift Card remaining value: SGD ${(delivery.remainingMinor/100).toFixed(2)}\nOriginal Gift Card expiry: ${date} (Singapore time).\n\nOnly the named recipient may claim the full remaining value into their Wallet. The Wallet credit retains the original Gift Card expiry date.\n\nNo Gift Card code is included in this email. No purchase or payment is required for this test.`;
  const response=await (options.transport??fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+options.apiKey,'Content-Type':'application/json','Idempotency-Key':delivery.idempotencyKey},body:JSON.stringify({from:'Performance Meals Development <qa@example.invalid>',to:[options.recipient],subject:'[DEVELOPMENT TEST] Gift Card expiry reminder',text}),signal:AbortSignal.timeout(15000)});
  let body:{id?:unknown};try{body=await response.json();}catch{throw Error('Gift Card reminder provider response unconfirmed');}
  if(!response.ok||typeof body.id!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.id))throw Error('Gift Card reminder provider acceptance unconfirmed');
  return {reference:'resend:'+body.id};
 };
}
