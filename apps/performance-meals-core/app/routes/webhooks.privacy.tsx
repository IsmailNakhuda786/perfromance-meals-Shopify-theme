import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import db from '../db.server';
export async function action({request}:ActionFunctionArgs){
 const {shop,topic,payload}=await authenticate.webhook(request);assertShop(shop);
 if(topic==='CUSTOMERS_REDACT'){
  const customerGid=`gid://shopify/Customer/${payload.customer?.id}`;
  await db.$transaction(async tx=>{
   const selections=await tx.mealPlanSelection.findMany({where:{shop,customerGid},select:{id:true}});
   await tx.planOperation.deleteMany({where:{shop,selectionId:{in:selections.map(s=>s.id)}}});
   await tx.walletReservation.deleteMany({where:{shop,customerGid}});
   await tx.orderCancellation.deleteMany({where:{shop,customerGid}});
   await tx.orderSupportRequest.deleteMany({where:{shop,customerGid}});
   await tx.rewardRedemption.deleteMany({where:{shop,customerGid}});
   await tx.rewardsEntry.deleteMany({where:{shop,customerGid}});
   await tx.rewardsAccount.deleteMany({where:{shop,customerGid}});
   await tx.walletEntry.deleteMany({where:{shop,customerGid}});
   await tx.customerWallet.deleteMany({where:{shop,customerGid}});
   await tx.mealPlanDraft.deleteMany({where:{shop,customerGid}});
   await tx.mealPlanSelection.deleteMany({where:{shop,customerGid}});
   await tx.operationalLine.deleteMany({where:{shop,customerGid}});
   await tx.migrationMapping.deleteMany({where:{shop,sourceCustomerId:String(payload.customer?.id)}});
  });
 } else if(topic==='SHOP_REDACT') {
  await db.orderCancellation.deleteMany({where:{shop}});
  await db.orderSupportRequest.deleteMany({where:{shop}});
  await db.rewardRedemption.deleteMany({where:{shop}});
  await db.rewardsEntry.deleteMany({where:{shop}});
  await db.rewardsAccount.deleteMany({where:{shop}});
  await db.rewardRuleVersion.deleteMany({where:{shop}});
  await db.$transaction([db.walletReservation.deleteMany({where:{shop}}),db.walletEntry.deleteMany({where:{shop}}),db.customerWallet.deleteMany({where:{shop}}),db.commercePolicy.deleteMany({where:{shop}}),db.planOperation.deleteMany({where:{shop}}),db.mealPlanDraft.deleteMany({where:{shop}}),db.mealPlanSelection.deleteMany({where:{shop}}),db.operationalLine.deleteMany({where:{shop}}),db.migrationMapping.deleteMany({where:{shop}}),db.webhookReceipt.deleteMany({where:{shop}}),db.session.deleteMany({where:{shop}})]);
 } else if(topic==='CUSTOMERS_DATA_REQUEST') {
  // A durable pending request is tracked; delivery is a merchant-approved privacy operation.
  await db.planOperation.create({data:{shop,selectionId:`customer:${payload.customer?.id}`,kind:'PRIVACY_DATA_REQUEST',state:'PENDING_REVIEW'}});
 }
 return new Response(null,{status:200});
}
