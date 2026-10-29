const money=minor=>new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',currencyDisplay:'code'}).format(minor/100);
export function PrepaidPrice({pricing,status}){
 if(!pricing)return null;
 if(!pricing.available)return <s-paragraph>Your package price could not be verified. Contact Support before renewing or changing the package.</s-paragraph>;
 return <>
  <s-paragraph>Confirmed package total: {money(pricing.netMinor)} for {pricing.packages} package{pricing.packages===1?'':'s'} over {pricing.months} months. Delivery is included.</s-paragraph>
  {pricing.adjustmentMinor>0&&<s-paragraph>The {money(pricing.grossMinor)} subtotal is reduced by an automatic {money(pricing.adjustmentMinor)} price adjustment. Shopify may show the subtotal before this adjustment in its recurring-price summary.</s-paragraph>}
  {status==='ACTIVE'&&pricing.nextBillingAt&&<s-paragraph>Next scheduled renewal: {new Intl.DateTimeFormat('en-SG',{timeZone:'Asia/Singapore',dateStyle:'long',timeStyle:'short'}).format(new Date(pricing.nextBillingAt))} (Singapore time).</s-paragraph>}
 </>;
}
