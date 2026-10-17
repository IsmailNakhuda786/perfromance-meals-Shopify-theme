import db from '../db.server';
import {assertShop} from './security.server';
import {coreWalletPolicyStartedAt} from './wallet-core-policy.server';
import {expireCoreManagedWalletCredit,type CoreExpiryGateway} from './wallet-core-expiry.server';

// Scheduler entry point only. No public route or automatic timer invokes this.
// Native gateway and production scheduling require separate activation evidence.
export async function runCoreWalletExpiryBatch(shop:string,gatewayFor:(customerGid:string)=>CoreExpiryGateway,options:{now?:Date;limit?:number;after?:string}={}){
 assertShop(shop);
 const startsAt=coreWalletPolicyStartedAt(),now=options.now??new Date(),limit=options.limit??25;
 if(!Number.isFinite(now.getTime())||!Number.isSafeInteger(limit)||limit<1||limit>100)throw Error('Invalid expiry batch bounds');
 const cursor=options.after?await db.walletCreditExpiry.findFirst({where:{id:options.after,shop,enforcementMode:'CORE_MANAGED',issuedAt:{gte:startsAt}},select:{id:true,expiresAt:true}}):null;
 if(options.after&&!cursor)throw Error('Invalid expiry batch cursor');
 // Explicit keyset continuation survives a cursor record becoming COMPLETED
 // and disappearing from the due-state filter during the previous page.
 const records=await db.walletCreditExpiry.findMany({where:{shop,enforcementMode:'CORE_MANAGED',issuedAt:{gte:startsAt},expiresAt:{lte:now},expiryState:{in:['PENDING','AWAITING_LEDGER']},...(cursor?{OR:[{expiresAt:{gt:cursor.expiresAt}},{expiresAt:cursor.expiresAt,id:{gt:cursor.id}}]}:{})},orderBy:[{expiresAt:'asc'},{id:'asc'}],take:limit+1,select:{id:true,customerGid:true}});
 const results:Array<{id:string;state:string}>=[];
 for(const record of records.slice(0,limit)){
  try{
   const completed=await expireCoreManagedWalletCredit(shop,record.customerGid,record.id,gatewayFor(record.customerGid),now);
   results.push({id:record.id,state:completed.expiryState});
  }catch{
   // An uncertain financial outcome is persisted by the worker and excluded
   // from subsequent batches. Never retry it or infer success from a balance.
   const held=await db.walletCreditExpiry.findUnique({where:{id:record.id},select:{expiryState:true}});
   results.push({id:record.id,state:held?.expiryState??'UNAVAILABLE'});
  }
 }
 const held=await db.walletCreditExpiry.count({where:{shop,enforcementMode:'CORE_MANAGED',expiryState:{in:['DEBIT_PENDING','UNKNOWN','AWAITING_LEDGER']}}});
 return {processed:results.length,hasMore:records.length>limit,nextCursor:records.length>limit?results.at(-1)?.id:null,held,results};
}
