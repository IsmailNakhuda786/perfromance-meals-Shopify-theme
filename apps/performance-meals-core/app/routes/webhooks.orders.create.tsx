import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {recordOrder} from '../services/orders.server';
import {syncOrderDispatch} from '../services/order-dispatch.server';
export async function action({request}:ActionFunctionArgs){
 const {shop,admin,payload,topic}=await authenticate.webhook(request);assertShop(shop);
 if(!['ORDERS_CREATE','ORDERS_UPDATED'].includes(topic))throw new Response('Unexpected event',{status:400});
 if(!admin) throw new Response('Retry when app session is available',{status:503});
 const eventId=request.headers.get('X-Shopify-Event-Id')||request.headers.get('X-Shopify-Webhook-Id');
 if(!eventId||eventId.length>512||typeof payload.admin_graphql_api_id!=='string'||!/^gid:\/\/shopify\/Order\/\d+$/.test(payload.admin_graphql_api_id)) throw new Response('Invalid event',{status:400});
 await recordOrder(shop,payload.admin_graphql_api_id,eventId,admin,topic);
 // Read fresh native fulfilments even when routing was already recorded.
 await syncOrderDispatch(admin,shop,payload.admin_graphql_api_id);
 return new Response(null,{status:200});
}
