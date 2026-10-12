import { gid, type DraftInput, type Programme, type MenuWeek } from './menu-validation';
export const CATALOG_QUERY = `#graphql
query ProgrammeCatalog($variantId: ID!) {
 productVariant(id:$variantId) {
  id availableForSale
  mealsPerDay: metafield(namespace:"performance",key:"meals_per_day"){jsonValue}
  sellingPlanGroups(first:50){nodes{sellingPlans(first:50){nodes{id}pageInfo{hasNextPage}}}pageInfo{hasNextPage}}
  product { id requiresSellingPlan purchasePolicy:metafield(namespace:"performance",key:"purchase_policy"){jsonValue} stream:metafield(namespace:"performance",key:"business_stream"){jsonValue} menuWeeks:metafield(namespace:"performance",key:"menu_weeks"){jsonValue} mealsPerDay:metafield(namespace:"performance",key:"meals_per_day"){jsonValue} }
 }
 metaobjects(type:"performance_menu_week",first:100){nodes{handle capabilities{publishable{status}} fields{key value references(first:50){pageInfo{hasNextPage}nodes{... on Product{id} ... on Metaobject{capabilities{publishable{status}} fields{key value references(first:50){pageInfo{hasNextPage}nodes{... on Product{id status}}}}}}}}}pageInfo{hasNextPage}}
}`;
type GraphQL = {graphql:(query:string,options?:{variables:Record<string,unknown>})=>Promise<Response>};
export async function catalog(admin:GraphQL,input:DraftInput) {
 const response=await admin.graphql(CATALOG_QUERY,{variables:{variantId:gid('ProductVariant',input.variantId)}});
 const body=await response.json();
 if(body.errors||!body.data?.productVariant||body.data.metaobjects.pageInfo.hasNextPage||body.data.productVariant.sellingPlanGroups.pageInfo.hasNextPage||body.data.productVariant.sellingPlanGroups.nodes.some((g:{sellingPlans:{pageInfo:{hasNextPage:boolean}}})=>g.sellingPlans.pageInfo.hasNextPage)) throw new Error('Catalog validation unavailable');
 const checkReferences=(fields:Array<{references?:{pageInfo?:{hasNextPage:boolean};nodes:Array<{fields?:unknown[]}>}}>)=>{
 for(const field of fields){if(field.references?.pageInfo?.hasNextPage) throw new Error('Menu references require pagination');for(const ref of field.references?.nodes||[])if(ref.fields)checkReferences(ref.fields as typeof fields);}
 };
 for(const week of body.data.metaobjects.nodes) checkReferences(week.fields);
 const v=body.data.productVariant;
 const programme:Programme={id:v.product.id,stream:v.product.stream?.jsonValue,menuWeeks:Number(v.product.menuWeeks?.jsonValue),purchasePolicy:v.product.purchasePolicy?.jsonValue,variant:{id:v.id,productGid:v.product.id,available:v.availableForSale,mealsPerDay:Number(v.mealsPerDay?.jsonValue||v.product.mealsPerDay?.jsonValue),requiresPlan:v.product.requiresSellingPlan,plans:v.sellingPlanGroups.nodes.flatMap((g:{sellingPlans:{nodes:{id:string}[]}})=>g.sellingPlans.nodes.map(p=>p.id))}};
 type Field={key:string;value:string;references?:{nodes:Array<{id:string;status?:string;capabilities?:{publishable?:{status:string}};fields?:Field[]}>}};
 const value=(fields:Field[],key:string)=>fields.find(f=>f.key===key)?.value||'';
 const refs=(fields:Field[],key:string)=>fields.find(f=>f.key===key)?.references?.nodes||[];
 const weeks:MenuWeek[]=body.data.metaobjects.nodes.filter((w:{capabilities?:{publishable?:{status:string}}})=>w.capabilities?.publishable?.status!=='DRAFT').map((w:{handle:string;fields:Field[]})=>({handle:w.handle,stream:value(w.fields,'business_stream'),startsOn:value(w.fields,'starts_on'),endsOn:value(w.fields,'ends_on'),cutoffAt:value(w.fields,'cutoff_at'),programmes:refs(w.fields,'programmes').map(p=>p.id),windows:refs(w.fields,'windows').filter(m=>m.capabilities?.publishable?.status!=='DRAFT').map(m=>({key:value(m.fields||[],'key'),stream:value(m.fields||[],'business_stream'),days:Number(value(m.fields||[],'days')),meals:refs(m.fields||[],'meals').filter(p=>p.status==='ACTIVE').map(p=>p.id)}))}));
 return {programme,weeks};
}
