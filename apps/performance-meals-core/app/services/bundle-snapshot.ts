import {createHash} from 'node:crypto';

type Field={type:string;value:string};
type FoodProduct={__typename:'Product';id:string;status:string;isGiftCard:boolean;requiresSellingPlan:boolean;stream:Field|null};
type FoodVariant={__typename:'ProductVariant';id:string;product:FoodProduct};
type Component={id:string;type:string;fields:{key:string;value:string;reference:FoodProduct|FoodVariant|null}[]};
type Contents=Field&{references:{nodes:Component[];pageInfo:{hasNextPage:boolean}}};
export type NativeBundleVariant={id:string;price:string;contents:Contents|null;product:{id:string;status:string;isGiftCard:boolean;requiresSellingPlan:boolean;stream:Field|null;mealCount:Field|null;contents:Contents|null}};
export type BundleSnapshot={version:'native-bundle-v1';productGid:string;variantGid:string;currency:'SGD';unitPriceMinor:number;itemsPerBundle:number;components:{componentGid:string;productGid:string;variantGid:string;quantity:number;label:string}[]};
export const nativeRef=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
const positive=(value:string)=>{if(typeof value!=='string'||!/^\d+$/.test(value))throw Error('Bundle quantity unavailable');const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>2147483647)throw Error('Bundle quantity unavailable');return n;};
const food=(product:FoodProduct|NativeBundleVariant['product'],draftAllowed:boolean)=>nativeRef('Product',product?.id)&&product.isGiftCard===false&&product.requiresSellingPlan===false&&product.stream?.type==='single_line_text_field'&&product.stream.value==='ready_series'&&(product.status==='ACTIVE'||draftAllowed&&product.status==='DRAFT');
export function bundleUnitPrice(value:string){
 if(typeof value!=='string'||!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value))throw Error('Bundle price unavailable');
 const [whole,fraction='']=value.split('.'),n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(n<1n||n>2147483647n)throw Error('Bundle price unavailable');return Number(n);
}
// Native catalogue evidence only. No client labels/quantities or inferred dishes.
// Variant contents override product defaults, matching the current storefront.
export function snapshotNativeBundle(variant:NativeBundleVariant,expected:{productGid:string;variantGid:string;currency:string;draftAllowed?:boolean}):BundleSnapshot{
 if(expected.currency!=='SGD'||!nativeRef('Product',expected.productGid)||!nativeRef('ProductVariant',expected.variantGid)||variant?.id!==expected.variantGid||variant.product?.id!==expected.productGid||!food(variant.product,expected.draftAllowed===true))throw Error('Native bundle identity differs');
 if(variant.product.mealCount?.type!=='number_integer')throw Error('Bundle meal count unavailable');
 const count=positive(variant.product.mealCount.value);
 let contents=variant.contents??variant.product.contents;
 // Liquid's default filter falls back for an empty native reference list.
 if(variant.contents?.type==='list.metaobject_reference'){let refs:unknown;try{refs=JSON.parse(variant.contents.value);}catch{throw Error('Bundle references unavailable');}if(Array.isArray(refs)&&refs.length===0)contents=variant.product.contents;}
 if(contents?.type!=='list.metaobject_reference'||contents.references?.pageInfo?.hasNextPage!==false||!Array.isArray(contents.references.nodes)||!contents.references.nodes.length||contents.references.nodes.length>100)throw Error('Complete native bundle contents required');
 let ids:unknown;try{ids=JSON.parse(contents.value);}catch{throw Error('Bundle references unavailable');}
 if(!Array.isArray(ids)||ids.length!==contents.references.nodes.length||new Set(ids).size!==ids.length||ids.some(id=>!nativeRef('Metaobject',id))||new Set(contents.references.nodes.map(node=>node?.id)).size!==ids.length)throw Error('Bundle references differ');
 const components=ids.map(id=>{
  const component=contents.references.nodes.find(node=>node?.id===id);
  if(!component||component.type!=='performance_bundle_item'||!Array.isArray(component.fields)||new Set(component.fields.map(f=>f?.key)).size!==component.fields.length)throw Error('Bundle component unavailable');
  const field=(key:string)=>component.fields.find(f=>f?.key===key);
  const product=field('product'),variation=field('variant'),label=field('label')?.value,quantity=positive(field('quantity')?.value??'');
  const productRef=product?.reference,variantRef=variation?.reference;
  if(productRef?.__typename!=='Product'||variantRef?.__typename!=='ProductVariant'||product?.value!==productRef.id||variation?.value!==variantRef.id||!nativeRef('ProductVariant',variantRef.id)||variantRef.product?.id!==productRef.id||!food(productRef,expected.draftAllowed===true)||!food(variantRef.product,expected.draftAllowed===true)||field('business_stream')?.value!=='ready_series'||typeof label!=='string'||!label.trim()||label.length>500||[...label].some(c=>c.charCodeAt(0)<32))throw Error('Bundle component product or quantity differs');
  return {componentGid:component.id,productGid:productRef.id,variantGid:variantRef.id,quantity,label};
 });
 const total=components.reduce((sum,c)=>sum+c.quantity,0);
 if(!Number.isSafeInteger(total)||total!==count)throw Error('Bundle contents do not match the stated meal count');
 return {version:'native-bundle-v1',productGid:variant.product.id,variantGid:variant.id,currency:'SGD',unitPriceMinor:bundleUnitPrice(variant.price),itemsPerBundle:count,components};
}
export function bundleReviewHash(review:{id:string;shop:string;customerGid:string;quantity:number;snapshot:BundleSnapshot}){
 if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(review.shop)||!nativeRef('Customer',review.customerGid)||typeof review.id!=='string'||!review.id||review.id.length>100||!Number.isSafeInteger(review.quantity)||review.quantity<1||!Number.isSafeInteger(review.snapshot.itemsPerBundle*review.quantity)||review.snapshot.itemsPerBundle*review.quantity>2147483647||!Number.isSafeInteger(review.snapshot.unitPriceMinor*review.quantity)||review.snapshot.unitPriceMinor*review.quantity>2147483647)throw Error('Bundle review context unavailable');
 return createHash('sha256').update(JSON.stringify([review.id,review.shop,review.customerGid,review.quantity,review.snapshot])).digest('hex');
}
