import {assertShop} from './security.server';
import type {ClaimGateway} from './gift-card-claim.server';
import {assertNativeWalletCreditReady} from './native-wallet-credit-ready.server';
export const CLAIM_SOURCE_QUERY = `#graphql
query GiftCardClaimSource($query: String!) {
 shop { myshopifyDomain currencyCode }
 giftCards(first: 2, query: $query) {
  nodes { id enabled expiresOn maskedCode balance { amount currencyCode } recipientAttributes { recipient { id } } }
  pageInfo { hasNextPage endCursor }
 }
}
`;
export const CLAIM_DEBIT_MUTATION = `#graphql
mutation GiftCardClaimDebit($id: ID!, $debitInput: GiftCardDebitInput!) {
 giftCardDebit(id: $id, debitInput: $debitInput) {
  giftCardDebitTransaction { id amount { amount currencyCode } giftCard { id } }
  userErrors { field message }
 }
}
`;
export const CLAIM_CREDIT_MUTATION = `#graphql
mutation GiftCardClaimCredit($id: ID!, $creditInput: StoreCreditAccountCreditInput!) {
 storeCreditAccountCredit(id: $id, creditInput: $creditInput) {
  storeCreditAccountTransaction { id amount { amount currencyCode } account { owner { ... on Customer { id } } } }
  userErrors { field message }
 }
}
`;
type Admin = {graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
export function minorAmount(amount:string){
 if(!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(amount))throw new Error('Invalid native monetary amount');
 const [whole,fraction='']=amount.split('.');
 const value=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(value>2147483647n)throw new Error('Native amount exceeds supported ledger range');
 return Number(value);
}
export function nativeGiftCardGateway(admin:Admin,shop:string):ClaimGateway{
 assertShop(shop);
 const request=async(query:string,variables:Record<string,unknown>)=>{
  try{const response=await admin.graphql(query,{variables});const body=await response.json();if(!response.ok||body.errors||!body.data)throw new Error();return body.data;}
  catch{throw new Error('Native Gift Card operation unavailable; reconcile before retrying');}
 };
 const amount=(value:number)=>{
  if(!Number.isSafeInteger(value)||value<1||value>2147483647)throw new Error('Invalid native transfer amount');
  return Math.floor(value/100)+'.'+String(value%100).padStart(2,'0');
 };
 return {
  assertWalletReady:(customerGid,context)=>assertNativeWalletCreditReady(admin,shop,customerGid,context),
  async resolve(code){
   if(!/^[a-z0-9]{8,20}$/i.test(code))throw new Error('Invalid Gift Card code');
   const data=await request(CLAIM_SOURCE_QUERY,{query:'"'+code+'"'});
   if(data.shop.myshopifyDomain!==shop||data.shop.currencyCode!=='SGD'||data.giftCards.pageInfo.hasNextPage||data.giftCards.nodes.length!==1)throw new Error('Gift Card cannot be identified');
   const card=data.giftCards.nodes[0];
   if(!card.maskedCode.toLowerCase().endsWith(code.slice(-4).toLowerCase()))throw new Error('Gift Card cannot be identified');
   return {id:card.id,recipientGid:card.recipientAttributes?.recipient?.id||null,enabled:card.enabled,expiresOn:card.expiresOn,amountMinor:minorAmount(card.balance.amount),currency:card.balance.currencyCode};
  },
  async debit(cardGid,amountMinor,reference){
   const data=await request(CLAIM_DEBIT_MUTATION,{id:cardGid,debitInput:{debitAmount:{amount:amount(amountMinor),currencyCode:'SGD'},note:'Performance Meals Wallet claim '+reference}});
   const result=data.giftCardDebit;if(result.userErrors.length||!result.giftCardDebitTransaction)throw new Error('Native Gift Card debit was not confirmed');
   const receipt=result.giftCardDebitTransaction;
   // Shopify returns a negative amount for native Gift Card debit transactions.
   if(!receipt.amount.amount.startsWith('-'))throw new Error('Native debit amount was not negative');
   return {id:receipt.id,ownerGid:receipt.giftCard.id,amountMinor:minorAmount(receipt.amount.amount.slice(1)),currency:receipt.amount.currencyCode};
  },
  async credit(customerGid,amountMinor){
   const data=await request(CLAIM_CREDIT_MUTATION,{id:customerGid,creditInput:{creditAmount:{amount:amount(amountMinor),currencyCode:'SGD'},notify:false}});
   const result=data.storeCreditAccountCredit;if(result.userErrors.length||!result.storeCreditAccountTransaction)throw new Error('Native Wallet credit was not confirmed');
   const receipt=result.storeCreditAccountTransaction;
   return {id:receipt.id,ownerGid:receipt.account.owner.id,amountMinor:minorAmount(receipt.amount.amount),currency:receipt.amount.currencyCode};
  },
 };
}
