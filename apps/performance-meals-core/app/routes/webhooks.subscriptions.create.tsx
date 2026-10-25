import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {assertShop} from '../services/security.server';
import {linkSubscriptionOrigin} from '../services/subscription-links.server';
import {receivePrepaidPurchaseTrigger} from '../services/prepaid-purchase-intake.server';

export async function action({request}:ActionFunctionArgs){
 const {shop,admin,payload,topic}=await authenticate.webhook(request);assertShop(shop);
 if(topic!=='SUBSCRIPTION_CONTRACTS_CREATE')throw new Response('Unexpected event',{status:400});
 const eventId=request.headers.get('X-Shopify-Event-Id')||request.headers.get('X-Shopify-Webhook-Id');
 const id=payload.admin_graphql_api_id;
 if(!eventId||eventId.length>512||typeof id!=='string'||!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(id))throw new Response('Invalid event',{status:400});
 if(process.env.CORE_PREPAID_PURCHASE_INTAKE_ENABLED==='true')await receivePrepaidPurchaseTrigger(shop,id,eventId);
 if(!admin)throw new Response('Retry when app session is available',{status:503});
 // Missing original routing or ambiguous identity returns failure for retry;
 // never manufacture an order or attach a different customer's contract.
 await linkSubscriptionOrigin(admin,shop,id);
 return new Response(null,{status:200});
}
