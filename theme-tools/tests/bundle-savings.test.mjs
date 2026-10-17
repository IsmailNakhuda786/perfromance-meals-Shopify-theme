import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {renderPage} from '../preview.mjs';
import {createFixtures} from '../fixtures.mjs';
test('bundle savings follow native component prices and hide incomplete comparisons',async()=>{
 const fixtures=createFixtures();
 const parts=fixtures.bundle.metafields.performance.bundle_contents.value;
 const expected=parts.reduce((sum,p)=>sum+p.variant.value.price*p.quantity.value,0)-fixtures.bundle.variants[0].price;
 assert.ok(expected>0);
 let $=load(await renderPage('/collections/ready-series-bundles',{fixtures}));
 assert.ok($('[data-bundle-savings]').text().includes((expected/100).toFixed(2)));
 assert.doesNotMatch($('[data-product-card]').text(),/\/meal|per meal/i);
 parts[0].variant.value.price=0;
 $=load(await renderPage('/collections/ready-series-bundles',{fixtures}));
 assert.equal($('[data-bundle-savings]').length,0);
});
