import {inspectPrepaidContract, type PrepaidExpectation} from './prepaid-verification.server';
import {readPrepaidPayment,readCorrectedPrepaidPayment,type PrepaidPriceCorrection} from './prepaid-payment.server';
import {assertShop} from './security.server';

export const PREPAID_RENEWAL_QUERY=`#graphql
query ReadySeriesRenewalAttempt($id:ID!){
 shop{myshopifyDomain}
 subscriptionBillingAttempt(id:$id){
  id idempotencyKey subscriptionContract{id}
  state{__typename ...on SubscriptionBillingAttemptSuccessState{order{id}}}
 }
}`;
type Admin=Parameters<typeof readPrepaidPayment>[0];
export type PrepaidRenewalExpectation=PrepaidExpectation&{
 attemptGid:string;idempotencyKey:string;renewalOrderGid:string;renewalOrderLineGid:string;upfrontMinor:number;
};
const ref=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);

// Historical development evidence only. Never charges, retries, advances a
// billing date, enables sales or treats an old success as a new cycle payment.
export async function inspectPrepaidRenewal(admin:Admin,shop:string,contractGid:string,expected:PrepaidRenewalExpectation){
 return inspectRenewal(admin,shop,contractGid,expected,null);
}
export async function inspectCorrectedPrepaidRenewal(admin:Admin,shop:string,contractGid:string,expected:PrepaidRenewalExpectation,correction:PrepaidPriceCorrection){
 if(!correction)throw Error('Explicit approved renewal correction required');
 return inspectRenewal(admin,shop,contractGid,expected,correction);
}
async function inspectRenewal(admin:Admin,shop:string,contractGid:string,expected:PrepaidRenewalExpectation,correction:PrepaidPriceCorrection|null){
 assertShop(shop);
 if(!ref('SubscriptionBillingAttempt',expected.attemptGid)||!ref('Order',expected.renewalOrderGid)||!ref('LineItem',expected.renewalOrderLineGid)||expected.renewalOrderGid===expected.orderGid||typeof expected.idempotencyKey!=='string'||!expected.idempotencyKey.trim()||expected.idempotencyKey.length>255)throw Error('Distinct renewal and saved attempt references required');
 const contract=await inspectPrepaidContract(admin,shop,contractGid,expected);
 // A historical payment remains auditable after pause/cancellation, but its
 // evidence must never become authorization for another charge.
 if(!contract.billingConfigurationMatches||!contract.deliveryPolicyMatches||contract.contract.lines.nodes.length!==1||!['ACTIVE','PAUSED','CANCELLED'].includes(contract.contract.status))throw Error('Renewal contract requires review');
 const response=await admin.graphql(PREPAID_RENEWAL_QUERY,{variables:{id:expected.attemptGid}}),body=await response.json(),attempt=body.data?.subscriptionBillingAttempt;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||attempt?.id!==expected.attemptGid||attempt.idempotencyKey!==expected.idempotencyKey||attempt.subscriptionContract?.id!==contractGid||attempt.state?.__typename!=='SubscriptionBillingAttemptSuccessState'||attempt.state.order?.id!==expected.renewalOrderGid)throw Error('Confirmed renewal attempt unavailable');
 const paymentContext={...expected,orderGid:expected.renewalOrderGid,orderLineGid:expected.renewalOrderLineGid};
 const payment=correction?await readCorrectedPrepaidPayment(admin,shop,paymentContext,correction):await readPrepaidPayment(admin,shop,paymentContext);
 return {attemptGid:expected.attemptGid,contractGid,originalOrderGid:expected.orderGid,renewalOrderGid:expected.renewalOrderGid,payment,
  observedRenewalVerified:true as const,futureRenewalsVerified:false as const,activationAllowed:false as const};
}
