import {createHash} from 'node:crypto';

const gid = (value, type) => typeof value === 'string' && new RegExp(`^gid://shopify/${type}/\\d+$`).test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
// Read-only import preparation. Bindings are explicit reviewed dish-to-variant
// choices. Similar names, prototype components and missing evidence never fill
// gaps automatically. Native reads/writes belong to a separately reviewed step.
export function reviewMerchantCatalogue(manifest, native, bindings = {}, options = {}) {
  if (Object.keys(options).some(key => key !== 'draftReview') || (options.draftReview !== undefined && typeof options.draftReview !== 'boolean')) throw Error('Invalid catalogue review options');
  if (manifest?.version !== 'merchant-20261015' || manifest.currency !== 'SGD' || manifest.bundles?.length !== 13 || manifest.subscriptions?.length !== 8) throw Error('Incomplete approved merchant catalogue');
  if (native?.shop?.myshopifyDomain !== 'performance-meals-development.myshopify.com' || native.shop.currencyCode !== 'SGD' || !Array.isArray(native.products?.nodes)) throw Error('Development catalogue evidence required');
  if (native.products.pageInfo?.hasNextPage) throw Error('Complete native product evidence required');
  if (Object.keys(bindings).length && native.products.pageInfo?.hasNextPage !== false) throw Error('Verified native product pagination required for mappings');
  const variants = new Map();
  for (const product of native.products.nodes) {
    if (product.variants?.pageInfo?.hasNextPage) throw Error('Complete native variant evidence required');
    for (const variant of product.variants?.nodes || []) {
      if (!gid(variant.id, 'ProductVariant') || variants.has(variant.id)) throw Error('Duplicate or invalid native variant evidence');
      variants.set(variant.id, {product, variant});
    }
  }
  const names = new Set(), titles = new Set();
  for (const record of [...manifest.bundles, ...manifest.subscriptions]) {
    if (!record.title || titles.has(record.title) || record.gstIncluded !== true || !positive(record.itemsPerDelivery) || !Array.isArray(record.contents) || !record.contents.length || !/^[a-f0-9]{64}$/.test(record.source?.sha256 || '') || !positive(record.source?.slide)) throw Error('Invalid merchant record evidence');
    titles.add(record.title);
    let count = 0;
    for (const item of record.contents) {
      if (typeof item.name !== 'string' || !item.name.trim() || !positive(item.quantity)) throw Error('Invalid merchant component');
      count += item.quantity; names.add(item.name);
    }
    if (!Number.isSafeInteger(count) || count !== record.itemsPerDelivery) throw Error('Merchant component quantity differs from package entitlement');
    if (manifest.bundles.includes(record)) {
      if (!positive(record.purchasePriceMinor) || !positive(record.displayUnitMinor) || record.displayUnitMinor !== Math.round(record.purchasePriceMinor / count)) throw Error('Invalid approved bundle price');
    } else if (record.deliveryIncluded !== true || record.automaticTermRenewal !== true || record.comparisonOnlyOneMonth !== true || record.calendarRuleStatus !== 'MERCHANT_CLARIFICATION_PENDING' || record.terms?.length !== 2 || record.terms.some((term, index) => term.months !== [3, 6][index] || term.deliveries !== term.months || !positive(term.upfrontMinor))) {
      throw Error('Invalid approved prepaid terms');
    }
  }
  const resolved = new Map(), used = new Set(), unresolved = [];
  for (const name of Object.keys(bindings)) if (!names.has(name)) throw Error('Binding does not belong to the approved merchant catalogue');
  for (const name of [...names].sort()) {
    const id = bindings[name];
    if (!id) { unresolved.push({name, reason: 'Explicit native variant mapping required'}); continue; }
    const evidence = variants.get(id);
    const fields = evidence?.product.metafields?.nodes || [];
    const stream = fields.find(field => field.namespace === 'performance' && field.key === 'business_stream')?.value;
    const stagedDraft = options.draftReview === true && evidence?.product.status === 'DRAFT' && evidence.product.title === name && evidence.product.tags?.includes('pm-merchant-20261015');
    if (!evidence || evidence.product.variants?.pageInfo?.hasNextPage !== false || !gid(evidence.product.id, 'Product') || (evidence.product.status !== 'ACTIVE' && !stagedDraft) || evidence.product.isGiftCard !== false || evidence.product.requiresSellingPlan !== false || stream !== 'ready_series') throw Error('Mapped component is not a verified active one-time Ready Series food product');
    if (used.has(id)) throw Error('Different approved dishes cannot silently share one native variant');
    used.add(id); resolved.set(name, id);
  }
  const records = (kind, values) => values.map(record => ({
    kind, title: record.title, itemsPerDelivery: record.itemsPerDelivery,
    source: record.source,
    contents: record.contents.map(item => ({name: item.name, variantGid: resolved.get(item.name) || null, quantity: item.quantity})),
    ...(kind === 'bundle' ? {purchasePriceMinor: record.purchasePriceMinor, gstIncluded: true} : {terms: record.terms, deliveryIncluded: true, automaticTermRenewal: true, calendarPending: true}),
  }));
  return {
    version: manifest.version, shop: native.shop.myshopifyDomain, currency: 'SGD',
    sourceDigest: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
    nativeReadPerformed: false, nativeWritesPerformed: false, nativeEvidenceFreshnessVerified: false,
    draftReview: options.draftReview === true,
    distinctDishes: names.size, mappedDishes: resolved.size, unresolved,
    // Even complete component mappings are not payment/calendar/image acceptance.
    readyForActivation: false,
    records: [...records('bundle', manifest.bundles), ...records('subscription', manifest.subscriptions)],
  };
}
