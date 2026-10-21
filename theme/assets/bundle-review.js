const gid = (kind, value) => typeof value === 'string' && new RegExp(`^gid://shopify/${kind}/\\d+$`).test(value);
const integer = value => Number.isSafeInteger(value) && value > 0 && value <= 2147483647;
const fingerprint = components => JSON.stringify(components.map(part => [part.componentGid, part.productGid, part.variantGid, part.quantity]));
function validContents(parts) {
  return Array.isArray(parts) && parts.length > 0 && parts.length <= 100 && new Set(parts.map(part => part?.componentGid)).size === parts.length && parts.every(part => gid('Metaobject', part?.componentGid) && gid('Product', part.productGid) && gid('ProductVariant', part.variantGid) && integer(part.quantity));
}
export function bundleVariantContext(context, variantId) {
  if (context?.currency !== 'SGD' || !gid('Product', context?.productGid) || !Array.isArray(context.variants) || context.variants.length > 250 || new Set(context.variants.map(item => item?.variantGid)).size !== context.variants.length) throw Error('Invalid bundle context');
  const variantGid = `gid://shopify/ProductVariant/${variantId}`;
  const variant = context.variants.find(item => item?.variantGid === variantGid);
  if (!variant || !integer(variant.unitPriceMinor) || !integer(variant.itemsPerBundle) || !validContents(variant.components) || variant.components.reduce((sum, part) => sum + part.quantity, 0) !== variant.itemsPerBundle) throw Error('Invalid bundle context');
  return {productGid: context.productGid, variantGid, ...variant};
}
// The signed app proxy supplies customer identity. Browser data is only compared
// with the native review, never accepted by Core as catalogue or payment proof.
export async function prepareBundleCartReview({context, variantId, quantity, endpoint, origin, fetcher = fetch, unavailableMessage, changedMessage}) {
  const unavailable = unavailableMessage || 'We could not confirm this bundle. Please try again.';
  const changed = changedMessage || 'This bundle changed. Refresh the page to review its current meals and price.';
  let expected, url;
  try {
    if (!integer(quantity)) throw Error();
    expected = bundleVariantContext(context, variantId);
    if (!Number.isSafeInteger(expected.unitPriceMinor * quantity) || expected.unitPriceMinor * quantity > 2147483647 || expected.itemsPerBundle * quantity > 2147483647) throw Error();
    url = new URL(endpoint, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/apps/') || !url.pathname.endsWith('/bundle-review') || url.search || url.hash || url.username || url.password) throw Error();
  } catch { throw Error(unavailable); }
  let session, review;
  try {
    const options = {credentials: 'same-origin', cache: 'no-store', headers: {Accept: 'application/json'}};
    const nonceResponse = await fetcher(url.href, options);
    if (!nonceResponse.ok) throw Error();
    session = await nonceResponse.json();
    if (typeof session?.nonce !== 'string' || !/^\d{10}\.[a-f0-9]{64}$/.test(session.nonce)) throw Error();
    const response = await fetcher(url.href, {...options, method: 'POST', headers: {...options.headers, 'Content-Type': 'application/json'}, body: JSON.stringify({nonce: session.nonce, productGid: expected.productGid, variantGid: expected.variantGid, quantity})});
    if (!response.ok) throw Error();
    review = await response.json();
  } catch { throw Error(unavailable); }
  const snapshot = review?.snapshot;
  if (typeof review?.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(review.id) || typeof review.hash !== 'string' || !/^[a-f0-9]{64}$/.test(review.hash) || review.quantity !== quantity || snapshot?.version !== 'native-bundle-v1' || snapshot.productGid !== expected.productGid || snapshot.variantGid !== expected.variantGid || snapshot.currency !== 'SGD' || snapshot.unitPriceMinor !== expected.unitPriceMinor || snapshot.itemsPerBundle !== expected.itemsPerBundle || !validContents(snapshot.components) || fingerprint(snapshot.components) !== fingerprint(expected.components)) throw Error(changed);
  return {reviewId: review.id, properties: {_pm_bundle_review_id: review.id, _pm_bundle_review_hash: review.hash}};
}
