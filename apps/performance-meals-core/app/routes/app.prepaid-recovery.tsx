import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {Form,useLoaderData,useActionData,useNavigation} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop,privateHeaders} from '../services/security.server';
import {assertPrepaidPurchaseIntakeScope} from '../services/prepaid-purchase-intake.server';
import {discoverPrepaidPurchases,recoverPrepaidPurchasePage} from '../services/prepaid-purchase-recovery.server';
const cursor=(value:unknown)=>{if(value===null||value===undefined||value==='')return undefined;if(typeof value!=='string'||value.length>2048)throw Error('Invalid recovery page');return value;};
export async function loader({request}:LoaderFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 try{assertPrepaidPurchaseIntakeScope(session.shop);}catch{return {enabled:false as const,page:null,after:null};}
 try{const after=cursor(new URL(request.url).searchParams.get('after')),page=await discoverPrepaidPurchases(admin,session.shop,{limit:10,after});return {enabled:true as const,page,after:after??null};}
 catch{throw new Response('Package recovery could not be checked. No orders or balances were changed.',{status:503,headers:privateHeaders});}
}
export async function action({request}:ActionFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 if(request.method!=='POST')throw new Response('Method not allowed',{status:405,headers:{...privateHeaders,Allow:'POST'}});
 try{assertPrepaidPurchaseIntakeScope(session.shop);}catch{throw new Response('Package recovery is not activated',{status:403,headers:privateHeaders});}
 try{
  const form=await request.formData();if(form.get('intent')!=='recover'||[...form.keys()].sort().join(',')!=='after,intent')throw Error('Exact recovery intent required');
  const result=await recoverPrepaidPurchasePage(admin,session.shop,{limit:10,after:cursor(form.get('after'))});
  return {result,error:null};
 }catch{return {result:null,error:'Recovery could not finish. Any verified completion is saved; retrying will not duplicate it. No payment or Wallet operation was performed.'};}
}
export default function PrepaidRecovery(){
 const data=useLoaderData<typeof loader>(),outcome=useActionData<typeof action>(),busy=useNavigation().state!=='idle';
 return <s-page heading="Recover package purchases"><s-link slot="breadcrumb-actions" href="/app">Core</s-link>
  <s-section heading="Missed purchase updates"><s-paragraph>If a temporary connection interrupted a purchase update, Core can find the existing Shopify purchase and verify it again. Recovery does not create a Shopify order, collect payment, change deliveries or issue Wallet credit.</s-paragraph>
   {!data.enabled&&<s-paragraph>Package recovery is not activated.</s-paragraph>}
   {outcome?.error&&<p role="alert">{outcome.error}</p>}
   {outcome?.result&&<p role="status">Checked {outcome.result.results.length} package records. Recovered now: {outcome.result.results.filter(r=>r.state==='COMPLETED').length}. Previously completed: {outcome.result.results.filter(r=>r.state==='ALREADY_COMPLETED').length}. Awaiting review: {outcome.result.results.filter(r=>!['COMPLETED','ALREADY_COMPLETED'].includes(r.state)).length}.</p>}
  </s-section>
  {data.enabled&&data.page&&<s-section heading="Current page">
   <s-paragraph>{data.page.candidates.length} package records checked. Ready for payment verification: {data.page.candidates.filter(c=>c.state==='APPROVED_CANDIDATE').length}. Incomplete native records or unapproved prices remain held for review.</s-paragraph>
   {data.page.candidates.length>0&&<Form method="post"><input type="hidden" name="intent" value="recover"/><input type="hidden" name="after" value={data.after??''}/><button type="submit" disabled={busy}>Recover verified purchases on this page</button></Form>}
   {data.page.hasMore&&<s-link href={'/app/prepaid-recovery?after='+encodeURIComponent(data.page.nextCursor!)}>Check next page</s-link>}
   {data.after&&<s-link href="/app/prepaid-recovery">Return to first page</s-link>}
  </s-section>}
 </s-page>;
}
