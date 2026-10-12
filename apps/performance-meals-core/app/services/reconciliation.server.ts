import type {AdminApiContext} from '@shopify/shopify-app-react-router/server';
import db from '../db.server';
import {recordOrder} from './orders.server';
const QUERY=`#graphql
query PendingCheckouts($query:String!,$after:String){orders(first:50,after:$after,query:$query,sortKey:CREATED_AT){nodes{id lineItems(first:250){nodes{customAttributes{key value}}pageInfo{hasNextPage}}}pageInfo{hasNextPage endCursor}}}`;
type Page={nodes:Array<{id:string;lineItems:{nodes:Array<{customAttributes:Array<{key:string;value:string}>}>;pageInfo:{hasNextPage:boolean}}}>;pageInfo:{hasNextPage:boolean;endCursor:string}};
export async function reconcilePending(shop:string,admin:AdminApiContext,customerGid?:string){
 const pending=await db.mealPlanSelection.findMany({where:{shop,status:'REVIEWED',...(customerGid?{customerGid}:{})},select:{id:true,reviewedAt:true},orderBy:{reviewedAt:'asc'}});
 if(!pending.length) return 0;
 const ids=new Set(pending.map(p=>p.id));let after:string|null=null,count=0;
 const query=`created_at:>=${pending[0].reviewedAt.toISOString()}`;
 for(let page=0;page<20;page++){
  const response=await admin.graphql(QUERY,{variables:{query,after}});
  const body=await response.json() as {errors?:unknown;data?:{orders:Page}};
  if(body.errors||!body.data) throw new Error('Order reconciliation unavailable');
  for(const order of body.data.orders.nodes){
   if(order.lineItems.pageInfo.hasNextPage) throw new Error('Order line pagination requires review');
   if(order.lineItems.nodes.some(l=>l.customAttributes.some(p=>p.key==='_pm_selection_id'&&ids.has(p.value)))){
    await recordOrder(shop,order.id,`reconcile:${order.id}`,admin);count++;
   }
  }
  if(!body.data.orders.pageInfo.hasNextPage) return count;
  after=body.data.orders.pageInfo.endCursor;
 }
 throw new Error('Reconciliation limit reached; continue from the saved records');
}
