import db from '../db.server';
import {assertShop} from './security.server';
import {parseFundedAllocations} from './wallet-fifo';

// Read-only audit. Caller supplies the customer identity verified by Shopify.
// Ledger consistency is not proof of payment funding or native settlement.
export async function readWalletLedger(shop:string,customerGid:string,currency:string,after?:string){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)||!/^[A-Z]{3}$/.test(currency))throw new Error('Invalid ledger context');
 return db.$transaction(async tx=>{
  const where={shop,customerGid,currency};
  if(after&&!await tx.walletEntry.findFirst({where:{...where,id:after},select:{id:true}}))throw new Error('Invalid ledger cursor');
  const wallet=await tx.customerWallet.findUnique({where:{shop_customerGid_currency:where}});
  const sources=await tx.walletEntry.groupBy({by:['sourceKind'],where,_sum:{fundedDelta:true,bonusDelta:true},_count:{_all:true}});
  const history=await tx.walletEntry.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],take:51,...(after?{cursor:{id:after},skip:1}:{}),select:{id:true,sourceKind:true,fundedDelta:true,bonusDelta:true,createdAt:true}});
  const funded=sources.reduce((sum,source)=>sum+(source._sum.fundedDelta||0),0);
  const bonus=sources.reduce((sum,source)=>sum+(source._sum.bonusDelta||0),0);
  let attributionComplete=sources.every(source=>['customer_funded','gift_card_funded','reward_funded','bonus','funded_spend','funded_return','funded_expiry'].includes(source.sourceKind));
  const sourceTotals=new Map(sources.filter(source=>!['funded_spend','funded_return','funded_expiry'].includes(source.sourceKind)).map(source=>[source.sourceKind,{sourceKind:source.sourceKind,fundedDelta:source._sum.fundedDelta||0,bonusDelta:source._sum.bonusDelta||0,entries:source._count._all}]));
  const mixed=await tx.walletEntry.findMany({where:{...where,sourceKind:{in:['funded_spend','funded_return','funded_expiry']}},select:{fundedDelta:true,fundedAllocations:true}});
  for(const entry of mixed){
   try{
    const parts=parseFundedAllocations(entry.fundedAllocations,Math.abs(entry.fundedDelta));
    const grouped=new Map<string,number>();
    for(const part of parts)grouped.set(part.sourceKind,(grouped.get(part.sourceKind)||0)+part.amountMinor);
    for(const [kind,amount] of grouped){const total=sourceTotals.get(kind)||{sourceKind:kind,fundedDelta:0,bonusDelta:0,entries:0};total.fundedDelta+=Math.sign(entry.fundedDelta)*amount;total.entries++;sourceTotals.set(kind,total);}
   }catch{attributionComplete=false;}
  }
  return {currency,history:history.slice(0,50),hasMore:history.length>50,nextCursor:history.length>50?history[49].id:null,sources:[...sourceTotals.values()],
   balanceMatchesLedger:wallet?wallet.fundedBalance===funded&&wallet.bonusBalance===bonus:sources.length===0,
   attributionComplete,settlementVerified:false};
 });
}
