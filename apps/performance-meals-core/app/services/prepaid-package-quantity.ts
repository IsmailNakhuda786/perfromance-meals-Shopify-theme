// Quantities are package counts; Shopify order lines represent paid deliveries.
// The upper bound is GraphQL's integer range, not a merchant buying restriction.
export function prepaidPackageQuantity(months:number,packages=1){
 if(![3,6].includes(months)||!Number.isSafeInteger(packages)||packages<1||packages*months>2147483647)throw Error('Valid prepaid package count required');
 return {packages,nativeOrderQuantity:packages*months};
}
