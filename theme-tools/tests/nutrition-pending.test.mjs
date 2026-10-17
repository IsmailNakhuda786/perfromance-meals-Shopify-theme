import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {createFixtures} from '../fixtures.mjs';
import {renderPage} from '../preview.mjs';

test('unverified serving basis hides recorded macros on detail and catalogue without altering source data',async()=>{
 const fixtures=createFixtures();
 const product=fixtures.products['grilled-chicken'];
 const original=structuredClone(product.metafields.performance);
 product.metafields.performance.nutrition_pending={value:true};
 const detail=load(await renderPage('/products/grilled-chicken',{fixtures}));
 assert.equal(detail('[data-nutrition-pending]').length>0,true);
 assert.equal(detail('.pm-macros,.pm-nutrition').length,0);
 assert.doesNotMatch(detail('#ProductNutrition-main').text(),/per serving/i);
 const catalogue=load(await renderPage('/collections/ready-series',{fixtures}));
 const card=catalogue('[data-product-card]').filter((_,e)=>catalogue(e).find('a[href="/products/grilled-chicken"]').length>0).first();
 assert.equal(card.find('[data-nutrition-pending]').length,1);
 assert.doesNotMatch(card.text(),/42g protein|460 cal/);
 assert.deepEqual(product.metafields.performance.protein_g,original.protein_g);
 assert.deepEqual(product.metafields.performance.calories_kcal,original.calories_kcal);
 product.metafields.performance.nutrition_pending={value:false};
 const confirmed=load(await renderPage('/products/grilled-chicken',{fixtures}));
 assert.equal(confirmed('[data-nutrition-pending]').length,0);
 assert.ok(confirmed('.pm-macros,.pm-nutrition').length>0);
});


test('confirmed serving fields display merchant values and omit zero-weight placeholders',async()=>{
 const fixtures=createFixtures(),fields=fixtures.products['grilled-chicken'].metafields.performance;
 fields.nutrition_basis={value:'Per 100g'};fields.serving_weight_g={value:'350.5'};fields.servings_per_container={value:'1'};
 let detail=load(await renderPage('/products/grilled-chicken',{fixtures}));
 assert.match(detail('#ProductNutrition-main').text(),/Per 100g/);
 assert.match(detail('#ProductNutrition-main').text(),/Serving weight: 350.5g/);
 assert.match(detail('#ProductNutrition-main').text(),/Servings per container: 1/);
 fields.serving_weight_g={value:'0.0'};fields.servings_per_container={value:'0'};
 detail=load(await renderPage('/products/grilled-chicken',{fixtures}));
 assert.doesNotMatch(detail('#ProductNutrition-main').text(),/Serving weight|Servings per container/);
});
