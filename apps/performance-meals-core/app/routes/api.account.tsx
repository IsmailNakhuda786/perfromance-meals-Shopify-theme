import type {LoaderFunctionArgs} from 'react-router';
import {authenticate,unauthenticated} from '../shopify.server';
import {accountProgrammeNames,accountMealNames} from '../services/account-programmes.server';
import {assertShop,privateHeaders} from '../services/security.server';
import db from '../db.server';
import {readWalletLedger} from '../services/wallet-ledger.server';
import {reconcilePending} from '../services/reconciliation.server';
import {programmeMenuBlock} from '../services/programme-period';
import {readNativeWallet} from '../services/native-wallet.server';
import {reconcileNativeWalletDebits} from '../services/native-wallet-debits.server';
import {auditWalletTopUps} from '../services/wallet-top-up-reconciliation.server';
export async function loader({request}:LoaderFunctionArgs){
 const {sessionToken,cors}=await authenticate.public.customerAccount(request);
 const shop=sessionToken.dest.replace(/^https:\/\//,'').replace(/\/$/,'');assertShop(shop);
 const customerGid=sessionToken.sub;
 if(!customerGid||!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)) return cors(new Response('Customer sign-in required',{status:401}));
 try {
 let reconciliationPending=false;
 let admin;
 try {
  ({admin}=await unauthenticated.admin(shop));
  await reconcilePending(shop,admin,customerGid);
 } catch { reconciliationPending=true; }
 const plans=await db.mealPlanSelection.findMany({where:{shop,customerGid},orderBy:{createdAt:'desc'},take:50,select:{id:true,status:true,startsOn:true,endsOn:true,selections:true,orderGid:true,contractGid:true,reviewedAt:true,programmeGid:true,variantGid:true}});
 let names=new Map<string,{programmeTitle:string;variantTitle:string}>();
 if(plans.length && admin) {
  try {names=await accountProgrammeNames(admin,plans);} catch { /* Saved selections remain available when catalogue metadata cannot be read. */ }
 }
 let walletHistoryPending=!admin;
 if(admin){try{await reconcileNativeWalletDebits(admin,shop,customerGid);}catch{walletHistoryPending=true;}}
 if(admin){try{if((await auditWalletTopUps(admin,shop,customerGid)).pending)walletHistoryPending=true;}catch{walletHistoryPending=true;}}
 const wallets=await db.customerWallet.findMany({where:{shop,customerGid},select:{currency:true,fundedBalance:true,bonusBalance:true,fundedReserved:true,bonusReserved:true}});
 let nativeWallet=null;
 if(admin){try{nativeWallet=await readNativeWallet(admin,shop,customerGid);}catch{ /* Never substitute a cached ledger balance for a failed native read. */ }}
 if(nativeWallet&&(wallets.find(wallet=>wallet.currency===nativeWallet.currency)?.fundedBalance||0)!==nativeWallet.balanceMinor)walletHistoryPending=true;
 const params=new URL(request.url).searchParams,ledgerCurrency=params.get('walletCurrency'),ledgerAfter=params.get('walletAfter');
 if((ledgerAfter&&!ledgerCurrency)||(ledgerCurrency&&!wallets.some(wallet=>wallet.currency===ledgerCurrency))||(ledgerAfter&&ledgerAfter.length>100))return cors(Response.json({error:'Invalid wallet history request'},{status:400,headers:privateHeaders}));
 let walletLedger;
 try{walletLedger=await Promise.all(wallets.filter(wallet=>!ledgerCurrency||wallet.currency===ledgerCurrency).map(wallet=>readWalletLedger(shop,customerGid,wallet.currency,ledgerAfter||undefined)));}
 catch(error){if(error instanceof Error&&error.message==='Invalid ledger cursor')return cors(Response.json({error:'Invalid wallet history request'},{status:400,headers:privateHeaders}));throw error;}
 const policy=await db.commercePolicy.findUnique({where:{shop},select:{walletEnabled:true,rewardsEnabled:true,giftCardClaimsEnabled:true}});
 const revisions=await db.mealPlanMenuRevision.findMany({where:{shop,customerGid,selectionId:{in:plans.map(p=>p.id)},state:'SAVED'},orderBy:{revision:'desc'}});
 let mealNames=new Map<string,string>();
 const menuWindows=[...plans.map(p=>JSON.parse(p.selections)),...revisions.map(r=>JSON.parse(r.selections))].flat();
 if(admin) {try {mealNames=await accountMealNames(admin,menuWindows.flatMap(w=>w.meals.map((m:{productGid:string})=>m.productGid)));}catch { /* Native names are never replaced with invented labels. */ }}
 const withMealNames=(windows:Array<{meals:Array<{productGid:string;quantity:number}>}>)=>windows.map(window=>({...window,meals:window.meals.map(meal=>({...meal,name:mealNames.get(meal.productGid)}))}));
 return cors(Response.json({nativeWallet,walletHistoryPending,wallets,walletLedger,reconciliationPending,walletEnabled:policy?.walletEnabled||false,giftCardClaimsEnabled:policy?.giftCardClaimsEnabled||false,rewardsEnabled:policy?.rewardsEnabled||false,plans:plans.map(p=>({id:p.id,status:p.status,startsOn:p.startsOn,endsOn:p.endsOn,orderGid:p.orderGid,contractGid:p.contractGid,reviewedAt:p.reviewedAt,...names.get(p.variantGid),selections:JSON.parse(p.selections),menus:p.startsOn&&p.status==='ORDERED'?[0,1,2].map(block=>{
  const saved=revisions.find(r=>r.selectionId===p.id&&r.block===block);
  const period=programmeMenuBlock(p.startsOn!,block);
  return {...period,block,state:saved?'SAVED':block===0?'SAVED':'NOT_SELECTED',selections:withMealNames(saved?JSON.parse(saved.selections):block===0?JSON.parse(p.selections):[]),url:`https://${shop}/pages/meal-plan-builder?selection=${encodeURIComponent(p.id)}&block=${block}`};
 }):[]}))},{headers:privateHeaders}));
 } catch {
  return cors(Response.json({error:"Your account information is temporarily unavailable. Please try again later."},{status:503,headers:privateHeaders}));
 }
}
