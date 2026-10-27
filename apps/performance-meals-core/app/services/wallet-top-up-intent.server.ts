import db from '../db.server';
import {assertShop} from './security.server';
import {parseWalletTopUpAmount} from './wallet-top-up-amount';
import {prepareWalletTopUpDraft} from './wallet-top-up-checkout.server';
import {settleWalletTopUp} from './wallet-top-up-settlement.server';

type Catalogue=Parameters<typeof prepareWalletTopUpDraft>[4];
type Admin=Parameters<typeof prepareWalletTopUpDraft>[0];
type DraftInput=Awaited<ReturnType<typeof prepareWalletTopUpDraft>>['input']&{customAttributes?:Array<{key:string;value:string}>};
type DraftReceipt={id:string;customerGid:string;productGid:string;variantGid:string;currency:string;amountMinor:number;checkoutUrl:string;orderGid:string|null};
export type DraftGateway={create:(input:DraftInput)=>Promise<DraftReceipt>;read:(id:string)=>Promise<DraftReceipt>};

function context(shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw Error('Invalid top-up customer');
}
function validDraft(receipt:DraftReceipt,shop:string,customerGid:string,amountMinor:number,catalogue:Catalogue){
 let url:URL;
 try{url=new URL(receipt.checkoutUrl);}catch{return false;}
 return /^gid:\/\/shopify\/DraftOrder\/\d+$/.test(receipt.id)&&receipt.customerGid===customerGid&&receipt.productGid===catalogue.productGid&&receipt.variantGid===catalogue.variantGid&&receipt.currency==='SGD'&&receipt.amountMinor===amountMinor&&url.protocol==='https:'&&url.hostname===shop&&!url.username&&!url.password;
}

// Internal only. No customer endpoint or funding activation. Authenticated callers
// supply the customer; catalogue IDs come from server configuration, never requests.
export async function createWalletTopUpCheckout(admin:Admin,shop:string,customerGid:string,requestKey:string,value:unknown,catalogue:Catalogue,gateway:DraftGateway){
 context(shop,customerGid);
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey))throw Error('Invalid top-up request key');
 const amount=parseWalletTopUpAmount(value);
 const policy=await db.commercePolicy.findUnique({where:{shop},select:{walletTopUpsEnabled:true}});
 if(!policy?.walletTopUpsEnabled)throw Error('Wallet top-ups are not activated');
 if(process.env.WALLET_LEGACY_TOP_UP_QA_ENABLED!=='true'||process.env.NODE_ENV==='production')throw Error('Legacy top-up QA is not activated; use approved packages');
 const prepared=await prepareWalletTopUpDraft(admin,shop,customerGid,value,catalogue);
 const key={shop_customerGid_requestKey:{shop,customerGid,requestKey}};
 let intent=await db.walletTopUpIntent.findUnique({where:key});
 if(!intent)intent=await db.walletTopUpIntent.create({data:{shop,customerGid,requestKey,currency:'SGD',amountMinor:amount.amountMinor,...catalogue}});
 if(intent.amountMinor!==amount.amountMinor||intent.productGid!==catalogue.productGid||intent.variantGid!==catalogue.variantGid||intent.currency!=='SGD')throw Error('Top-up intent differs');
 if(intent.state==='DRAFT_READY')return intent;
 if(intent.state!=='PREPARED')throw Error('Top-up checkout requires reconciliation; no automatic draft retry');
 const changed=await db.walletTopUpIntent.updateMany({where:{id:intent.id,shop,customerGid,state:'PREPARED'},data:{state:'DRAFT_PENDING'}});
 if(changed.count!==1)throw Error('Top-up checkout changed; reload');
 try{
  const receipt=await gateway.create({...prepared.input,customAttributes:[{key:'_pm_wallet_top_up_intent',value:intent.id}]});
  if(!validDraft(receipt,shop,customerGid,amount.amountMinor,catalogue)||receipt.orderGid!==null)throw Error('Top-up draft evidence differs');
  return await db.walletTopUpIntent.update({where:{id:intent.id},data:{state:'DRAFT_READY',draftGid:receipt.id,checkoutUrl:receipt.checkoutUrl}});
 }catch{
  await db.walletTopUpIntent.updateMany({where:{id:intent.id,state:'DRAFT_PENDING'},data:{state:'RECONCILIATION_REQUIRED'}});
  throw Error('Top-up draft requires reconciliation; no automatic draft retry');
 }
}

// A freshly read native draft supplies the order ID. Neither an order supplied
// by the browser nor line-item attributes can establish payment ownership.
export async function settleWalletTopUpCheckout(shop:string,customerGid:string,intentId:string,drafts:DraftGateway,paymentGateways:ReadonlyArray<string>,payments:Parameters<typeof settleWalletTopUp>[4]){
 context(shop,customerGid);
 const intent=await db.walletTopUpIntent.findFirst({where:{shop,customerGid,id:intentId}});
 if(!intent?.draftGid||!['DRAFT_READY','COMPLETED'].includes(intent.state))throw Error('Top-up intent unavailable');
 const receipt=await drafts.read(intent.draftGid);
 if(!validDraft(receipt,shop,customerGid,intent.amountMinor,intent)||receipt.id!==intent.draftGid||receipt.checkoutUrl!==intent.checkoutUrl||!receipt.orderGid||!/^gid:\/\/shopify\/Order\/\d+$/.test(receipt.orderGid)||(intent.orderGid&&receipt.orderGid!==intent.orderGid))throw Error('Top-up draft/order binding differs');
 const settlement=await settleWalletTopUp(shop,customerGid,receipt.orderGid,{productGid:intent.productGid,variants:{[intent.variantGid]:intent.amountMinor},paymentGateways},payments);
 await db.walletTopUpIntent.update({where:{id:intent.id},data:{state:'COMPLETED',orderGid:receipt.orderGid}});
 return settlement;
}
