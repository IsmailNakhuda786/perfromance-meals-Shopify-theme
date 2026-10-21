// Isolated browser contract checks. No Shopify traffic, orders or balances.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true, channel:process.env.PM_TEST_BROWSER_CHANNEL || 'chrome'});
try {
 const page=await browser.newPage();
 const context={currency:'SGD',productGid:'gid://shopify/Product/201',variants:[{variantGid:'gid://shopify/ProductVariant/2010',unitPriceMinor:10980,itemsPerBundle:14,components:[{componentGid:'gid://shopify/Metaobject/501',productGid:'gid://shopify/Product/101',variantGid:'gid://shopify/ProductVariant/1010',quantity:14}]}]};
 let quantity=1, mode='success', adds=[],changes=[],posts=[];
 const review=q=>({id:'89c93404-412e-4c81-851e-943100135808',hash:'a'.repeat(64),quantity:q,snapshot:{version:'native-bundle-v1',currency:'SGD',productGid:context.productGid,...context.variants[0],unitPriceMinor:mode==='changed'?10000:10980}});
 const line=()=>({key:'2010:key',variant_id:2010,quantity,properties:{'Delivery date':'2026-11-02',_other:'preserve'}});
 const cartHTML=()=>`<div data-cart-content><form id="PageCartForm" data-cart-form><div data-cart-line><script type="application/json" data-bundle-review-data>${JSON.stringify(context)}</script><input id="quantity" data-cart-quantity data-key="2010:key" type="number" min="0" step="1" value="${quantity}" name="updates[]"></div><p data-cart-error hidden></p><button name="checkout" type="submit">Checkout</button></form></div>`;
 const routes={bundleReviewEnabled:true,bundleReviewPath:'/apps/core/bundle-review',bundleReviewAsset:'/bundle-review.js',cart:'/cart',add:'/cart/add.js',change:'/cart/change.js',error:'Cart failed',bundleReviewUnavailable:'Review unavailable',bundleReviewChanged:'Bundle changed'};
 const html=()=>`<script id="ThemeRoutes" type="application/json">${JSON.stringify(routes)}</script><div id="shopify-section-main">${cartHTML()}</div><form data-product-form><input name="id" value="2010"><input name="quantity" value="1"><script type="application/json" data-bundle-review-data>${JSON.stringify(context)}</script><p data-form-error hidden></p><button id="add" type="submit">Add</button></form><script src="/theme.js"></script>`;
 await page.route('https://example.test/**',async route=>{const req=route.request(),url=new URL(req.url());let data;
 if(url.pathname==='/theme.js'||url.pathname==='/bundle-review.js')return route.fulfill({contentType:'text/javascript',body:await fs.readFile(new URL(`../theme/assets${url.pathname}`,import.meta.url),'utf8')});
 if(url.pathname==='/apps/core/bundle-review'){if(mode==='unauthorized')return route.fulfill({status:403,body:'Denied'});data=req.method()==='POST'?review(req.postDataJSON().quantity):{nonce:`1792590000.${'b'.repeat(64)}`};}
 else if(url.pathname==='/cart/add.js'){adds.push(req.postData());data={id:2010};}
 else if(url.pathname==='/cart/change.js'){const body=req.postDataJSON();changes.push(body);quantity=body.quantity;data={items:[line()],item_count:quantity};}
 else if(url.pathname==='/cart.js')data={items:[line()],item_count:quantity};
 else if(url.pathname==='/cart'&&url.searchParams.has('sections'))data={main:cartHTML()};
 else if(req.method()==='POST'){posts.push(req.postData());return route.fulfill({body:'<h1>Unpaid checkout fixture</h1>',contentType:'text/html'});}
 else return route.fulfill({contentType:'text/html',body:html()});
 return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('https://example.test/');
 await page.click('#add'); await page.waitForFunction(()=>!document.querySelector('#add').disabled);
 assert.equal(adds.length,1);assert.match(adds[0],/_pm_bundle_review_id/);
 mode='changed';await page.click('#add');await page.waitForFunction(()=>document.querySelector('[data-form-error]').textContent==='Bundle changed');assert.equal(adds.length,1);
 mode='unauthorized';await page.click('#add');await page.waitForFunction(()=>document.querySelector('[data-form-error]').textContent==='Review unavailable');assert.equal(adds.length,1);
 mode='success';await page.locator('#quantity').fill('2');await page.locator('#quantity').dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#quantity').value==='2'&&!document.querySelector('#quantity').disabled);
 assert.equal(changes.length,1);assert.equal(changes[0].quantity,2);assert.equal(changes[0].properties._other,'preserve');assert.equal(changes[0].properties['Delivery date'],'2026-11-02');assert.match(changes[0].properties._pm_bundle_review_hash,/^a{64}$/);
 await page.click('[name="checkout"]');await page.waitForURL('**/cart');assert.equal(posts.length,1);assert.match(posts[0],/checkout=/);assert.doesNotMatch(posts[0],/updates/);
 await page.goto('https://example.test/');
 // Enter submits without a blur/change event: the unsaved quantity must still
 // get its own review before the checkout POST.
 await page.locator('#quantity').fill('3');await page.locator('#quantity').press('Enter');await page.waitForURL('**/cart');
 assert.equal(changes.at(-1).quantity,3);assert.equal(posts.length,2);
 await page.goto('https://example.test/');mode='unauthorized';
 await page.locator('#quantity').fill('4');await page.locator('#quantity').press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-cart-error]').textContent==='Review unavailable');
 assert.equal(posts.length,2);assert.equal(quantity,3);
 console.log('PASS: add proof; changed catalogue blocked; sign-in failure blocked; quantity proof preserves properties; checkout omits stale updates. No external traffic.');
} finally {await browser.close();}
