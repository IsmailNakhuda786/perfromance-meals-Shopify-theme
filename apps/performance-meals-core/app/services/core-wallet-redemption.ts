import {createHash} from 'node:crypto';
import {planApprovedWalletSpend,WALLET_SPEND_ORDER,type WalletCreditLot,type WalletPurchaseLine} from './wallet-credit-policy';

export type WalletScope={shop:string;customerGid:string;currency:'SGD'};
export type ScopedCredit=WalletCreditLot&WalletScope;
type Quote=WalletScope&{cartReference:string;cartRevision:string;ledgerRevision:number;lines:WalletPurchaseLine[]};
type State='PREPARED'|'SUBMITTING'|'UNKNOWN'|'HELD'|'SETTLED'|'RELEASED';
type Receipt=WalletScope&{id:string;attemptId:string;cartDigest:string;amountMinor:number;occurredAt:string};
export type CoreWalletRedemption={version:'core-wallet-redemption-draft-v1';id:string;scope:WalletScope;quote:Quote;digest:string;allocations:ReturnType<typeof planApprovedWalletSpend>['allocations'];amountMinor:number;deadline:string;preparedAt:string;submittedAt:string|null;lastEventAt:string;planDigest:string;revision:number;state:State;receipt:Receipt|null;reason:string|null};
export type RedemptionEvent=
 |{type:'SUBMIT';at:string;quote:Quote}
 |{type:'TIMEOUT';at:string}
 |{type:'RELEASE_UNSUBMITTED';at:string}
 |{type:'CONFIRMED';at:string;receipt:Receipt}
 |{type:'REJECTED_FINAL';at:string;receipt:Receipt};
const reference=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=512&&!Array.from(value).some(character=>character.charCodeAt(0)<32)&&value.trim()===value;
function timestamp(value:string){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))throw Error('Verified UTC timestamp required');
 const time=Date.parse(value);if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,19)!==value.slice(0,19))throw Error('Invalid UTC timestamp');return time;
}
function scope(value:WalletScope){
 if(!value||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value.shop)||!/^gid:\/\/shopify\/Customer\/\d+$/.test(value.customerGid)||value.currency!=='SGD')throw Error('Verified Wallet account context required');
 return {shop:value.shop,customerGid:value.customerGid,currency:value.currency};
}
function sameScope(left:WalletScope,right:WalletScope){return JSON.stringify(scope(left))===JSON.stringify(scope(right));}
function canonicalQuote(quote:Quote){
 const context=scope(quote);
 if(!reference(quote.cartReference)||!reference(quote.cartRevision)||!Number.isSafeInteger(quote.ledgerRevision)||quote.ledgerRevision<0||!Array.isArray(quote.lines))throw Error('Verified cart and ledger revisions required');
 // Reuse the merchant allocator's strict line validation without credit or writes.
 planApprovedWalletSpend([],quote.lines,'2026-01-01T00:00:00Z');
 return {...context,cartReference:quote.cartReference,cartRevision:quote.cartRevision,ledgerRevision:quote.ledgerRevision,lines:quote.lines.map(({id,kind,amountMinor})=>({id,kind,amountMinor})).sort((a,b)=>a.id.localeCompare(b.id))};
}
function digest(quote:Quote){return createHash('sha256').update(JSON.stringify(canonicalQuote(quote))).digest('hex');}
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
function planDigest(value:Pick<CoreWalletRedemption,'id'|'digest'|'allocations'|'amountMinor'|'deadline'|'preparedAt'>){
 return createHash('sha256').update(JSON.stringify([value.id,value.digest,value.allocations.map(part=>[part.creditId,part.sourceKind,part.amountMinor,part.foodMinor,part.otherMinor]),value.amountMinor,value.deadline,value.preparedAt])).digest('hex');
}
function canonicalReceipt(value:Receipt):Receipt{return {...scope(value),id:value.id,attemptId:value.attemptId,cartDigest:value.cartDigest,amountMinor:value.amountMinor,occurredAt:new Date(timestamp(value.occurredAt)).toISOString()};}
// Internal, provider-neutral planning/state transitions ONLY. This is not a
// payment gateway, database reservation or proof that funds are locked. A future
// authenticated adapter must atomically reserve credit lots and compare-and-swap
// this revision before any external submission. No public route consumes this.
export function prepareCoreWalletRedemption(input:{id:string;quote:Quote;credits:ScopedCredit[];now:string;reservationDeadline:string}):CoreWalletRedemption{
 if(!reference(input.id)||!Array.isArray(input.credits)||input.credits.some(credit=>!sameScope(credit,input.quote)))throw Error('Wallet credit belongs to another account');
 const quote=canonicalQuote(input.quote),now=timestamp(input.now),requestedDeadline=timestamp(input.reservationDeadline);
 if(requestedDeadline<=now)throw Error('Reservation deadline must be in the future');
 const plan=planApprovedWalletSpend(input.credits,quote.lines,input.now);
 const amountMinor=plan.allocations.reduce((sum,part)=>sum+part.amountMinor,0);
 if(!amountMinor)throw Error('No eligible Wallet credit is available');
 const expiry=plan.allocations.map(part=>timestamp(input.credits.find(credit=>credit.id===part.creditId)!.expiresAt));
 const deadline=new Date(Math.min(requestedDeadline,...expiry)).toISOString();
 const preparedAt=new Date(now).toISOString();
 const binding={id:input.id,digest:digest(quote),allocations:clone(plan.allocations),amountMinor,deadline,preparedAt};
 return {version:'core-wallet-redemption-draft-v1',...binding,scope:scope(quote),quote,submittedAt:null,lastEventAt:preparedAt,planDigest:planDigest(binding),revision:0,state:'PREPARED',receipt:null,reason:null};
}
// Return a new revision for transactional persistence. Never call a provider on
// the basis of this pure return value until the database CAS/lot lock succeeds.
// Provider receipts must be authenticated by the approved adapter, not a browser.
export function transitionCoreWalletRedemption(current:CoreWalletRedemption,expectedRevision:number,event:RedemptionEvent):CoreWalletRedemption{
 if(current.version!=='core-wallet-redemption-draft-v1'||!reference(current.id)||!sameScope(current.scope,current.quote)||current.digest!==digest(current.quote)||!Number.isSafeInteger(current.revision)||current.revision<0||expectedRevision!==current.revision)throw Error('Redemption changed or context requires reconciliation');
 if(!['PREPARED','SUBMITTING','UNKNOWN','HELD','SETTLED','RELEASED'].includes(current.state)||!Array.isArray(current.allocations)||!current.allocations.length||!Number.isSafeInteger(current.amountMinor)||current.amountMinor<1)throw Error('Invalid stored redemption');
 if(current.allocations.some(part=>!reference(part.creditId)||!Number.isSafeInteger(part.amountMinor)||part.amountMinor<1||!Number.isSafeInteger(part.foodMinor)||part.foodMinor<0||!Number.isSafeInteger(part.otherMinor)||part.otherMinor<0||part.foodMinor+part.otherMinor!==part.amountMinor||!WALLET_SPEND_ORDER.includes(part.sourceKind)||part.sourceKind==='bonus'&&part.otherMinor!==0)||new Set(current.allocations.map(part=>part.creditId)).size!==current.allocations.length||current.allocations.reduce((sum,part)=>sum+part.amountMinor,0)!==current.amountMinor)throw Error('Stored allocations require reconciliation');
 if(current.planDigest!==planDigest(current))throw Error('Stored redemption allocation binding differs');
 const now=timestamp(event.at),deadline=timestamp(current.deadline),next=clone(current);
 if(now<timestamp(current.lastEventAt)||timestamp(current.preparedAt)>=deadline||timestamp(current.lastEventAt)<timestamp(current.preparedAt)||current.submittedAt!==null&&timestamp(current.submittedAt)<timestamp(current.preparedAt))throw Error('Redemption event chronology differs');
 next.lastEventAt=new Date(now).toISOString();
 const change=(state:State,reason:string|null=null)=>({...next,state,reason,revision:current.revision+1});
 if(event.type==='CONFIRMED'||event.type==='REJECTED_FINAL'){
  const receipt=event.receipt;
  if(!receipt||!reference(receipt.id)||!sameScope(receipt,current.scope)||receipt.attemptId!==current.id||receipt.cartDigest!==current.digest||!Number.isSafeInteger(receipt.amountMinor)||receipt.amountMinor<0||timestamp(receipt.occurredAt)>now||current.submittedAt===null||timestamp(receipt.occurredAt)<timestamp(current.submittedAt))throw Error('Provider receipt identity differs');
  if(current.state==='SETTLED'||current.state==='RELEASED'){
   if(current.receipt&&JSON.stringify(canonicalReceipt(current.receipt))===JSON.stringify(canonicalReceipt(receipt))&&((current.state==='SETTLED')===(event.type==='CONFIRMED')))return clone(current);
   throw Error('Terminal redemption cannot be replayed with another outcome');
  }
  if(current.state==='HELD')throw Error('Held provider evidence requires an audited reconciliation');
  if(!['SUBMITTING','UNKNOWN'].includes(current.state))throw Error('No external attempt was started');
  if(event.type==='REJECTED_FINAL'){
   if(receipt.amountMinor!==0)return {...change('HELD','Rejected outcome contains value; reconcile before release'),receipt:canonicalReceipt(receipt)};
   next.receipt=canonicalReceipt(receipt);return {...change('RELEASED'),receipt:next.receipt};
  }
  if(receipt.amountMinor!==current.amountMinor||timestamp(receipt.occurredAt)>=deadline)return {...change('HELD','Payment amount or expiry differs; reconcile before settlement'),receipt:canonicalReceipt(receipt)};
  next.receipt=canonicalReceipt(receipt);return {...change('SETTLED'),receipt:next.receipt};
 }
 if(event.type==='SUBMIT'){
  if(current.state!=='PREPARED')throw Error('External submission cannot be repeated');
  if(digest(event.quote)!==current.digest)throw Error('Cart or Wallet changed; prepare a new redemption');
  if(now>=deadline)throw Error('Redemption expired before submission');
  return {...change('SUBMITTING'),submittedAt:new Date(now).toISOString()};
 }
 if(event.type==='TIMEOUT'){
  if(current.state==='SUBMITTING')return change('UNKNOWN','Provider outcome is unknown; keep credit reserved');
  if(['UNKNOWN','HELD'].includes(current.state))return clone(current);
  throw Error('No pending provider request');
 }
 if(event.type==='RELEASE_UNSUBMITTED'){
  if(current.state!=='PREPARED')throw Error('Submitted or uncertain credit cannot be released by a timer');
  return change('RELEASED','No provider submission was made');
 }
 throw Error('Unsupported redemption transition');
}
