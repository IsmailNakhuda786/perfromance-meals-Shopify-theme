import { createHash } from 'node:crypto';
import db from '../db.server';
import {assertShop} from './security.server';
import { catalog } from './catalog.server';
import {validateSelection,type DraftInput} from './menu-validation';
import type { AdminApiContext } from '@shopify/shopify-app-react-router/server';
export async function saveDraft(shop:string,customerGid:string,input:DraftInput,revision:number,admin:AdminApiContext) {
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw new Response('Customer sign-in required',{status:401});
 if(!Number.isSafeInteger(revision)||revision<0) throw new Response('Invalid revision',{status:400});
 const {programme,weeks}=await catalog(admin,input,shop);
 const normalized=validateSelection(input,programme,weeks);
 const data={programmeGid:normalized.programmeGid,variantGid:normalized.variantGid,sellingPlanGid:normalized.sellingPlanGid,startsOn:normalized.startsOn,endsOn:normalized.endsOn,selections:JSON.stringify(input.selections)};
 if(revision===0) {
  try {return await db.mealPlanDraft.create({data:{shop,customerGid,...data}});}catch {throw new Response('Draft changed; reload before saving',{status:409});}
 }
 return db.$transaction(async tx=>{
  const changed=await tx.mealPlanDraft.updateMany({where:{shop,customerGid,revision},data:{...data,revision:{increment:1}}});
  if(changed.count!==1) throw new Response('Draft changed; reload before saving',{status:409});
  return tx.mealPlanDraft.findUniqueOrThrow({where:{shop_customerGid:{shop,customerGid}}});
 });
}
export async function reviewDraft(shop:string,customerGid:string,revision:number,admin:AdminApiContext) {
 assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid))throw new Response('Customer sign-in required',{status:401});
 if(!Number.isSafeInteger(revision)||revision<1)throw new Response('Invalid review revision',{status:400});
 const draft=await db.mealPlanDraft.findUnique({where:{shop_customerGid:{shop,customerGid}}});
 if(!draft||draft.revision!==revision) throw new Response('Draft changed; reload before review',{status:409});
 const input={programmeId:draft.programmeGid,variantId:draft.variantGid,sellingPlanId:draft.sellingPlanGid||undefined,startMonday:draft.startsOn||undefined,selections:JSON.parse(draft.selections)};
 const {programme,weeks}=await catalog(admin,input,shop);const normalized=validateSelection(input,programme,weeks,true);
 const selections=JSON.stringify(normalized.windows),entitlement=normalized.entitlement?JSON.stringify(normalized.entitlement):null;
 const selectionHash=createHash('sha256').update(JSON.stringify({selections,startsOn:normalized.startsOn,endsOn:normalized.endsOn,entitlement})).digest('hex');
 const record=await db.$transaction(async tx=>{
  const current=await tx.mealPlanDraft.findUnique({where:{shop_customerGid:{shop,customerGid}}});
  if(!current||current.revision!==revision) throw new Response('Draft changed',{status:409});
  return tx.mealPlanSelection.create({data:{shop,customerGid,programmeGid:normalized.programmeGid,variantGid:normalized.variantGid,sellingPlanGid:normalized.sellingPlanGid,startsOn:normalized.startsOn,endsOn:normalized.endsOn,selections,entitlement,selectionHash,cutoffAt:normalized.cutoffAt}});
 });
 return {id:record.id,hash:record.selectionHash,startsOn:record.startsOn,endsOn:record.endsOn,entitlement:normalized.entitlement,windows:normalized.windows};
}
