import type {WalletReminderDelivery} from './wallet-reminder-batch.server';

// Development-only adapter. Resend's shared test domain sends only to the
// account owner's email. Production sender/domain approval is a separate gate.
export function developmentWalletReminderSender(options:{apiKey:string;recipient:string;customerGid:string;transport?:typeof fetch}){
 if(process.env.NODE_ENV==='production'||!process.env.WALLET_REMINDER_TEST_RECIPIENT||options.recipient!==process.env.WALLET_REMINDER_TEST_RECIPIENT||options.customerGid!==process.env.WALLET_REMINDER_TEST_CUSTOMER||!/^gid:\/\/shopify\/Customer\/\d+$/.test(options.customerGid)||!/^re_[A-Za-z0-9_-]+$/.test(options.apiKey))throw Error('Development reminder configuration unavailable');
 return async(delivery:WalletReminderDelivery)=>{
  if(delivery.customerGid!==options.customerGid||delivery.currency!=='SGD'||!Number.isSafeInteger(delivery.remainingMinor)||delivery.remainingMinor<1||!Number.isFinite(new Date(delivery.expiresAt).getTime())||!/^[-a-zA-Z0-9]{1,128}$/.test(delivery.idempotencyKey))throw Error('Invalid development reminder');
  const date=new Intl.DateTimeFormat('en-SG',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Singapore'}).format(new Date(delivery.expiresAt));
  const text=`DEVELOPMENT TEST — Performance Meals Wallet reminder\n\nThis is a test of the one-month Wallet expiry reminder, not a change to your existing credits.\n\nSimulated test credit remaining: SGD ${(delivery.remainingMinor/100).toFixed(2)}\nSimulated test expiry date: ${date} (Singapore time).\n\nIn the live reminder, customers will be reminded to use the remaining credit before its expiry.\nNo purchase or payment is required for this test.`;
  const response=await (options.transport??fetch)('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+options.apiKey,'Content-Type':'application/json','Idempotency-Key':delivery.idempotencyKey},body:JSON.stringify({from:'Performance Meals Development <qa@example.invalid>',to:[options.recipient],subject:'[DEVELOPMENT TEST] Wallet credit expiry reminder',text}),signal:AbortSignal.timeout(15000)});
  let body:{id?:unknown};try{body=await response.json();}catch{throw Error('Reminder provider response unconfirmed');}
  if(!response.ok||typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.id))throw Error('Reminder provider acceptance unconfirmed');
  return {reference:'resend:'+body.id};
 };
}
