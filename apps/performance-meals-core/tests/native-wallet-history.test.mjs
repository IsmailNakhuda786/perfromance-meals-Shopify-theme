import test from 'node:test';
import assert from 'node:assert/strict';
import {buildServices} from './support/database.mjs';
await buildServices({entryPoints:['app/services/native-wallet-history.server.ts'],outdir:'.shopify/wallet-history-test',bundle:true,packages:'external',format:'esm',platform:'node'});
const {readNativeWalletHistory,WALLET_ACCOUNTS_QUERY,WALLET_ACCOUNT_HISTORY_QUERY}=await import('../.shopify/wallet-history-test/native-wallet-history.server.js');
const shop='history-fixture.myshopify.com',customer='gid://shopify/Customer/1101',account='gid://shopify/StoreCreditAccount/1102';process.env.ALLOWED_SHOP=shop;
const receipt=n=>({id:`gid://shopify/StoreCreditAccountDebitTransaction/${1200+n}`,createdAt:new Date(Date.UTC(2026,0,1,0,n)).toISOString(),event:'ORDER_PAYMENT',amount:{amount:'-1.00',currencyCode:'SGD'},origin:null});
const response=data=>new Response(JSON.stringify({data:{shop:{myshopifyDomain:shop},...data}}));
test('customer history beyond 100 receipts reads every page before reconciliation',async()=>{
 const requests=[];
 const admin={graphql:async(query,{variables})=>{
  requests.push(variables);
  if(query===WALLET_ACCOUNTS_QUERY)return response({customer:{id:customer,storeCreditAccounts:{nodes:[{id:account}],pageInfo:{hasNextPage:false,endCursor:null}}}});
  assert.equal(query,WALLET_ACCOUNT_HISTORY_QUERY);
  return response({storeCreditAccount:{id:account,owner:{id:customer},transactions:{nodes:variables.after?[receipt(100)]:Array.from({length:100},(_,n)=>receipt(n)),pageInfo:{hasNextPage:!variables.after,endCursor:variables.after?null:'page-2'}}}});
 }};
 const receipts=await readNativeWalletHistory(admin,shop,customer);
 assert.equal(receipts.length,101);assert.equal(requests[2].after,'page-2');assert.equal(receipts[100].id,receipt(100).id);
});
test('foreign account ownership, broken pagination and duplicate receipts fail closed',async()=>{
 for(const mode of ['foreign','cursor','duplicate']){
  const admin={graphql:async(query,{variables})=>{
   if(query===WALLET_ACCOUNTS_QUERY)return response({customer:{id:customer,storeCreditAccounts:{nodes:[{id:account}],pageInfo:{hasNextPage:false,endCursor:null}}}});
   return response({storeCreditAccount:{id:account,owner:{id:mode==='foreign'?'gid://shopify/Customer/999':customer},transactions:{nodes:mode==='cursor'?[]:[receipt(0)],pageInfo:{hasNextPage:mode!=='foreign',endCursor:'same-cursor'}}}});
  }};
  await assert.rejects(readNativeWalletHistory(admin,shop,customer));
 }
});
test('account-list pagination retains customer ownership and complete receipt boundaries',async()=>{
 const second='gid://shopify/StoreCreditAccount/1103';let accountsRead=0;
 const admin={graphql:async(query,{variables})=>{
  if(query===WALLET_ACCOUNTS_QUERY)return response({customer:{id:customer,storeCreditAccounts:{nodes:[{id:variables.after?second:account}],pageInfo:{hasNextPage:!variables.after,endCursor:variables.after?null:'second-account-page'}}}});
  accountsRead++;return response({storeCreditAccount:{id:variables.id,owner:{id:customer},transactions:{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}}}});
 }};
 assert.deepEqual(await readNativeWalletHistory(admin,shop,customer),[]);assert.equal(accountsRead,2);
});
test('same-time debit/refund retains native cursor ordering instead of sorting by GID type',async()=>{
 const debit=receipt(0),refund={...debit,id:'gid://shopify/StoreCreditAccountCreditTransaction/9999',event:'ORDER_REFUND',amount:{amount:'1.00',currencyCode:'SGD'}};
 const admin={graphql:async query=>query===WALLET_ACCOUNTS_QUERY?response({customer:{id:customer,storeCreditAccounts:{nodes:[{id:account}],pageInfo:{hasNextPage:false,endCursor:null}}}}):response({storeCreditAccount:{id:account,owner:{id:customer},transactions:{nodes:[debit,refund],pageInfo:{hasNextPage:false,endCursor:null}}}})};
 assert.deepEqual((await readNativeWalletHistory(admin,shop,customer)).map(r=>r.id),[debit.id,refund.id]);
});
