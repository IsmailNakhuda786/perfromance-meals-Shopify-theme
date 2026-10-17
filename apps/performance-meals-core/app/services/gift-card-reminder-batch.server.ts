import db from '../db.server';
import {assertShop} from './security.server';
import {prepareGiftCardReminder,finishGiftCardReminder} from './gift-card-reminder.server';

type Admin=Parameters<typeof prepareGiftCardReminder>[0];
export type GiftCardReminderDelivery={customerGid:string;currency:string;remainingMinor:number;expiresOn:string;idempotencyKey:string};
type Gateway={adminFor:(customerGid:string)=>Admin;send:(delivery:GiftCardReminderDelivery)=>Promise<{reference:string}>};
// No automatic invocation or email adapter. Only PENDING entries are eligible;
// uncertain/in-progress deliveries stay held beyond provider idempotency windows.
export async function runGiftCardReminderBatch(shop:string,policyStartsAt:string,gateway:Gateway,options:{now?:Date;limit?:number;after?:string}={}){
 assertShop(shop);
 if(process.env.GIFT_CARD_EXPIRY_REMINDERS_ENABLED!=='true')throw Error('Gift Card reminders are not activated');
 const now=options.now??new Date(),limit=options.limit??25;
 if(!Number.isFinite(now.getTime())||!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('Invalid Gift Card reminder batch');
 const cursor=options.after?await db.giftCardExpiryReminder.findFirst({where:{id:options.after,shop},select:{id:true,reminderAt:true}}):null;
 if(options.after&&!cursor)throw Error('Invalid Gift Card reminder cursor');
 const records=await db.giftCardExpiryReminder.findMany({where:{shop,state:'PENDING',reminderAt:{lte:now},...(cursor?{OR:[{reminderAt:{gt:cursor.reminderAt}},{reminderAt:cursor.reminderAt,id:{gt:cursor.id}}]}:{})},orderBy:[{reminderAt:'asc'},{id:'asc'}],take:limit+1,select:{id:true,customerGid:true}});
 const results:Array<{id:string;state:string}>=[];
 for(const record of records.slice(0,limit)){
  let key:string|undefined;
  try{
   const prepared=await prepareGiftCardReminder(gateway.adminFor(record.customerGid),shop,record.customerGid,record.id,policyStartsAt,now);
   if(prepared.state!=='DELIVERING'||!('deliveryKey' in prepared)||!prepared.deliveryKey){results.push({id:record.id,state:prepared.state});continue;}
   key=prepared.deliveryKey;
   const receipt=await gateway.send({customerGid:record.customerGid,currency:prepared.currency!,remainingMinor:prepared.remainingMinor!,expiresOn:prepared.expiresOn!,idempotencyKey:key});
   await finishGiftCardReminder(shop,record.customerGid,record.id,key,receipt);
   results.push({id:record.id,state:'SENT'});
  }catch{
   if(key){try{await finishGiftCardReminder(shop,record.customerGid,record.id,key,{unknown:true});}catch{/* Preserve saved receipt or held state. */}}
   const saved=await db.giftCardExpiryReminder.findUnique({where:{id:record.id},select:{state:true}});
   results.push({id:record.id,state:saved?.state??'UNAVAILABLE'});
  }
 }
 return {processed:results.length,hasMore:records.length>limit,nextCursor:records.length>limit?results.at(-1)?.id:null,held:await db.giftCardExpiryReminder.count({where:{shop,state:{in:['DELIVERING','UNKNOWN']}}}),results};
}
