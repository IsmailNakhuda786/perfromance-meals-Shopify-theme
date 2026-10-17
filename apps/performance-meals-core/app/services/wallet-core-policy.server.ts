// One server-owned activation boundary; historical credits/debits are never
// silently reinterpreted when the new Wallet policy is enabled.
export function coreWalletPolicyStartedAt(){
 if(process.env.WALLET_CORE_EXPIRY_ENABLED!=='true')throw Error('Core Wallet expiry is not activated');
 const value=process.env.WALLET_CORE_EXPIRY_STARTS_AT||'',date=new Date(value);
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,19)!==value.slice(0,19))throw Error('Verified Core expiry activation time required');
 return date;
}
