import type {ActionFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {queuePrivacyRequest,PrivacyRequestError} from '../services/privacy.server';

export async function action({request}:ActionFunctionArgs){
 const {shop,topic,payload}=await authenticate.webhook(request);
 const eventId=request.headers.get('X-Shopify-Event-Id')||request.headers.get('X-Shopify-Webhook-Id');
 // Authentication precedes persistence. Durable intake is not completed erasure.
 try{await queuePrivacyRequest(shop,topic,payload,eventId);}
 catch(error){
  if(error instanceof PrivacyRequestError)return new Response('Invalid privacy request',{status:400});
  throw error; // Failed persistence must remain retryable, never acknowledged.
 }
 return new Response(null,{status:200});
}
