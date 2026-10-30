import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
const shop='batch-route.myshopify.com';
globalThis.batchRoute={authorized:true,shop,calls:[]};
await buildServices({entryPoints:['app/routes/app.programme-deliveries.tsx'],outdir:'.shopify/batch-route-test',bundle:true,packages:'external',format:'esm',platform:'node',plugins:[{name:'batch-route-fixtures',setup(b){
 b.onResolve({filter:/shopify\.server$/},()=>({path:'auth',namespace:'batch-fixture'}));
 b.onResolve({filter:/programme-deliveries\.server$/},()=>({path:'service',namespace:'batch-fixture'}));
 b.onResolve({filter:/programme-booking\.server$/},()=>({path:'booking',namespace:'batch-fixture'}));
 b.onResolve({filter:/db\.server$/},()=>({path:'db',namespace:'batch-fixture'}));
 b.onLoad({filter:/.*/,namespace:'batch-fixture'},a=>({loader:'js',contents:a.path==='auth'?`export const authenticate={admin:async()=>{const s=globalThis.batchRoute;if(!s.authorized)throw new Response(null,{status:401});return {session:{shop:s.shop,id:'authenticated-admin'},admin:{}};}};`:a.path==='booking'?`export const programmeBookingEnabled=()=>false;export const readProgrammeBookings=async()=>null;export const bookProgrammeBatch=async()=>{throw Error('disabled');};export const configureMealPlanSlot=bookProgrammeBatch;`:a.path==='db'?`export default {mealPlanSelection:{findMany:async()=>[]}};`:`export const programmeDishAllocationEnabled=()=>process.env.SIXTY_DAY_DISH_ALLOCATION_ENABLED==='true';export const readProgrammeDishChoices=async()=>({available:false});export const programmeDeliveryEnabled=()=>process.env.NODE_ENV!=='production'&&process.env.SIXTY_DAY_BATCHES_ENABLED==='true';export const listProgrammeDeliverySelections=async()=>({programmes:[],nextCursor:null});export const programmeDeliveryProgress=async()=>({available:false});export const planProgrammeDeliveryBatch=async(a,v)=>globalThis.batchRoute.calls.push(v);export const changeProgrammeDeliveryBatch=planProgrammeDeliveryBatch;`}));
}}]});
const {loader,action}=await import('../.shopify/batch-route-test/app.programme-deliveries.js');
process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID='programme';process.env.ALLOWED_SHOP=shop;process.env.SIXTY_DAY_BATCHES_ENABLED='true';
const post=(changes={})=>action({request:new Request('https://core.invalid/app/programme-deliveries',{method:'POST',body:new URLSearchParams({intent:'plan',selectionId:'programme',reference:'batch-1',weekdayMeals:'4',frozenMeals:'8',...changes})})});
test('admin authorization and correct store required for reads and writes',async()=>{
 globalThis.batchRoute.authorized=false;await assert.rejects(post(),e=>e.status===401);await assert.rejects(loader({request:new Request('https://core.invalid/app/programme-deliveries')}),e=>e.status===401);
 globalThis.batchRoute.authorized=true;globalThis.batchRoute.shop='foreign.myshopify.com';await assert.rejects(post(),e=>e.status===403);globalThis.batchRoute.shop=shop;
});
test('feature remains off by default and in production',async()=>{
 delete process.env.SIXTY_DAY_BATCHES_ENABLED;await assert.rejects(post(),e=>e.status===403);
 assert.equal((await loader({request:new Request('https://core.invalid/app/programme-deliveries')})).enabled,false);
 process.env.SIXTY_DAY_BATCHES_ENABLED='true';const old=process.env.NODE_ENV;process.env.NODE_ENV='production';await assert.rejects(post(),e=>e.status===403);process.env.NODE_ENV=old||'test';
});
test('strict form parsing and explicit dispatch confirmation prevent accidental operations',async()=>{
 const start=globalThis.batchRoute.calls.length;
 for(const edit of [{weekdayMeals:'-1'},{weekdayMeals:'1.5'},{weekdayMeals:'4x'},{intent:'dispatch',batchId:'owned',revision:'1'},{intent:'dispatch',batchId:'owned',revision:'-1',confirm:'yes'}])assert.ok((await post(edit)).error);
 assert.equal(globalThis.batchRoute.calls.length,start);
 await post({actor:'forged',shop:'foreign'});const saved=globalThis.batchRoute.calls.at(-1);assert.equal(saved.shop,shop);assert.match(saved.actor,/^shopify-admin:[a-f0-9]{64}$/);assert.equal(saved.weekdayMeals,4);
 await post({intent:'dispatch',batchId:'owned',revision:'1',confirm:'yes'});assert.equal(globalThis.batchRoute.calls.at(-1).action,'dispatch');
 await assert.rejects(action({request:new Request('https://core.invalid/app/programme-deliveries',{method:'DELETE'})}),e=>e.status===405);
});

test('an unknown selected programme cannot silently fall back to another customer record',async()=>{await assert.rejects(loader({request:new Request('https://core.invalid/app/programme-deliveries?programme=forged')}),e=>e.status===404);});


test('dish allocation form sends only server-authenticated ownership and rejects duplicate or malformed dish quantities',async()=>{
 process.env.SIXTY_DAY_DISH_ALLOCATION_ENABLED='true';const start=globalThis.batchRoute.calls.length,key='dish_'+'a'.repeat(64),menuHash='b'.repeat(64);
 for(const edit of [{menuHash:'bad'},{menuHash},{menuHash,[key]:'1.5'},{menuHash,[key]:'-1'},{menuHash,dish_unknown:'1'}])assert.ok((await post(edit)).error);
 assert.equal(globalThis.batchRoute.calls.length,start);await post({menuHash,[key]:'2',weekdayMeals:'88',frozenMeals:'32',actor:'forged'});const saved=globalThis.batchRoute.calls.at(-1);assert.equal(saved.weekdayMeals,0);assert.equal(saved.frozenMeals,0);assert.equal(saved.shop,shop);assert.deepEqual(saved.dishes,[{sourceKey:'a'.repeat(64),quantity:2}]);assert.match(saved.actor,/^shopify-admin:[a-f0-9]{64}$/);
 const body=new URLSearchParams({intent:'plan',selectionId:'programme',reference:'duplicate',menuHash,[key]:'1'});body.append(key,'1');assert.ok((await action({request:new Request('https://core.invalid/app/programme-deliveries',{method:'POST',body})})).error);delete process.env.SIXTY_DAY_DISH_ALLOCATION_ENABLED;
});
