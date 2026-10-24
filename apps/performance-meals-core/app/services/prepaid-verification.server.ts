import {assertShop} from './security.server';
import {prepaidPackageQuantity} from './prepaid-package-quantity';

export const PREPAID_CONTRACT_QUERY = `#graphql
query ReadySeriesPrepaidContract($id: ID!) {
 shop { myshopifyDomain currencyCode }
 currentAppInstallation { app { id } }
 subscriptionContract(id: $id) {
  id status currencyCode app { id } customer { id }
  billingPolicy { interval intervalCount minCycles maxCycles }
  deliveryPolicy { interval intervalCount }
  originOrder { id name test currencyCode customer { id } }
  lines(first: 100) { nodes { id productId variantId sellingPlanId quantity currentPrice { amount currencyCode } } pageInfo { hasNextPage endCursor } }
 }
}
`;
type Admin = {graphql: (query: string, options: {variables: Record<string, unknown>}) => Promise<Response>};
type Policy = {interval: string; intervalCount: number; minCycles?: number | null; maxCycles?: number | null};
type Contract = {
 id: string; status: string; currencyCode: string; app: {id: string} | null; customer: {id: string} | null;
 billingPolicy: Policy; deliveryPolicy: Policy;
 originOrder: {id: string; name: string; test: boolean; currencyCode: string; customer: {id: string} | null} | null;
 lines: {nodes: Array<{id: string; productId: string | null; variantId: string | null; sellingPlanId: string | null; quantity: number; currentPrice: {amount: string; currencyCode: string}}>; pageInfo: {hasNextPage: boolean}};
};
export type PrepaidExpectation = {packageQuantity?:number;months: 3 | 6; appGid: string; customerGid: string; orderGid: string; productGid: string; variantGid: string; sellingPlanGid: string};

// Read-only configuration evidence. Never creates a contract, charge, or acceptance flag.
export async function inspectPrepaidContract(admin: Admin, shop: string, contractGid: string, expected: PrepaidExpectation) {
 assertShop(shop);
 if (!/^gid:\/\/shopify\/SubscriptionContract\/\d+$/.test(contractGid)) throw new Error('Invalid contract reference');
 if (expected.months !== 3 && expected.months !== 6) throw new Error('Invalid prepaid term');
 const {packages}=prepaidPackageQuantity(expected.months,expected.packageQuantity);
 for (const [key, type] of [['appGid', 'App'], ['customerGid', 'Customer'], ['orderGid', 'Order'], ['productGid', 'Product'], ['variantGid', 'ProductVariant'], ['sellingPlanGid', 'SellingPlan']] as const) {
  if (!new RegExp('^gid://shopify/' + type + '/\\d+$').test(expected[key])) throw new Error('Invalid expected native reference');
 }
 const response = await admin.graphql(PREPAID_CONTRACT_QUERY, {variables: {id: contractGid}});
 const body = await response.json() as {errors?: unknown; data?: {shop: {myshopifyDomain: string; currencyCode: string}; currentAppInstallation:{app:{id:string}}; subscriptionContract: Contract | null}};
 if (!response.ok || body.errors || !body.data?.subscriptionContract) throw new Error('Native contract verification unavailable');
 if (body.data.shop.myshopifyDomain !== shop) throw new Error('Wrong native store');
 const contract = body.data.subscriptionContract;
 if (contract.lines?.pageInfo?.hasNextPage!==false||!Array.isArray(contract.lines.nodes)||!contract.lines.nodes.length||contract.lines.nodes.length>100) throw new Error('Contract lines require complete pagination evidence');
 if(new Set(contract.lines.nodes.map(line=>line?.id)).size!==contract.lines.nodes.length)throw Error('Duplicate contract lines');
 const issues: string[] = [];
 if (body.data.currentAppInstallation?.app?.id!==expected.appGid || contract.id !== contractGid || contract.app?.id !== expected.appGid) issues.push('Contract is not owned by the expected app');
 if (contract.customer?.id !== expected.customerGid || contract.originOrder?.customer?.id !== expected.customerGid) issues.push('Customer identity differs from the original order');
 if (contract.originOrder?.id !== expected.orderGid || contract.originOrder?.test !== true) issues.push('Expected original test order is missing');
 if ([body.data.shop.currencyCode, contract.currencyCode, contract.originOrder?.currencyCode].some(currency => currency !== 'SGD')) issues.push('Currency is not SGD');
 const billing = contract.billingPolicy;
 if (billing.interval !== 'MONTH' || billing.intervalCount !== expected.months || billing.minCycles !== 1 || billing.maxCycles !== null) issues.push('Billing must charge the full prepaid term and renew without a fixed cycle cap');
 const lines = contract.lines.nodes.filter(line => line.productId === expected.productGid && line.variantId === expected.variantGid && line.sellingPlanId === expected.sellingPlanGid);
 if (lines.length !== 1 || lines[0].quantity !== packages || lines[0].currentPrice.currencyCode !== 'SGD') issues.push('Approved product, variant, plan or quantity does not match');
 const delivery=contract.deliveryPolicy;
 const deliveryPolicyMatches=delivery?.interval==='MONTH'&&delivery.intervalCount===1;
 const deliveryIssues=deliveryPolicyMatches?[]:['Delivery policy must repeat monthly independently of calendar-month billing'];
 return {configurationMatches: false, billingConfigurationMatches: issues.length === 0, deliveryPolicyMatches, deliveryCalendarPending: false, issues:[...issues,...deliveryIssues], contract,
  pendingEvidence: ['Exact approved upfront transaction amount', 'Actual scheduled fulfillment orders under the approved monthly calendar and merchant availability', 'Core operational-line reconciliation', 'Automatic term renewal and cancellation behavior']};
}
