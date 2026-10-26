import db from '../db.server';
import {assertPrepaidEvidenceId,assertPrepaidRenewalEvidenceScope,readRegisteredPrepaidPurchase} from './prepaid-renewal-evidence.server';
import {inspectPrepaidContract} from './prepaid-verification.server';
import {readCorrectedPrepaidPayment,readPrepaidPayment} from './prepaid-payment.server';
import {minorAmount} from './gift-card-native.server';
import {validSubscriptionLineGid} from './subscription-reference';

type Admin=Parameters<typeof inspectPrepaidContract>[0];

// Read existing paid proof again before preparing inactive delivery drafts.
// This proves the purchased entitlement, not a future renewal or a booking.
export async function inspectRegisteredPrepaidPurchase(admin:Admin,shop:string,purchaseEvidenceId:string){
 const customer=assertPrepaidRenewalEvidenceScope(shop);assertPrepaidEvidenceId(purchaseEvidenceId);
 const row=await db.prepaidPurchaseEvidence.findFirst({where:{id:purchaseEvidenceId,shop,customerGid:customer}});
 if(!row)throw Error('Registered purchase unavailable');
 const saved=readRegisteredPrepaidPurchase(row),expected=saved.expected;
 const native=await inspectPrepaidContract(admin,shop,row.contractGid,expected);
 const matches=native.contract.lines.nodes.filter(line=>line.productId===expected.productGid&&line.variantId===expected.variantGid&&line.sellingPlanId===expected.sellingPlanGid);
 if(!native.billingConfigurationMatches||!native.deliveryPolicyMatches||native.contract.status!=='ACTIVE'||matches.length!==1)throw Error('Registered prepaid contract requires review before draft preparation');
 const line=matches[0],gross=minorAmount(line.currentPrice.amount);
 if(!validSubscriptionLineGid(line.id)||gross<1||gross*(expected.packageQuantity??1)!==(saved.correction?.baseMinor??expected.upfrontMinor))throw Error('Registered native contract price differs');
 const payment=saved.correction?await readCorrectedPrepaidPayment(admin,shop,expected,saved.correction):await readPrepaidPayment(admin,shop,expected);
 return {purchaseEvidenceId:row.id,purchaseHash:row.snapshotHash,contractGid:row.contractGid,contractLineGid:line.id,expected,correction:saved.correction,payment,months:expected.months,nativeContractUnitPriceMinor:gross,renewalPriceVerified:false as const,draftPreparationOnly:true as const,nativeScheduleVerified:false as const};
}
