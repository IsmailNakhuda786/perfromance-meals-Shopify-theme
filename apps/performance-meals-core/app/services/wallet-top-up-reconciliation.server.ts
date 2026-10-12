import db from '../db.server';
import {assertShop} from './security.server';
import {assessTopUpLifecycle} from './wallet-top-up-lifecycle';
import {readNativeTopUpOrder} from './wallet-top-up-native.server';

type Admin=Parameters<typeof readNativeTopUpOrder>[0];
// Account-owned, read-only native audit. This flags a lifecycle incident; it does
// not refund a payment, debit native credit or edit historical ledger entries.
export async function auditWalletTopUps(admin:Admin,shop:string,customerGid:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw new Error('Invalid Wallet customer');
 const settlements=await db.walletTopUpSettlement.findMany({where:{shop,customerGid},orderBy:{createdAt:'asc'},take:51});
 if(settlements.length>50)throw new Error('Top-up lifecycle requires paginated reconciliation');
 let pending=false;
 for(const settlement of settlements){
  if(['CREDIT_PENDING','RECONCILIATION_REQUIRED'].includes(settlement.state)){pending=true;continue;}
  if(!settlement.creditGid)continue;
  const nativeOrder=await readNativeTopUpOrder(admin,shop,settlement.orderGid);
  const result=assessTopUpLifecycle(nativeOrder,settlement);
  if(result.state!=='CLEAR'){
   pending=true;
   await db.walletTopUpSettlement.updateMany({where:{id:settlement.id,shop,customerGid,state:settlement.state},data:{state:'RECONCILIATION_REQUIRED'}});
  }
 }
 return {pending};
}
