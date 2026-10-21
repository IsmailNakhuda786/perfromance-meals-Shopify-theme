import db from '../db.server';
import {assertShop} from './security.server';
import {bundleReviewHash,type BundleSnapshot,nativeRef} from './bundle-snapshot';
import {readOrderDispatch} from './order-dispatch.server';
type Admin=Parameters<typeof readOrderDispatch>[0];
// Native fulfilled quantities count purchased bundle units, not individual meals.
// Read-only: no scheduling, inventory, cancellation, payment or ledger mutation.
export async function auditBundleFulfillment(admin:Admin,shop:string,operationalLineId:string){
 assertShop(shop);
 const line=await db.operationalLine.findFirst({where:{id:operationalLineId,shop}});
 if(!line||line.validationStatus!=='VALIDATED'||line.businessStream!=='ready_series'||!line.bundleReviewId||!line.customerGid)throw Error('A validated original bundle purchase snapshot is required');
 const review=await db.bundlePurchaseReview.findFirst({where:{id:line.bundleReviewId,shop,state:'ORDERED',orderGid:line.orderGid,orderLineGid:line.orderLineGid,customerGid:line.customerGid}});
 if(!review||review.productGid!==line.productGid||review.variantGid!==line.variantGid||review.currency!=='SGD'||!Number.isSafeInteger(review.quantity)||review.quantity<1)throw Error('Original bundle purchase identity is unavailable');
 const snapshot=JSON.parse(review.snapshot) as BundleSnapshot;
 if(bundleReviewHash({id:review.id,shop,customerGid:review.customerGid,quantity:review.quantity,snapshot})!==review.snapshotHash||snapshot.version!=='native-bundle-v1'||snapshot.productGid!==review.productGid||snapshot.variantGid!==review.variantGid||snapshot.currency!=='SGD'||!Array.isArray(snapshot.components)||!snapshot.components.length||snapshot.components.length>100||snapshot.components.some(p=>!nativeRef('Metaobject',p.componentGid)||!Number.isSafeInteger(p.quantity*review.quantity)||!nativeRef('Product',p.productGid)||!nativeRef('ProductVariant',p.variantGid)||!Number.isSafeInteger(p.quantity)||p.quantity<1)||snapshot.components.reduce((sum,p)=>sum+p.quantity,0)!==snapshot.itemsPerBundle)throw Error('Original bundle purchase snapshot is invalid');
 const proof=await readOrderDispatch(admin,shop,line.orderGid);
 if(proof.customerGid!==review.customerGid)throw Error('Native fulfillment belongs to a different customer');
 const evidence=proof.byLine.get(line.orderLineGid)||[];
 const visibleDispatchedUnits=evidence.filter(x=>x.status==='SUCCESS').reduce((sum,x)=>sum+x.fulfilledQuantity,0);
 const issues:string[]=[];
 if(!proof.complete)issues.push('Native fulfillment history is incomplete');
 if(evidence.some(x=>x.status!=='SUCCESS'))issues.push('Non-successful or changed fulfillment requires review');
 if(!Number.isSafeInteger(visibleDispatchedUnits)||visibleDispatchedUnits>review.quantity)issues.push('Native fulfilled quantity exceeds the original purchase');
 if(line.fulfillmentState==='DISPATCHED'&&visibleDispatchedUnits===0)issues.push('Previously observed dispatch is absent from current native history');
 const needsReview=issues.length>0;
 // Missing/changed history cannot prove what remains. Never replace an original
 // purchase with today's catalogue, or invent a frozen-meal delivery schedule.
 return {orderGid:line.orderGid,orderLineGid:line.orderLineGid,reviewId:review.id,purchasedBundleUnits:review.quantity,visibleDispatchedUnits:Number.isSafeInteger(visibleDispatchedUnits)?visibleDispatchedUnits:null,remainingBundleUnits:needsReview?null:review.quantity-visibleDispatchedUnits,needsReview,issues,components:snapshot.components.map(p=>({productGid:p.productGid,variantGid:p.variantGid,label:p.label,mealsPerBundle:p.quantity,visibleDispatchedMeals:Number.isSafeInteger(p.quantity*visibleDispatchedUnits)?p.quantity*visibleDispatchedUnits:null}))};
}
