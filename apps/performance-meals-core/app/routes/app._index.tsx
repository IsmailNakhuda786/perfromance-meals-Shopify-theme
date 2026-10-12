import type {LoaderFunctionArgs,ActionFunctionArgs} from 'react-router';
import {Form,useLoaderData,useActionData} from 'react-router';
import {authenticate,registerWebhooks} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {reconcilePending} from '../services/reconciliation.server';
export async function loader({request}:LoaderFunctionArgs) {
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 const response=await admin.graphql(`#graphql
 query CoreConnection {shop {myshopifyDomain currencyCode ianaTimezone} webhookSubscriptions(first:20){nodes{topic uri}}}`);
 const result=await response.json();if(!result.data) throw new Response('Connection unavailable',{status:503});
 return {shop:result.data.shop,connected:result.data.webhookSubscriptions.nodes.some((s:{topic:string;uri:string})=>s.topic==='ORDERS_CREATE'&&s.uri===new URL('/webhooks/orders/create',process.env.SHOPIFY_APP_URL).href)};
}
export async function action({request}:ActionFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 const form=await request.formData();
 if(form.get('intent')==='connect'){await registerWebhooks({session});return {message:'Order event registration checked.'};}
 if(form.get('intent')==='reconcile'){const count=await reconcilePending(session.shop,admin);return {message:`Checked ${count} native order(s) against pending selections.`};}
 throw new Response('Unknown operation',{status:400});
}
export default function Foundation(){
 const {shop,connected}=useLoaderData<typeof loader>();const result=useActionData<typeof action>();
 return <s-page heading="Performance Meals"><s-section heading="Core foundation"><s-paragraph>Customer Meal Plan persistence and operational line routing. Department workspaces will be added in the approved Admin phase.</s-paragraph><s-paragraph>{shop.myshopifyDomain} · {shop.currencyCode} · {shop.ianaTimezone}</s-paragraph><s-paragraph>Order events: {connected?'Connected':'Connection required'}</s-paragraph><Form method="post"><button name="intent" value="connect">Connect order events</button> <button name="intent" value="reconcile">Sync pending checkouts</button></Form>{result&&<s-paragraph>{result.message}</s-paragraph>}</s-section></s-page>;
}
