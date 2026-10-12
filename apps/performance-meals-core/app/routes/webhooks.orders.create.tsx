import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {recordOrder} from '../services/orders.server';
export async function action({request}:ActionFunctionArgs){
 const {shop,admin,payload,topic}=await authenticate.webhook(request);assertShop(shop);
 if(!admin) throw new Response('Retry when app session is available',{status:503});
 const eventId=request.headers.get('X-Shopify-Event-Id')||request.headers.get('X-Shopify-Webhook-Id');
 if(!eventId||!payload.admin_graphql_api_id) throw new Response('Invalid event',{status:400});
 await recordOrder(shop,payload.admin_graphql_api_id,eventId,admin,topic);
 return new Response(null,{status:200});
}
