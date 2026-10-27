import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {recordOrder} from '../services/orders.server';
import {earnNativeOrderRewards} from '../services/rewards-native.server';
import {handleWalletPackageWebhook} from '../services/wallet-package-pipeline.server';

// Registered through the Shopify SDK; earning remains policy-gated.
// Shopify's authenticated notification is a trigger, never pricing evidence.
export async function action({request}:ActionFunctionArgs){
 const {shop,admin,payload,topic}=await authenticate.webhook(request);assertShop(shop);
 if(topic!=='ORDERS_PAID')throw new Response('Unexpected event',{status:400});
 if(!admin)throw new Response('Retry when app session is available',{status:503});
 const eventId=request.headers.get('X-Shopify-Event-Id')||request.headers.get('X-Shopify-Webhook-Id');
 const orderGid=payload.admin_graphql_api_id;
 if(!eventId||!/^gid:\/\/shopify\/Order\/\d+$/.test(orderGid||''))throw new Response('Invalid event',{status:400});
 if(await handleWalletPackageWebhook(admin,shop,topic,eventId,payload))return new Response(null,{status:200});
 // Routing may already be recorded on delivery/retry. Earning must still run:
 // its separate order-keyed ledger prevents duplicate points and permits retry
 // after a successful routing transaction followed by failed evidence retrieval.
 await recordOrder(shop,orderGid,'paid-routing:'+eventId,admin,topic);
 await earnNativeOrderRewards(admin,shop,orderGid);
 return new Response(null,{status:200});
}
