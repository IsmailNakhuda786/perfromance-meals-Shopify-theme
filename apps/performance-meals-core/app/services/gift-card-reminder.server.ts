import {randomUUID} from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import {reviewGiftCardExpiry} from './gift-card-expiry-policy.server';

type Admin=Parameters<typeof reviewGiftCardExpiry>[0];
function context(shop:string,customerGid:string,now:Date){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!Number.isFinite(now.getTime()))throw Error('Invalid Gift Card reminder context');
}
// Read-only native evidence; registration never changes the card or sends mail.
export async function registerGiftCardReminder(admin:Admin,shop:string,customerGid:string,cardGid:string,policyStartsAt:string,now=new Date()){
 context(shop,customerGid,now);
 const proof=await reviewGiftCardExpiry(admin,shop,cardGid,policyStartsAt,now);
 if(proof.state!=='VERIFIED'||proof.recipientGid!==customerGid||!proof.nativeExpiresOn||!proof.reminderDate)throw Error('Verified named-recipient Gift Card expiry required');
 const values={shop,giftCardGid:cardGid,customerGid,expiresOn:proof.nativeExpiresOn,reminderAt:new Date(proof.reminderDate+'T00:00:00+08:00'),remainingMinor:proof.balanceMinor};
 return db.$transaction(async tx=>{
  const previous=await tx.giftCardExpiryReminder.findUnique({where:{shop_giftCardGid:{shop,giftCardGid:cardGid}}});
  if(previous){
   if(previous.customerGid!==customerGid||previous.expiresOn!==values.expiresOn||previous.reminderAt.getTime()!==values.reminderAt.getTime())throw Error('Gift Card reminder evidence changed; review required');
   return previous;
  }
  return tx.giftCardExpiryReminder.create({data:values});
 });
}

// Internal only, off by default. The returned key is claimed once and must be
// retained even if a provider times out. No sender or scheduler is installed.
export async function prepareGiftCardReminder(admin:Admin,shop:string,customerGid:string,id:string,policyStartsAt:string,now=new Date()){
 context(shop,customerGid,now);
 if(process.env.GIFT_CARD_EXPIRY_REMINDERS_ENABLED!=='true')throw Error('Gift Card reminders are not activated');
 const record=await db.giftCardExpiryReminder.findFirst({where:{id,shop,customerGid}});
 if(!record)throw Error('Gift Card reminder unavailable');
 if(record.state!=='PENDING')return {state:record.state};
 if(now<record.reminderAt)return {state:'NOT_DUE'};
 const proof=await reviewGiftCardExpiry(admin,shop,record.giftCardGid,policyStartsAt,now);
 if(proof.recipientGid!==customerGid||proof.nativeExpiresOn!==record.expiresOn||!['VERIFIED','EXPIRED','UNAVAILABLE'].includes(proof.state))throw Error('Gift Card reminder requires reconciliation');
 const state=proof.state==='EXPIRED'?'EXPIRED':proof.state==='UNAVAILABLE'?'UNAVAILABLE':'DELIVERING';
 const deliveryKey=state==='DELIVERING'?randomUUID():null;
 const changed=await db.giftCardExpiryReminder.updateMany({where:{id,shop,customerGid,state:'PENDING',revision:record.revision},data:{state,remainingMinor:proof.balanceMinor,deliveryKey,revision:{increment:1}}});
 if(changed.count!==1)throw Error('Gift Card reminder already claimed');
 return {state,...(deliveryKey?{deliveryKey,currency:'SGD',remainingMinor:proof.balanceMinor,expiresOn:record.expiresOn}: {})};
}

export async function finishGiftCardReminder(shop:string,customerGid:string,id:string,deliveryKey:string,outcome:{reference:string}|{unknown:true}){
 context(shop,customerGid,new Date());
 if(!deliveryKey)throw Error('Gift Card delivery key required');
 const record=await db.giftCardExpiryReminder.findFirst({where:{id,shop,customerGid,deliveryKey}});
 if(!record)throw Error('Gift Card reminder delivery differs');
 const reference='reference' in outcome?outcome.reference:null;
 if(reference!==null&&(!reference.trim()||reference.length>512))throw Error('Gift Card reminder receipt required');
 const state=reference?'SENT':'UNKNOWN';
 if(record.state===state&&record.deliveryReference===reference)return record;
 if(record.state!=='DELIVERING')throw Error('Gift Card delivery is held; reconcile provider evidence');
 const changed=await db.giftCardExpiryReminder.updateMany({where:{id,shop,customerGid,deliveryKey,state:'DELIVERING',revision:record.revision},data:{state,deliveryReference:reference,notifiedAt:reference?new Date():null,revision:{increment:1}}});
 if(changed.count!==1)throw Error('Gift Card reminder changed');
 return db.giftCardExpiryReminder.findUniqueOrThrow({where:{id}});
}
