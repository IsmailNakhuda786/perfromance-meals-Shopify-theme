export type PrepaidPlanSpec={productGid:string;variantGid:string;months:3|6;upfrontMinor:number};

// Build a candidate from an approved server-side package snapshot. This does
// not write Shopify data, prove checkout pricing or enable a product for sale.
export function prepaidSellingPlanCandidate(spec:PrepaidPlanSpec){
 if(!spec||!/^gid:\/\/shopify\/Product\/\d+$/.test(spec.productGid)||!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(spec.variantGid)||![3,6].includes(spec.months)||!Number.isSafeInteger(spec.upfrontMinor)||spec.upfrontMinor<1||spec.upfrontMinor>2147483647)throw Error('Approved prepaid package snapshot required');
 const fixedValue=(spec.upfrontMinor/100).toFixed(2);
 return {
  resources:{productVariantIds:[spec.variantGid]},
  input:{
   name:`Ready Series ${spec.months}-month prepaid`,
   merchantCode:`core-prepaid-${spec.variantGid.split('/').at(-1)}-${spec.months}`,
   options:['Prepaid term'],
   sellingPlansToCreate:[{
    name:`${spec.months} deliveries; renew every ${spec.months} months`,
    options:[`${spec.months} months`],category:'SUBSCRIPTION',
    billingPolicy:{recurring:{interval:'MONTH',intervalCount:spec.months,minCycles:1}},
    deliveryPolicy:{recurring:{interval:'MONTH',intervalCount:1}},
    // An explicit full-term price avoids deriving a rounded monthly amount.
    // Native allocation AND checkout totals still have to match this amount.
    pricingPolicies:[{fixed:{adjustmentType:'PRICE',adjustmentValue:{fixedValue}}}],
   }],
  },
  expected:{...spec,currency:'SGD' as const,automaticRenewal:true as const,deliveryIncluded:true as const},
  // Uniform whole-cent deliveries cannot divide these totals exactly. The
  // native 3/6-delivery QA exposed truncation; never hide that discrepancy.
  fractionalDeliveryCents:spec.upfrontMinor%spec.months!==0,
  nativeCheckoutVerified:false as const,
 };
}

// Exact native allocation evidence, not a calculated per-delivery estimate.
// A valid plan on another variant must never unlock this term's purchase.
export function assertPrepaidAllocation(spec:PrepaidPlanSpec,allocation:{variantGid:string;sellingPlanGid:string;priceMinor:number;currency:string;recurring:boolean}){
 prepaidSellingPlanCandidate(spec);
 if(!allocation||allocation.variantGid!==spec.variantGid||!/^gid:\/\/shopify\/SellingPlan\/\d+$/.test(allocation.sellingPlanGid)||allocation.priceMinor!==spec.upfrontMinor||allocation.currency!=='SGD'||allocation.recurring!==true)throw Error('Native prepaid allocation differs from approved term');
 return {variantGid:spec.variantGid,sellingPlanGid:allocation.sellingPlanGid,months:spec.months,upfrontMinor:spec.upfrontMinor,currency:'SGD' as const,paymentVerified:false as const};
}
