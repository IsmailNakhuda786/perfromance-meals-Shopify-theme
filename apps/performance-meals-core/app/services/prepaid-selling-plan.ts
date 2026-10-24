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
    // Request the approved full-term price explicitly. Shopify can still
    // round its delivery allocation; native checkout must prove exact cents.
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

// Arithmetic plan only: quote exact approved package totals and the correction
// that a native multi-package checkout must prove. This is not a discount writer.
export function prepaidExactPriceCorrectionCandidate(spec:PrepaidPlanSpec,packageQuantity=1){
 prepaidSellingPlanCandidate(spec);
 if(!Number.isSafeInteger(packageQuantity)||packageQuantity<1||packageQuantity*spec.months>2147483647)throw Error('Valid prepaid package count required');
 const grossPerPackageMinor=Math.ceil(spec.upfrontMinor/spec.months)*spec.months;
 const expectedTotalMinor=spec.upfrontMinor*packageQuantity,grossTotalMinor=grossPerPackageMinor*packageQuantity;
 if(!Number.isSafeInteger(grossTotalMinor)||grossTotalMinor>2147483647)throw Error('Prepaid aggregate exceeds supported money range');
 return {packageQuantity,perPackageMinor:spec.upfrontMinor,expectedTotalMinor,grossPerPackageMinor,grossTotalMinor,discountPerPackageMinor:grossPerPackageMinor-spec.upfrontMinor,totalCorrectionMinor:grossTotalMinor-expectedTotalMinor,currency:'SGD' as const,nativeCheckoutVerified:false as const,futureRenewalVerified:false as const};
}
