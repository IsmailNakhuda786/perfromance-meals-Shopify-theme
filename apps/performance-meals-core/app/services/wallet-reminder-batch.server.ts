import db from '../db.server';
import {assertShop} from './security.server';
import {prepareWalletExpiryReminder,finishWalletExpiryReminder} from './wallet-expiry.server';

type Admin=Parameters<typeof prepareWalletExpiryReminder>[0];
export type WalletReminderDelivery={customerGid:string;currency:string;remainingMinor:number;expiresAt:string;idempotencyKey:string};
export type WalletReminderGateway={adminFor:(customerGid:string)=>Admin;send:(delivery:WalletReminderDelivery)=>Promise<{reference:string}>};

// Internal, bounded worker. No route, timer, sender or production activation is
// installed here. The sender must resolve the verified owner and support receipt
// recovery using the idempotency key; uncertain sends are held, never retried.
export async function runWalletReminderBatch(shop:string,gateway:WalletReminderGateway,options:{now?:Date;limit?:number;after?:string}={}){
 assertShop(shop);
 if(process.env.WALLET_EXPIRY_REMINDERS_ENABLED!=='true')throw Error('Expiry reminders are not activated');
 const now=options.now??new Date(),limit=options.limit??25;
 if(!Number.isFinite(now.getTime())||!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('Invalid reminder batch bounds');
 const cursor=options.after?await db.walletCreditExpiry.findFirst({where:{id:options.after,shop},select:{id:true,reminderAt:true}}):null;
 if(options.after&&!cursor)throw Error('Invalid reminder cursor');
 const records=await db.walletCreditExpiry.findMany({where:{shop,reminderState:'PENDING',reminderAt:{lte:now},...(cursor?{OR:[{reminderAt:{gt:cursor.reminderAt}},{reminderAt:cursor.reminderAt,id:{gt:cursor.id}}]}:{})},orderBy:[{reminderAt:'asc'},{id:'asc'}],take:limit+1,select:{id:true,customerGid:true}});
 const results:Array<{id:string;state:string}>=[];
 for(const record of records.slice(0,limit)){
  let deliveryKey:string|undefined;
  try{
   const prepared=await prepareWalletExpiryReminder(gateway.adminFor(record.customerGid),shop,record.customerGid,record.id,now);
   if(prepared.state!=='DELIVERING'||!('deliveryKey' in prepared)||!prepared.deliveryKey){results.push({id:record.id,state:prepared.state});continue;}
   deliveryKey=prepared.deliveryKey;
   const receipt=await gateway.send({customerGid:record.customerGid,currency:prepared.currency!,remainingMinor:prepared.remainingMinor!,expiresAt:prepared.expiresAt!,idempotencyKey:deliveryKey});
   await finishWalletExpiryReminder(shop,record.customerGid,record.id,deliveryKey,receipt);
   results.push({id:record.id,state:'SENT'});
  }catch{
   if(deliveryKey){
    try{await finishWalletExpiryReminder(shop,record.customerGid,record.id,deliveryKey,{unknown:true});}catch{/* Preserve any already-recorded receipt or held state. */}
   }
   const held=await db.walletCreditExpiry.findUnique({where:{id:record.id},select:{reminderState:true}});
   results.push({id:record.id,state:held?.reminderState??'UNAVAILABLE'});
  }
 }
 return {processed:results.length,hasMore:records.length>limit,nextCursor:records.length>limit?results.at(-1)?.id:null,held:await db.walletCreditExpiry.count({where:{shop,reminderState:{in:['DELIVERING','UNKNOWN']}}}),results};
}
