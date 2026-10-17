import {createHash} from 'node:crypto';
const normalizedName=value=>typeof value==='string'?value.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/[“”]/g,'"').replace(/’/g,"'").replace(/\s+/g,' ').trim().toLowerCase():null;

// Initial catalogue setup only: these prices become ordinary editable Shopify data.
// Re-read native owners immediately before execution; never apply to active products.
export function planIndividualPrices(source,native) {
  if(native.shop?.myshopifyDomain!=='performance-meals-development.myshopify.com'||native.shop.currencyCode!=='SGD'||native.products?.pageInfo?.hasNextPage!==false)throw Error('Incomplete development catalogue');
  if(source.version!=='fresher-individual-prices-20261016'||!Array.isArray(source.prices)||!source.prices.length)throw Error('Unreviewed price source');
  const seen=new Set(),sourceIds=new Set();
  return source.prices.map(row=>{
    if(typeof row.title!=='string'||!row.title.trim()||seen.has(row.title)||row.currency!=='SGD'||!Number.isSafeInteger(row.priceMinor)||row.priceMinor<=0||!Number.isSafeInteger(row.sourceProductId)||row.sourceProductId<=0)throw Error('Invalid or duplicate price evidence');
    const url=new URL(row.sourceUrl);if(url.protocol!=='https:'||url.hostname!=='fresher.com.sg'||!url.pathname.startsWith('/product/')||url.username||url.password||url.search||url.hash)throw Error('Unexpected price source');
    if(normalizedName(row.title)!==normalizedName(row.sourceName)||sourceIds.has(row.sourceProductId))throw Error('Source dish match differs or is reused');
    seen.add(row.title);sourceIds.add(row.sourceProductId);
    const handle='pm-merchant-'+createHash('sha256').update(row.title).digest('hex').slice(0,16);
    const matches=native.products.nodes.filter(p=>p.handle===handle);
    if(matches.length!==1)throw Error('Draft owner missing or ambiguous');
    const p=matches[0],v=p.variants?.nodes;
    if(p.title!==row.title||p.status!=='DRAFT'||!p.tags?.includes('pm-merchant-20261015')||p.isGiftCard!==false||p.requiresSellingPlan!==false||p.variants.pageInfo?.hasNextPage!==false||v?.length!==1||!/^gid:\/\/shopify\/Product\/\d+$/.test(p.id)||!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(v[0].id))throw Error('Draft ownership differs');
    const price=(row.priceMinor/100).toFixed(2);
    if(v[0].price!=='0.00'&&v[0].price!==price)throw Error('Existing price differs; manual review required');
    return {productId:p.id,variantId:v[0].id,title:row.title,priorPrice:v[0].price,price,needsUpdate:v[0].price!==price};
  });
}
