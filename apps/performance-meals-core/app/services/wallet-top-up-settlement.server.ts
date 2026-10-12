import db from '../db.server';
import {assertShop} from './security.server';
import {recordSettledWalletCredit} from './wallet.server';
import {verifyPaidTopUp,type TopUpConfiguration,type TopUpOrder} from './wallet-top-up-policy';

type NativeCredit={id:string;ownerGid:string;amountMinor:number;currency:string};
type TopUpGateway={
 readOrder:(orderGid:string)=>Promise<TopUpOrder>;
 credit:(customerGid:string,amountMinor:number)=>Promise<NativeCredit>;
};

// Internal only: no browser route, checkout item or automatic webhook is enabled.
// Activation requires the approved native checkout catalogue/payment configuration.
export async function settleWalletTopUp(shop:string,customerGid:string,orderGid:string,configuration:TopUpConfiguration,gateway:TopUpGateway){
 assertShop(shop);
 const policy=await db.commercePolicy.findUnique({where:{shop}});
 if(!policy?.walletTopUpsEnabled)throw new Error('Wallet top-ups are not activated');
 const order=await gateway.readOrder(orderGid);
 if(order.id!==orderGid)throw new Error('Top-up native order differs');
 const proof=verifyPaidTopUp(order,customerGid,configuration);
 const key={shop_orderGid:{shop,orderGid}};
 let settlement=await db.walletTopUpSettlement.findUnique({where:key});
 if(!settlement)settlement=await db.walletTopUpSettlement.create({data:{shop,...proof}});
 if(settlement.customerGid!==customerGid||settlement.currency!==proof.currency||settlement.amountMinor!==proof.amountMinor||settlement.paymentGid!==proof.paymentGid)throw new Error('Wallet top-up settlement conflict');
 if(settlement.state==='COMPLETED')return settlement;
 if(['CREDIT_PENDING','RECONCILIATION_REQUIRED'].includes(settlement.state))throw new Error('Top-up requires reconciliation; no automatic financial retry');
 if(settlement.state==='PREPARED'){
  const changed=await db.walletTopUpSettlement.updateMany({where:{id:settlement.id,shop,state:'PREPARED'},data:{state:'CREDIT_PENDING'}});
  if(changed.count!==1)throw new Error('Wallet top-up changed; reload');
  try{
   const receipt=await gateway.credit(customerGid,proof.amountMinor);
   if(!/^gid:\/\/shopify\/StoreCreditAccountCreditTransaction\/\d+$/.test(receipt.id)||receipt.ownerGid!==customerGid||receipt.amountMinor!==proof.amountMinor||receipt.currency!==proof.currency)throw new Error('Native top-up credit evidence differs');
   settlement=await db.walletTopUpSettlement.update({where:{id:settlement.id},data:{state:'AWAITING_LEDGER',creditGid:receipt.id}});
  }catch{
   await db.walletTopUpSettlement.updateMany({where:{id:settlement.id,state:'CREDIT_PENDING'},data:{state:'RECONCILIATION_REQUIRED'}});
   throw new Error('Top-up requires reconciliation; no automatic financial retry');
  }
 }
 if(settlement.state!=='AWAITING_LEDGER'||!settlement.creditGid)throw new Error('Top-up credit evidence is incomplete');
 const entry=await recordSettledWalletCredit({shop,customerGid,currency:proof.currency,sourceEvent:'wallet-top-up:'+settlement.id,sourceKind:'customer_funded',amountMinor:proof.amountMinor,sourceGid:orderGid,nativeSourceTransactionGid:proof.paymentGid,nativeTransactionGid:settlement.creditGid});
 return db.walletTopUpSettlement.update({where:{id:settlement.id},data:{state:'COMPLETED',ledgerEntryId:entry.id}});
}
