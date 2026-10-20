import {randomUUID} from 'node:crypto';
import type {Prisma} from '@prisma/client';
import db from '../db.server';
import {assertShop} from './security.server';
import {snapshotNativeBundle,bundleReviewHash,nativeRef,type BundleSnapshot,type NativeBundleVariant} from './bundle-snapshot';

export const BUNDLE_REVIEW_QUERY=`#graphql
query BundlePurchaseReview($variant:ID!){
 shop{myshopifyDomain currencyCode}
 productVariant(id:$variant){id price
  contents:metafield(namespace:"performance",key:"bundle_contents"){...BundleReviewContents}
  product{id status isGiftCard requiresSellingPlan
   stream:metafield(namespace:"performance",key:"business_stream"){type value}
   mealCount:metafield(namespace:"performance",key:"meal_count"){type value}
   contents:metafield(namespace:"performance",key:"bundle_contents"){...BundleReviewContents}
  }
 }
}
fragment BundleReviewContents on Metafield{
 type value references(first:100){nodes{... on Metaobject{id type fields{key value reference{
  ... on Product{...BundleReviewFood}
  ... on ProductVariant{__typename id product{...BundleReviewFood}}
 }}}}pageInfo{hasNextPage}}
}
fragment BundleReviewFood on Product{__typename id status isGiftCard requiresSellingPlan stream:metafield(namespace:"performance",key:"business_stream"){type value}}
`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export async function readNativeBundleSnapshot(admin:Admin,shop:string,productGid:string,variantGid:string){
 assertShop(shop);
 if(!nativeRef('Product',productGid)||!nativeRef('ProductVariant',variantGid))throw Error('Bundle references invalid');
 const response=await admin.graphql(BUNDLE_REVIEW_QUERY,{variables:{variant:variantGid}}),body=await response.json();
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop)throw Error('Native bundle evidence unavailable');
 return snapshotNativeBundle(body.data?.productVariant as NativeBundleVariant,{productGid,variantGid,currency:body.data.shop.currencyCode,draftAllowed:process.env.NODE_ENV!=='production'});
}
// Internal authenticated-caller seam only. No public endpoint or storefront
// integration activates reviews. The caller must obtain its customer from JWT.
export async function prepareBundleReview(admin:Admin,input:{shop:string;customerGid:string;productGid:string;variantGid:string;quantity:number}){
 const {shop,customerGid,productGid,variantGid,quantity}=input;assertShop(shop);
 if(!nativeRef('Customer',customerGid)||!Number.isSafeInteger(quantity)||quantity<1||quantity>2147483647)throw Error('Bundle customer invalid');
 const snapshot=await readNativeBundleSnapshot(admin,shop,productGid,variantGid),id=randomUUID();
 const snapshotHash=bundleReviewHash({id,shop,customerGid,quantity,snapshot});
 return db.bundlePurchaseReview.create({data:{id,shop,customerGid,productGid,variantGid,currency:'SGD',quantity,snapshot:JSON.stringify(snapshot),snapshotHash}});
}
// Binding shares the original routing transaction. A changed current catalogue
// holds an unbound review rather than silently promising different meals. Once
// bound, later native catalogue edits never rewrite this stored purchase snapshot.
export class BundleBindingError extends Error {}
export async function bindBundleReview(tx:Prisma.TransactionClient,input:{shop:string;customerGid:string;reviewId:string;reviewHash:string;orderGid:string;orderLineGid:string;productGid:string;variantGid:string;quantity:number;unitPriceMinor:number;createdAt:string;currentSnapshot:BundleSnapshot}){
 const {shop,customerGid,reviewId,reviewHash,orderGid,orderLineGid,productGid,variantGid,quantity,unitPriceMinor,createdAt,currentSnapshot}=input;
 assertShop(shop);
 if(!nativeRef('Customer',customerGid)||!nativeRef('Order',orderGid)||!nativeRef('LineItem',orderLineGid)||!nativeRef('Product',productGid)||!nativeRef('ProductVariant',variantGid)||typeof reviewId!=='string'||!reviewId||reviewId.length>100||!/^[0-9a-f]{64}$/.test(reviewHash))throw new BundleBindingError('Bundle binding context invalid');
 const time=Date.parse(createdAt);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(createdAt)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==createdAt.slice(0,19))throw new BundleBindingError('Bundle order time invalid');
 const record=await tx.bundlePurchaseReview.findFirst({where:{id:reviewId,shop,customerGid}});
 if(!record||record.productGid!==productGid||record.variantGid!==variantGid||record.currency!=='SGD'||record.quantity!==quantity||record.snapshotHash!==reviewHash||record.reviewedAt.getTime()>time)throw new BundleBindingError('Bundle review identity differs');
 const saved=JSON.parse(record.snapshot) as BundleSnapshot;
 if(bundleReviewHash({id:record.id,shop,customerGid,quantity:record.quantity,snapshot:saved})!==record.snapshotHash||saved.unitPriceMinor!==unitPriceMinor)throw new BundleBindingError('Bundle review snapshot or price differs');
 if(record.state==='ORDERED'){
  if(record.orderGid!==orderGid||record.orderLineGid!==orderLineGid)throw new BundleBindingError('Bundle review already belongs to another order');
  return record;
 }
 if(record.state!=='REVIEWED'||record.orderGid!==null||record.orderLineGid!==null||JSON.stringify(saved)!==JSON.stringify(currentSnapshot))throw new BundleBindingError('Bundle catalogue changed or review unavailable');
 const claimed=await tx.bundlePurchaseReview.updateMany({where:{id:record.id,shop,customerGid,state:'REVIEWED',orderGid:null,orderLineGid:null,snapshotHash:reviewHash},data:{state:'ORDERED',orderGid,orderLineGid}});
 if(claimed.count!==1)throw new BundleBindingError('Bundle review changed before order binding');
 return tx.bundlePurchaseReview.findUniqueOrThrow({where:{id:record.id}});
}
