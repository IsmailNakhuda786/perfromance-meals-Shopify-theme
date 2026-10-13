import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate} from '../shopify.server';
import {privateHeaders} from '../services/security.server';

export async function loader({request}:LoaderFunctionArgs){
 const {cors}=await authenticate.public.customerAccount(request);
 return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'POST'}}));
}
// Retire the old mutation endpoint. Authentication is still required, but no
// stale client can initiate a native cancellation, renewal change or credit.
export async function action({request}:ActionFunctionArgs){
 const {cors}=await authenticate.public.customerAccount(request);
 return cors(Response.json({error:'Cancellation and refund requests require Customer Support approval.',code:'SUPPORT_APPROVAL_REQUIRED'},{status:403,headers:privateHeaders}));
}
