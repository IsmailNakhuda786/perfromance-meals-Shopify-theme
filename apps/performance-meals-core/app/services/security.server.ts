import { createHmac, timingSafeEqual } from "node:crypto";
export function assertShop(shop: string) {
  const allowed = process.env.ALLOWED_SHOP;
  if (shop !== allowed) throw new Response("Store is not authorized", {status:403});
}
export function issueNonce(shop: string, customer: string, secret: string, now=Date.now()) {
  const expires = Math.floor(now/1000)+900;
  return `${expires}.${createHmac('sha256',secret).update(`${shop}:${customer}:${expires}`).digest('hex')}`;
}
export function validateNonce(token: unknown, shop: string, customer: string, secret: string, now=Date.now()) {
  if (typeof token !== 'string' || !/^\d{10}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expires,mac]=token.split('.');
  if (Number(expires)<=now/1000 || Number(expires)>now/1000+901) return false;
  const expected=createHmac('sha256',secret).update(`${shop}:${customer}:${expires}`).digest('hex');
  return timingSafeEqual(Buffer.from(mac),Buffer.from(expected));
}
export function proxyCustomer(request: Request, shop: string) {
  assertShop(shop);
  const url=new URL(request.url);
  const timestamp=Number(url.searchParams.get('timestamp'));
  if (!Number.isFinite(timestamp) || Math.abs(Date.now()/1000-timestamp)>300) throw new Response('Expired request',{status:401});
  const id=url.searchParams.get('logged_in_customer_id');
  if (!id || !/^\d+$/.test(id)) throw new Response('Sign in to your Shopify account',{status:401});
  // These query fields are trusted only AFTER official appProxy signature verification.
  return `gid://shopify/Customer/${id}`;
}
export const privateHeaders = {'Cache-Control':'no-store, private','Content-Type':'application/json'};
