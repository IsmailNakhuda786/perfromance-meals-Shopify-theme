import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {receivePrepaidRenewalTrigger} from '../services/prepaid-renewal-inbox.server';

export async function action({request}:ActionFunctionArgs){
 if(process.env.NODE_ENV==='production'||process.env.CORE_PREPAID_RENEWAL_LINKS_ENABLED!=='true')return new Response('Renewal intake unavailable',{status:503});
 const {shop,payload,topic}=await authenticate.webhook(request);
 if(topic!=='SUBSCRIPTION_BILLING_ATTEMPTS_SUCCESS')return new Response('Unexpected event',{status:400});
 const eventId=request.headers.get('X-Shopify-Event-Id')||request.headers.get('X-Shopify-Webhook-Id');
 if(!eventId)return new Response('Missing event identity',{status:400});
 await receivePrepaidRenewalTrigger(shop,payload,eventId);
 return new Response(null,{status:200});
}
