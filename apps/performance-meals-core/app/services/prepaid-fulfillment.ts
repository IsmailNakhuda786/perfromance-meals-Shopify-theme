type FulfillmentEvidence = {
 id: string; orderGid: string; lineGid: string; fulfillAt: string | null;
 status: string; quantity: number;
};

// Inspect native fulfillment evidence; never invent dates or create extra orders.
export function verifyMonthlyFulfillments(
 evidence: FulfillmentEvidence[],
 expected: {months: 3 | 6; orderGid: string; lineGid: string; quantityPerDelivery: number},
) {
 if (![3, 6].includes(expected.months) || !Number.isSafeInteger(expected.quantityPerDelivery) || expected.quantityPerDelivery < 1) throw new Error('Invalid prepaid entitlement');
 if (!/^gid:\/\/shopify\/Order\/\d+$/.test(expected.orderGid) || !/^gid:\/\/shopify\/LineItem\/\d+$/.test(expected.lineGid)) throw new Error('Invalid original order reference');
 const selected = evidence.filter(item => item.lineGid === expected.lineGid);
 const issues: string[] = [];
 if (selected.length !== expected.months) issues.push('Monthly delivery count does not match the purchased term');
 if (new Set(selected.map(item => item.id)).size !== selected.length) issues.push('Duplicate fulfillment evidence');
 const months: number[] = [];
 const formatter = new Intl.DateTimeFormat('en-SG', {timeZone: 'Asia/Singapore', year: 'numeric', month: 'numeric'});
 for (const item of selected) {
  if (!/^gid:\/\/shopify\/FulfillmentOrder\/\d+$/.test(item.id) || item.orderGid !== expected.orderGid) issues.push('Fulfillment must belong to the original Shopify order');
  if (item.status === 'CANCELLED') issues.push('Cancelled fulfillment does not prove delivery coverage');
  if (item.quantity !== expected.quantityPerDelivery) issues.push('Monthly delivery quantity does not match the purchased entitlement');
  const date = item.fulfillAt ? new Date(item.fulfillAt) : null;
  if (!date || !Number.isFinite(date.getTime())) {issues.push('Native scheduled delivery date is missing');continue;}
  const parts = formatter.formatToParts(date);
  months.push(Number(parts.find(part => part.type === 'year')?.value) * 12 + Number(parts.find(part => part.type === 'month')?.value));
 }
 months.sort((a, b) => a - b);
 if (months.some((month, index) => index > 0 && month !== months[index - 1] + 1)) issues.push('Deliveries must cover consecutive Singapore calendar months');
 return {scheduleMatches: issues.length === 0, issues, deliveryCount: selected.length};
}
