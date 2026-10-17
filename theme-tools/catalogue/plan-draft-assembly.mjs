import {createHash} from 'node:crypto';
import {reviewMerchantCatalogue} from './review-merchant.mjs';
const digest = value => createHash('sha256').update(value).digest('hex').slice(0,16);
const money = value => (value/100).toFixed(2);
// Creates a review plan only. Native execution must re-read these exact draft
// owners, preserve all unrelated records, and read back every reference.
export function planMerchantDraftAssembly(manifest,native,bindings) {
  const review=reviewMerchantCatalogue(manifest,native,bindings,{draftReview:true});
  if(review.unresolved.length)throw Error('Every merchant component must have an explicit mapping');
  const variants=new Map(native.products.nodes.flatMap(product=>product.variants.nodes.map(variant=>[variant.id,{product,variant}])));
  const objects=new Map(),attachments=[];
  for(const record of review.records){
    const handle=`pm-merchant-${record.kind}-${digest(record.title)}`;
    const candidates=native.products.nodes.filter(product=>product.handle===handle);
    if(candidates.length!==1)throw Error('Managed draft package missing or ambiguous');
    const product=candidates[0],subscription=record.kind==='subscription';
    if(product.status!=='DRAFT'||product.title!==record.title||!product.tags?.includes('pm-merchant-20261015')||product.requiresSellingPlan!==subscription||product.variants.pageInfo?.hasNextPage!==false)throw Error('Package no longer matches staged draft evidence');
    const fields=Object.fromEntries((product.metafields?.nodes||[]).filter(field=>field.namespace==='performance').map(field=>[field.key,field.value]));
    if(product.isGiftCard!==false||fields.business_stream!=='ready_series'||fields.meal_count!==String(record.itemsPerDelivery)||fields.delivery_included!==String(subscription))throw Error('Package classification or entitlement evidence differs');
    const actual=product.variants.nodes;
    if(subscription){
      if(actual.length!==2||record.terms.some(term=>actual.filter(variant=>variant.price===money(term.upfrontMinor)&&variant.selectedOptions?.some(option=>option.name==='Term'&&option.value===`${term.months} months`)).length!==1))throw Error('Approved prepaid term/price mapping differs');
    }else if(actual.length!==1||actual[0].price!==money(record.purchasePriceMinor))throw Error('Approved bundle price differs');
    const handles=record.contents.map(component=>{
      const evidence=variants.get(component.variantGid);
      const key=`pm-merchant-component-${digest([review.version,component.name,component.variantGid,component.quantity].join('|'))}`;
      const object={handle:key,type:'performance_bundle_item',fields:[
        {key:'label',value:component.name},{key:'variant',value:component.variantGid},
        {key:'product',value:evidence.product.id},{key:'quantity',value:String(component.quantity)},
        {key:'business_stream',value:'ready_series'},
      ]};
      if(objects.has(key)&&JSON.stringify(objects.get(key))!==JSON.stringify(object))throw Error('Component key collision');
      objects.set(key,object);return key;
    });
    for(const owner of [product.id,...actual.map(variant=>variant.id)]){
      if(!/^gid:\/\/shopify\/(?:Product|ProductVariant)\/\d+$/.test(owner))throw Error('Invalid native package owner');
      attachments.push({ownerId:owner,productGid:product.id,title:record.title,componentHandles:handles,itemsPerDelivery:record.itemsPerDelivery});
    }
  }
  if(new Set(attachments.map(row=>row.ownerId)).size!==attachments.length)throw Error('Duplicate package owner');
  return {shop:review.shop,sourceDigest:review.sourceDigest,objects:[...objects.values()],attachments,readyForActivation:false,nativeWritesPerformed:false};
}
