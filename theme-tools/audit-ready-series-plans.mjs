import {readFileSync} from 'node:fs';
import {catalogue} from './approved-catalogue.mjs';
import {auditReadySeriesPlan} from './ready-series-billing.mjs';

const input = process.argv[2];
if (!input) throw new Error('Pass a native Shopify ReadySeriesPlans readback file');
const {data} = JSON.parse(readFileSync(input, 'utf8'));
if (data?.shop?.myshopifyDomain !== 'performance-meals-development.myshopify.com' || data.shop.currencyCode !== 'SGD') throw new Error('Wrong store or currency');
if (data.products.pageInfo.hasNextPage) throw new Error('Incomplete product readback');
const results = [...new Set(catalogue.subscriptions.map(item => item.name))].map(name => {
  const products = data.products.nodes.filter(product => product.title === name);
  if (products.length !== 1) return {name, valid: false, issues: ['Missing or ambiguous approved product']};
  const product = products[0];
  if (product.variants.pageInfo.hasNextPage || product.sellingPlanGroups.pageInfo.hasNextPage || product.sellingPlanGroups.nodes.some(group => group.sellingPlans.pageInfo.hasNextPage)) throw new Error('Incomplete variant or selling-plan readback');
  const plans = product.sellingPlanGroups.nodes.flatMap(group => group.sellingPlans.nodes);
  const terms = [3, 6].map(months => {
    const matches = plans.filter(plan => plan.name === `${months} months`);
    return {months, ...(matches.length === 1 ? auditReadySeriesPlan(matches[0], months) : {valid: false, issues: ['Missing or ambiguous approved term']})};
  });
  const variants = catalogue.subscriptions.filter(item => item.name === name).map(source => {
    const matches = product.variants.nodes.filter(variant => variant.title === source.variant);
    return {name: source.variant, valid: matches.length === 1, approvedPrice3m: source.price3m, approvedPrice6m: source.price6m};
  });
  return {name, productId: product.id, valid: terms.every(term => term.valid) && variants.every(variant => variant.valid), terms, variants};
});
console.log(JSON.stringify({sourceCommit: catalogue.sourceCommit, store: data.shop.myshopifyDomain, scope: 'Read-only configuration audit; not pricing, payment or contract acceptance', results}, null, 2));
if (results.some(result => !result.valid)) process.exitCode = 1;
