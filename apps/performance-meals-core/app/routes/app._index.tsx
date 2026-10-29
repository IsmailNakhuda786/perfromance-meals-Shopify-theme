import type {LoaderFunctionArgs,ActionFunctionArgs} from 'react-router';
import {Form,useLoaderData,useActionData} from 'react-router';
import {authenticate,registerWebhooks} from '../shopify.server';
import {readyBookingReadable} from '../services/ready-booking-read.server';
import {assertShop} from '../services/security.server';
import {reconcilePending} from '../services/reconciliation.server';
import {reviewOrderEventConnections} from '../services/order-event-connections';
export async function loader({request}:LoaderFunctionArgs) {
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 const response=await admin.graphql(`#graphql
 query CoreConnection {shop {myshopifyDomain currencyCode ianaTimezone} webhookSubscriptions(first:100){nodes{topic uri}pageInfo{hasNextPage}}}`);
 const result=await response.json();if(!response.ok||("errors" in result&&result.errors)||!result.data?.shop||result.data.shop.myshopifyDomain!==session.shop||!result.data.webhookSubscriptions) throw new Response('Connection unavailable',{status:503});
 const subscriptions=result.data.webhookSubscriptions;
 return {customerDeliveriesEnabled:readyBookingReadable(session.shop,process.env.CORE_READY_BOOKING_QA_CUSTOMER??''),programmeBatchesEnabled:process.env.NODE_ENV!=="production"&&process.env.SIXTY_DAY_BATCHES_ENABLED==="true"&&!!process.env.SIXTY_DAY_BATCH_QA_SELECTION_ID,shop:result.data.shop,...reviewOrderEventConnections(process.env.SHOPIFY_APP_URL,subscriptions.nodes,subscriptions.pageInfo?.hasNextPage===false,{renewalEvidenceEnabled:process.env.NODE_ENV!=='production'&&process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED==='true'})};
}
export async function action({request}:ActionFunctionArgs){
 const {session,admin}=await authenticate.admin(request);assertShop(session.shop);
 const form=await request.formData();
 if(form.get('intent')==='connect'){await registerWebhooks({session});return {message:'Order event registration checked.'};}
 if(form.get('intent')==='reconcile'){const count=await reconcilePending(session.shop,admin);return {message:`Checked ${count} native order(s) against pending selections.`};}
 throw new Response('Unknown operation',{status:400});
}
export default function Foundation(){
 const {shop,connected,programmeBatchesEnabled,customerDeliveriesEnabled}=useLoaderData<typeof loader>();const result=useActionData<typeof action>();
 return <s-page heading="Performance Meals"><s-section heading="Core foundation"><s-paragraph>Customer Meal Plan persistence and operational line routing. Department workspaces will be added in the approved Admin phase.</s-paragraph><s-paragraph>{shop.myshopifyDomain} · {shop.currencyCode} · {shop.ianaTimezone}</s-paragraph><s-paragraph>Order events: {connected?'Connected':'Connection required'}</s-paragraph>{customerDeliveriesEnabled&&<s-link href="/app/ready-deliveries">Manage customer deliveries</s-link>}<s-link href="/app/ready-delivery-slots">Manage Ready Series delivery slots</s-link>{programmeBatchesEnabled&&<s-link href="/app/programme-deliveries">Manage 6 by 60 delivery batches</s-link>}<Form method="post"><button name="intent" value="connect">Connect order events</button> <button name="intent" value="reconcile">Sync pending checkouts</button></Form>{result&&<s-paragraph>{result.message}</s-paragraph>}</s-section></s-page>;
}
