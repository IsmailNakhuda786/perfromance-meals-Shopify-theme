import type {ActionFunctionArgs,LoaderFunctionArgs} from 'react-router';
import {authenticate,unauthenticated} from '../shopify.server';
import {assertShop,privateHeaders} from '../services/security.server';
import {readAccountCancellations} from '../services/account-cancellations.server';
export async function loader({request}:LoaderFunctionArgs){
 const {sessionToken,cors}=await authenticate.public.customerAccount(request);
 const shop=sessionToken.dest.replace(/^https:\/\//,'').replace(/\/$/,'');assertShop(shop);
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(sessionToken.sub??''))return cors(Response.json({error:'Sign in required'},{status:401,headers:privateHeaders}));
 if(request.method!=='GET')return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'GET'}}));
 try{const {admin}=await unauthenticated.admin(shop);return cors(Response.json(await readAccountCancellations(admin,shop,sessionToken.sub!),{headers:privateHeaders}));}
 catch{return cors(Response.json({error:'Your order Support history could not be verified. Please retry or contact Support.'},{status:503,headers:privateHeaders}));}
}
export async function action({request}:ActionFunctionArgs){const {cors}=await authenticate.public.customerAccount(request);return cors(new Response(null,{status:405,headers:{...privateHeaders,Allow:'GET'}}));}
