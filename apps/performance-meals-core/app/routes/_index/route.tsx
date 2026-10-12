import type {LoaderFunctionArgs} from 'react-router';
import {redirect} from 'react-router';
export async function loader({request}:LoaderFunctionArgs) {
 const url=new URL(request.url);
 if(url.searchParams.has('shop')) throw redirect(`/app?${url.searchParams}`);
 return null;
}
export default function Index() {
 return <main><h1>Performance Meals Core</h1><p>Open this app from your Shopify Admin.</p></main>;
}
