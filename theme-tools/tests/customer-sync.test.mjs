import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {renderPage} from '../preview.mjs';
const pages=['/pages/ready-series','/pages/ready-series-about','/pages/meal-plan-about','/pages/meal-plan-stories'];
test('approved brand pages connect to shared commerce without prototype controls',async()=>{
 for(const route of pages){const $=load(await renderPage(route));assert.equal($('h1').length,1,route);assert.ok($('main').text().length>200,route);assert.ok($('a[href="/cart"]').length,route);assert.doesNotMatch($('body').text(),/QA Handoff|Download HTML|implementation note|prototype status/i,route);}
 const $=load(await renderPage(pages[0]));for(const suffix of ['ready-series','ready-series-bundles','ready-series-subscriptions'])assert.ok($(`main a[href="/collections/${suffix}"]`).length);
 const stories=load(await renderPage(pages[3]));assert.match(stories('main').text(),/Story content awaiting verified customer approvals/);assert.ok(stories('a[href="/pages/meal-plan-builder"]').length);
});
test('brand-context navigation distinguishes overview, order and stories',async()=>{
 const rs=load(await renderPage('/pages/ready-series-about'));assert.ok(rs('nav a[href="/pages/ready-series"]').length);assert.ok(rs('nav a[href="/collections/ready-series"]').length);
 const mp=load(await renderPage('/pages/meal-plan-about'));for(const path of ['meal-plan','meal-plan-about','meal-plan-builder','meal-plan-stories'])assert.ok(mp(`nav a[href="/pages/${path}"]`).length,path);
 assert.ok(mp('a[href="/account"]').length);assert.doesNotMatch(mp.html(),/from ["']react|vite\/client|createRoot/);
});

import {resolvePurchase} from '../../theme/assets/catalog-purchase.js';
test('unverified Ready Series terms cannot charge monthly installments',()=>{
 const variant={available:true,plans:[{id:1,recurring:true,price:'native allocation'}]};
 const model={purchaseMode:'subscription',hasContents:true,prepaidTermRequired:true,unavailablePrice:'Unavailable'};
 assert.equal(resolvePurchase(model,variant,1).canSubmit,false);
 assert.equal(resolvePurchase(model,variant,1).price,'Unavailable');
 assert.equal(resolvePurchase({...model,prepaidTermVerified:true},variant,1).canSubmit,true);
 assert.equal(resolvePurchase({...model,purchaseMode:'single'},variant,1).canSubmit,true);
});

test('approved contextual links exclude extra menus while shared routes remain',async()=>{
 const expected=[['/',['Our Brands','About Us']],['/pages/ready-series-about',['Overview','About','Order']],['/pages/meal-plan-about',['Overview','About','Order','Customer Stories']]];
 for(const [route,labels]of expected){
  const $=load(await renderPage(route));
  const nav=$('[data-pm-header]');
  assert.doesNotMatch(nav.text(),/Rewards|Gift Cards|Search|Storefront/);
  const desktop=nav.children('div').first().children('div').first();
  assert.deepEqual(desktop.children('a').map((_,el)=>$(el).text().trim()).get(),labels,route);
  const mobile=nav.find('[data-mobile-menu]');
  assert.deepEqual(mobile.find('a').filter((_,el)=>labels.includes($(el).text().trim())).map((_,el)=>$(el).text().trim()).get(),labels,route);
  if(route!=='/')assert.equal(nav.find('a[aria-current="page"]').length,2,route);
  assert.deepEqual($('footer nav a').map((_,el)=>$(el).text().trim()).get(),['Ready Series','Meal Plan','Gift Cards','About Us']);
 }
 for(const route of ['/pages/rewards','/pages/gift-card','/search?q=chicken'])assert.ok(load(await renderPage(route))('main').text().trim().length>100,route);
 const logged=load(await renderPage('/pages/ready-series',{loggedIn:true}));assert.equal(logged('[data-pm-header] a[href="/account/logout"]').length,2);
});

import {renderSection} from '../preview.mjs';
test('stale merchant staging menu cannot add unapproved customer navigation',async()=>{
 const settings={menu:{links:['Gift Cards','Search','Storefront'].map(title=>({title,url:'/collections/all'}))},rewards_url:'/pages/rewards'};
 const context={fixtures:{products:{},collections:{}},request:{path:'/',page_type:'index'},routes:{root_url:'/',cart_url:'/cart'},shop:{customer_accounts_enabled:false},cart:{item_count:0},settings:{}};
 const $=load(await renderSection('header',{type:'header',settings},context));
 assert.doesNotMatch($('[data-pm-header]').text(),/Rewards|Gift Cards|Search|Storefront/);
 assert.equal($('[data-pm-header] a[aria-current="page"]').length,2);
});

import {createFixtures} from '../fixtures.mjs';

test('approved catalogue removes extra search/sort/quick-view controls but keeps native cart forms',async()=>{
 for(const route of ['/collections/ready-series','/collections/ready-series-bundles','/collections/ready-series-subscriptions']){
  const $=load(await renderPage(route));
  assert.equal($('main [role="search"]').length,0,route);
  assert.equal($('main [data-catalog-filters]').length,0,route);
  assert.equal($('main a').filter((_,el)=>$(el).text().trim()==='Quick view').length,0,route);
  assert.ok($('main [data-product-form]').length,route);
  for(const form of $('main [data-product-form]').toArray())assert.ok($(form).find('[name="id"]').length,route);
 }
 const fixtures=createFixtures();
 for(const meal of fixtures.meals)meal.has_only_default_variant=true;
 const $=load(await renderPage('/collections/ready-series',{fixtures}));
 assert.equal($('main .pm-product-card .pm-macros').length,0);
 assert.match($('main .pm-product-card').text(),/g protein/);
 assert.ok($('main .pm-product-card button[type="submit"]').filter((_,el)=>$(el).text().trim()==='+ Add').length);
});

test('Meal Plan process remains visible independently of testimonial visibility', async()=>{
 const $=load(await renderPage('/pages/meal-plan'));
 assert.match($('main').text(),/The Process/);
 assert.match($('main').text(),/Choose your programme/);
});

test('dynamic Meal Plan labels decode ampersands before JSON serialization',async()=>{
 const $=load(await renderPage('/pages/meal-plan-builder'));
 const config=JSON.parse($('[data-meal-plan-config]').text());
 assert.ok(config.labels.steps.includes('Plan & Meals'));
 assert.doesNotMatch(JSON.stringify(config.labels),/&amp;/);
});

test('Gift Card presentation retains accessible native recipient fields and approved close action',async()=>{
 const $=load(await renderPage('/pages/gift-card'));
 assert.ok($('main a[aria-label="Close"][href="/"]').length);
 assert.match($('main aside').text(),/Order Summary/);
 for(const name of ['Recipient name','Recipient email','From','Message']){
  const input=$(`[name="properties[${name}]"]`);
  assert.ok(input.attr('placeholder'),name);
  assert.ok($(`label[for="${input.attr('id')}"]`).hasClass('sr-only'),name);
 }
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('Shopify CDN module import versions the prepaid guard dependency by content',()=>{
 const guard=readFileSync(new URL('../../theme/assets/catalog-purchase.js',import.meta.url));
 const hash=createHash('sha256').update(guard).digest('hex').slice(0,12);
 const entry=readFileSync(new URL('../../theme/assets/catalog.js',import.meta.url),'utf8');
 assert.ok(entry.includes(`./catalog-purchase.js?v=${hash}`));
});

// Guard regressions that previously hid anonymous content or broke Tailwind selectors.
test('all approved programme links and anonymous rewards information remain visible', async()=>{
 const $=load(await renderPage('/pages/meal-plan'));
 for(const name of ['Biweekly','Monthly','2 Months','6 by 60','6 by 60 Plus']) assert.ok($('main a[href*="programme="]').filter((_,el)=>$(el).text().includes(name)).length,name);
 const rewards=load(await renderPage('/pages/rewards'));
 assert.match(rewards('main').text(),/500/);
 assert.match(rewards('main').text(),/10 points = .*1\.00/);
 assert.doesNotMatch(rewards('main').text(),/90.day|Platinum|Gold tier|Starter tier/);
 assert.doesNotMatch(rewards('main').text(),/Start Earning|200 points/);
});
test('palette generation preserves escaped CSS selectors',()=>{
 const css=readFileSync(new URL('../../theme/assets/theme.css',import.meta.url),'utf8');
 assert.ok(css.includes('.bg-\\[\\#1A1A1A\\]'));
 assert.equal(css.includes('\\var('),false);
});

test('approved home experiences retain distinct source image associations',async()=>{
 const $=load(await renderPage('/'));const images=$('main .pm-experience-card img');
 assert.equal(images.length,2);assert.notEqual(images.eq(0).attr('src'),images.eq(1).attr('src'));
 assert.equal(images.eq(0).attr('alt'),'Ready Series for everyday routines');
});
