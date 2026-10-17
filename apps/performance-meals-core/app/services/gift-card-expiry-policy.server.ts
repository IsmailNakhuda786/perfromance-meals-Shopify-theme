import {assertShop} from './security.server';
import {minorAmount} from './gift-card-native.server';
import {walletCreditTerm} from './wallet-credit-policy';

export const GIFT_CARD_EXPIRY_EVIDENCE_QUERY=`#graphql
query GiftCardExpiryEvidence($id:ID!){
 shop{myshopifyDomain currencyCode}
 giftCard(id:$id){id createdAt enabled expiresOn balance{amount currencyCode} recipientAttributes{recipient{id}}}
}`;
type Admin={graphql:(query:string,options:{variables:Record<string,unknown>})=>Promise<Response>};
// Read-only preparation. Never infer that read_gift_cards permits expiry writes.
// No existing card is redated and no email is sent by this service.
export async function reviewGiftCardExpiry(admin:Admin,shop:string,cardGid:string,policyStartsAt:string,now=new Date()){
 assertShop(shop);
 if(!/^gid:\/\/shopify\/GiftCard\/\d+$/.test(cardGid)||!Number.isFinite(now.getTime()))throw Error('Invalid Gift Card expiry context');
 const startsAt=new Date(policyStartsAt);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(policyStartsAt)||!Number.isFinite(startsAt.getTime())||startsAt.toISOString().slice(0,19)!==policyStartsAt.slice(0,19))throw Error('Verified Gift Card policy boundary required');
 const response=await admin.graphql(GIFT_CARD_EXPIRY_EVIDENCE_QUERY,{variables:{id:cardGid}}),body=await response.json(),card=body.data?.giftCard;
 if(!response.ok||body.errors||body.data?.shop?.myshopifyDomain!==shop||body.data.shop.currencyCode!=='SGD'||card?.id!==cardGid||card.balance.currencyCode!=='SGD'||typeof card.enabled!=='boolean')throw Error('Gift Card expiry evidence unavailable');
 const term=walletCreditTerm(card.createdAt),balanceMinor=minorAmount(card.balance.amount);
 if(new Date(card.createdAt)>now)throw Error('Gift Card issuance is in the future');
 const recipientGid=card.recipientAttributes?.recipient?.id??null;
 if(recipientGid&&!/^gid:\/\/shopify\/Customer\/\d+$/.test(recipientGid))throw Error('Gift Card recipient evidence invalid');
 if(card.expiresOn!==null){
  const date=new Date(card.expiresOn+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(card.expiresOn)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==card.expiresOn)throw Error('Gift Card expiry date invalid');
 }
 const historical=new Date(card.createdAt)<startsAt;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const expired=card.expiresOn!==null&&card.expiresOn<today;
 const state=historical?'HISTORICAL_UNCHANGED':!card.enabled||balanceMinor===0?'UNAVAILABLE':!recipientGid?'RECIPIENT_REQUIRED':card.expiresOn===term.expiryDate?(expired?'EXPIRED':'VERIFIED'):card.expiresOn?'MERCHANT_REVIEW_REQUIRED':'EXPIRY_CONFIGURATION_REQUIRED';
 return {state,cardGid,recipientGid,balanceMinor,nativeExpiresOn:card.expiresOn,expectedExpiresOn:historical?null:term.expiryDate,reminderDate:historical?null:term.reminderDate,reminderDue:state==='VERIFIED'&&today>=term.reminderDate,nativeWritePerformed:false as const};
}

export const GIFT_CARD_EXPIRY_UPDATE_MUTATION=`#graphql
mutation SetApprovedGiftCardExpiry($id:ID!,$input:GiftCardUpdateInput!){
 giftCardUpdate(id:$id,input:$input){giftCard{id expiresOn}userErrors{field message}}
}`;
// Internal and default-off. Callers supply a server-owned policy boundary and
// verified recipient. This never changes card value, recipient or enabled state,
// and never backfills historical cards or replaces a merchant-set expiry.
export async function applyApprovedGiftCardExpiry(admin:Admin,shop:string,cardGid:string,recipientGid:string,policyStartsAt:string,now=new Date()){
 assertShop(shop);
 if(process.env.GIFT_CARD_EXPIRY_WRITES_ENABLED!=='true')throw Error('Gift Card expiry writes are not activated');
 if(!/^gid:\/\/shopify\/Customer\/\d+$/.test(recipientGid))throw Error('Verified Gift Card recipient required');
 const before=await reviewGiftCardExpiry(admin,shop,cardGid,policyStartsAt,now);
 if(before.recipientGid!==recipientGid)throw Error('Gift Card expiry recipient differs');
 if(before.state==='VERIFIED')return before;
 if(before.state!=='EXPIRY_CONFIGURATION_REQUIRED'||!before.expectedExpiresOn)throw Error('Gift Card expiry requires merchant review');
 const response=await admin.graphql(GIFT_CARD_EXPIRY_UPDATE_MUTATION,{variables:{id:cardGid,input:{expiresOn:before.expectedExpiresOn}}}),body=await response.json(),result=body.data?.giftCardUpdate;
 if(!response.ok||body.errors||result?.userErrors?.length||result?.giftCard?.id!==cardGid||result.giftCard.expiresOn!==before.expectedExpiresOn)throw Error('Gift Card expiry update unconfirmed; inspect native card before retry');
 const after=await reviewGiftCardExpiry(admin,shop,cardGid,policyStartsAt,now);
 if(after.state!=='VERIFIED'||after.recipientGid!==recipientGid||after.nativeExpiresOn!==before.expectedExpiresOn)throw Error('Gift Card expiry readback differs; merchant review required');
 return {...after,nativeWritePerformed:true as const};
}
