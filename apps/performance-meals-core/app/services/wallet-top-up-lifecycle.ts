import {minorAmount} from './gift-card-native.server';
import type {TopUpOrder} from './wallet-top-up-policy';

type Settlement={orderGid:string;customerGid:string;currency:string;amountMinor:number;paymentGid:string;creditGid:string|null;state:string};

// Read-only lifecycle assessment. A payment refund is not evidence of a Wallet
// reversal. Never invent a debit, negative balance or replacement funding entry.
export function assessTopUpLifecycle(order:TopUpOrder,settlement:Settlement){
 if(order.id!==settlement.orderGid||order.customer?.id!==settlement.customerGid||order.currencyCode!==settlement.currency||order.totalRefundedSet.shopMoney.currencyCode!==settlement.currency||!Array.isArray(order.disputes))throw new Error('Top-up lifecycle evidence differs');
 const paid=order.transactions.find(transaction=>transaction.id===settlement.paymentGid);
 if(!paid||paid.status!=='SUCCESS'||!['SALE','CAPTURE'].includes(paid.kind)||paid.amountSet.shopMoney.currencyCode!==settlement.currency||minorAmount(paid.amountSet.shopMoney.amount)!==settlement.amountMinor)throw new Error('Original top-up payment evidence differs');
 const refundedMinor=minorAmount(order.totalRefundedSet.shopMoney.amount);
 if(refundedMinor>settlement.amountMinor)throw new Error('Top-up refund exceeds original funding');
 const issues:string[]=[];
 if(order.cancelledAt)issues.push('CANCELLED');
 if(refundedMinor)issues.push('REFUNDED');
 if(order.disputes.length)issues.push('DISPUTED');
 if(!['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(order.displayFinancialStatus))issues.push('PAYMENT_STATE_CHANGED');
 if(order.transactions.some(transaction=>transaction.status==='SUCCESS'&&transaction.kind==='REFUND')&&!refundedMinor)issues.push('REFUND_EVIDENCE_INCONSISTENT');
 const credited=settlement.creditGid!==null;
 return {state:issues.length?(credited?'RECONCILIATION_REQUIRED':'DO_NOT_CREDIT'):'CLEAR',issues,refundedMinor,nativeWalletReversalVerified:false};
}
