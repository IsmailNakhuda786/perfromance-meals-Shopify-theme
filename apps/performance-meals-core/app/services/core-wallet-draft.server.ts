import db from '../db.server';
import {assertShop} from './security.server';
import {assertCoreWalletRedemption,prepareCoreWalletRedemption,transitionCoreWalletRedemption,type CoreWalletRedemption,type RedemptionEvent} from './core-wallet-redemption';

type Saved={shop:string;customerGid:string;currency:string;attemptId:string;state:string;revision:number;payload:string};
function context(shop:string,customerGid:string,attemptId:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||typeof attemptId!=='string'||!attemptId.trim()||attemptId.trim()!==attemptId||attemptId.length>512||Array.from(attemptId).some(c=>c.charCodeAt(0)<32))throw Error('Wallet draft context unavailable');
}
function enabled(){if(process.env.CORE_WALLET_DRAFTS_ENABLED!=='true')throw Error('Core Wallet draft persistence is not activated');}
function decode(row:Saved):CoreWalletRedemption{
 if(Buffer.byteLength(row.payload,'utf8')>65536)throw Error('Stored Wallet draft exceeds the verified limit');
 const value=JSON.parse(row.payload) as CoreWalletRedemption;assertCoreWalletRedemption(value);
 if(value.scope.shop!==row.shop||value.scope.customerGid!==row.customerGid||value.scope.currency!==row.currency||value.id!==row.attemptId||value.state!==row.state||value.revision!==row.revision)throw Error('Stored Wallet draft identity differs');
 return value;
}
export async function readCoreWalletDraft(shop:string,customerGid:string,attemptId:string){
 context(shop,customerGid,attemptId);
 const row=await db.coreWalletRedemptionDraft.findFirst({where:{shop,customerGid,attemptId}});
 return row?decode(row):null;
}
// Draft storage only. There is deliberately no provider callback, financial
// ledger write or lot reservation. A saved SUBMITTING state does not send money.
export async function saveCoreWalletDraft(input:Parameters<typeof prepareCoreWalletRedemption>[0]){
 enabled();context(input.quote.shop,input.quote.customerGid,input.id);
 const draft=prepareCoreWalletRedemption(input),payload=JSON.stringify(draft);
 if(Buffer.byteLength(payload,'utf8')>65536)throw Error('Wallet draft exceeds the verified limit');
 const {shop,customerGid,currency}=draft.scope,where={shop_attemptId:{shop,attemptId:draft.id}};
 const replay=(row:Saved)=>{const previous=decode(row);if(previous.scope.customerGid!==customerGid||previous.planDigest!==draft.planDigest)throw Error('Wallet draft attempt already describes another plan');return previous;};
 const previous=await db.coreWalletRedemptionDraft.findUnique({where});if(previous)return replay(previous);
 try{return decode(await db.coreWalletRedemptionDraft.create({data:{shop,customerGid,currency,attemptId:draft.id,state:draft.state,revision:draft.revision,payload}}));}
 catch(error){
  if(!(error&&typeof error==='object'&&'code' in error&&error.code==='P2002'))throw error;
  const winner=await db.coreWalletRedemptionDraft.findUnique({where});if(!winner)throw error;return replay(winner);
 }
}
// Internal future-adapter seam only. Any eventual provider receipt must be
// authenticated before this call; no browser or webhook route exposes it.
export async function transitionCoreWalletDraft(shop:string,customerGid:string,attemptId:string,expectedRevision:number,event:RedemptionEvent){
 enabled();context(shop,customerGid,attemptId);
 return db.$transaction(async tx=>{
  const row=await tx.coreWalletRedemptionDraft.findFirst({where:{shop,customerGid,attemptId}});
  if(!row)throw Error('Wallet draft unavailable');
  const current=decode(row),next=transitionCoreWalletRedemption(current,expectedRevision,event);
  if(next.revision===current.revision)return current;
  const changed=await tx.coreWalletRedemptionDraft.updateMany({where:{shop,customerGid,attemptId,revision:expectedRevision,payload:row.payload},data:{state:next.state,revision:next.revision,payload:JSON.stringify(next)}});
  if(changed.count!==1)throw Error('Wallet draft changed; reload before proceeding');
  return next;
 });
}
