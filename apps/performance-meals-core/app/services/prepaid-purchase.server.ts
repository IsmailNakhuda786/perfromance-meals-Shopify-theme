import {inspectPrepaidContract,type PrepaidExpectation} from './prepaid-verification.server';
import {readPrepaidPayment,type PrepaidPaymentExpectation} from './prepaid-payment.server';
import {minorAmount} from './gift-card-native.server';

type Admin=Parameters<typeof readPrepaidPayment>[0];
export type PrepaidPurchaseExpectation=PrepaidExpectation&PrepaidPaymentExpectation;

// One read-only evidence boundary for preparing internal delivery drafts. The
// expected references/value are an approved server snapshot. This never books a
// slot, creates a native fulfillment, enables sending or proves a future renewal.
export async function inspectPrepaidPurchase(admin:Admin,shop:string,contractGid:string,expected:PrepaidPurchaseExpectation){
 const contractProof=await inspectPrepaidContract(admin,shop,contractGid,expected);
 const contract=contractProof.contract;
 if(!contractProof.billingConfigurationMatches||!contractProof.deliveryPolicyMatches||contract.status!=='ACTIVE'||contract.lines.nodes.length!==1)throw Error('Prepaid contract requires review before draft preparation');
 const line=contract.lines.nodes[0];
 if(!/^gid:\/\/shopify\/SubscriptionLine\/\d+$/.test(line.id)||typeof line.currentPrice.amount!=='string'||minorAmount(line.currentPrice.amount)<1)throw Error('Native per-delivery contract price unavailable');
 const payment=await readPrepaidPayment(admin,shop,expected);
 return {contractGid,contractLineGid:line.id,months:expected.months,perDeliveryContractPriceMinor:minorAmount(line.currentPrice.amount),renewalPriceVerified:false as const,payment,draftPreparationOnly:true as const,nativeScheduleVerified:false as const,
  pendingEvidence:['Current merchant slot availability and capacity','Actual native fulfillment schedule','Automatic term renewal and management','Approved sender activation']};
}
