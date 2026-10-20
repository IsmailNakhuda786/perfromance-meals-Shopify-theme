// Native calculated SubscriptionLine objects use UUID GIDs. Preserve numeric
// historical references too; this exception never applies to customer/order IDs.
export function validSubscriptionLineGid(value:unknown):value is string{
 const prefix='gid://shopify/SubscriptionLine/';
 if(typeof value!=='string'||!value.startsWith(prefix))return false;
 const id=value.slice(prefix.length);
 return /^\d+$/.test(id)||/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
}
