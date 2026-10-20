type Policy={interval:string;intervalCount:number};
// Shopify expands prepaid checkout quantity into the deliveries paid by one
// order. Only exact same-interval ratios are supported; never approximate months
// as days/weeks. This changes native evidence matching, not merchant entitlements.
export function nativeSubscriptionOrderQuantity(quantity:number,billing:Policy,delivery:Policy){
 if(!Number.isSafeInteger(quantity)||quantity<1||!billing||!delivery||!['DAY','WEEK','MONTH','YEAR'].includes(billing.interval)||billing.interval!==delivery.interval||!Number.isSafeInteger(billing.intervalCount)||!Number.isSafeInteger(delivery.intervalCount)||billing.intervalCount<1||delivery.intervalCount<1||billing.intervalCount%delivery.intervalCount!==0)throw Error('Native subscription quantity policy requires review');
 const deliveries=billing.intervalCount/delivery.intervalCount,value=quantity*deliveries;
 if(deliveries<1||deliveries>1000||!Number.isSafeInteger(value)||value>2147483647)throw Error('Native subscription quantity exceeds supported range');
 return value;
}
