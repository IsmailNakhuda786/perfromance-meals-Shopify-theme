import {bundleReviewHash,nativeRef,type BundleSnapshot} from './bundle-snapshot';

type Review={id:string;shop:string;customerGid:string;productGid:string;variantGid:string;quantity:number;currency:string;snapshot:string;snapshotHash:string;state:string;orderGid:string|null;orderLineGid:string|null};
export type BundleCheckoutApprovals={version:'bundle-review-approval-v1';customerGid:string;reviews:Array<{reviewId:string;reviewHash:string;productGid:string;variantGid:string;quantity:number}>};

// Local projection only. No Shopify writes or rollout are performed here.
// A stale native copy is NOT a single-use checkout permission: concurrent
// checkouts and revocation must be resolved before this candidate is enabled.
export function buildBundleCheckoutApprovals(shop:string,customerGid:string,rows:Review[]):BundleCheckoutApprovals{
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)||!nativeRef('Customer',customerGid)||!Array.isArray(rows)||rows.length>100)throw Error('Bundle approval context unavailable');
 const reviews:BundleCheckoutApprovals['reviews']=[],seen=new Set<string>();
 for(const row of rows){
  if(row.shop!==shop||row.customerGid!==customerGid||seen.has(row.id))throw Error('Bundle approval ownership differs');
  seen.add(row.id);
  if(row.state==='ORDERED'){
   if(!nativeRef('Order',row.orderGid)||!nativeRef('LineItem',row.orderLineGid))throw Error('Bundle approval binding unavailable');
   continue;
  }
  if(row.state!=='REVIEWED'||row.orderGid!==null||row.orderLineGid!==null||row.currency!=='SGD'||!nativeRef('Product',row.productGid)||!nativeRef('ProductVariant',row.variantGid))throw Error('Bundle approval state unavailable');
  const snapshot=JSON.parse(row.snapshot) as BundleSnapshot;
  if(snapshot.version!=='native-bundle-v1'||snapshot.productGid!==row.productGid||snapshot.variantGid!==row.variantGid||snapshot.currency!=='SGD'||bundleReviewHash({...row,snapshot})!==row.snapshotHash)throw Error('Bundle approval snapshot differs');
  reviews.push({reviewId:row.id,reviewHash:row.snapshotHash,productGid:row.productGid,variantGid:row.variantGid,quantity:row.quantity});
 }
 reviews.sort((a,b)=>a.reviewId.localeCompare(b.reviewId));
 const document:BundleCheckoutApprovals={version:'bundle-review-approval-v1',customerGid,reviews};
 if(Buffer.byteLength(JSON.stringify(document),'utf8')>32768)throw Error('Bundle approval document exceeds the verified limit');
 return document;
}
