export function productionConfigIssues(env:Record<string,string|undefined>){
 const problems:string[]=[];
 for(const key of ['SHOPIFY_API_KEY','SHOPIFY_API_SECRET','SHOPIFY_APP_URL','PERFORMANCE_MEALS_APP_URL','DATABASE_URL','DIRECT_DATABASE_URL','ALLOWED_SHOP','SCOPES'])if(!env[key])problems.push(key);
 if(env.DATABASE_URL&&!/^postgres(ql)?:\/\//.test(env.DATABASE_URL))problems.push('DATABASE_URL must use persistent PostgreSQL');
 if(env.DIRECT_DATABASE_URL&&!/^postgres(ql)?:\/\//.test(env.DIRECT_DATABASE_URL))problems.push('DIRECT_DATABASE_URL must use PostgreSQL');
 for(const key of ['SHOPIFY_APP_URL','PERFORMANCE_MEALS_APP_URL']){
  try{const u=new URL(env[key]||'');if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.hostname==='example.com'||u.hostname.endsWith('.trycloudflare.com'))problems.push(`${key} must be a permanent HTTPS origin`);}catch{problems.push(`${key} must be a permanent HTTPS origin`);}
 }
 if(env.SHOPIFY_APP_URL!==env.PERFORMANCE_MEALS_APP_URL)problems.push('Application and account origins must match');
 if(env.ALLOWED_SHOP&&!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(env.ALLOWED_SHOP))problems.push('ALLOWED_SHOP must name one authorized Shopify store');
 if(env.WALLET_CORE_EXPIRY_ENABLED==='true')problems.push('Core-managed Wallet expiry is development-only until durable scheduling and native checkout protection are verified');
 if(env.WALLET_EXPIRY_REMINDERS_ENABLED==='true')problems.push('Wallet expiry email delivery is development-only until provider receipts and durable scheduling are verified');
 if(env.GIFT_CARD_EXPIRY_WRITES_ENABLED==='true')problems.push('Gift Card expiry writes are development-only until native issuance and expiry QA are verified');
 if(env.GIFT_CARD_EXPIRY_REMINDERS_ENABLED==='true')problems.push('Gift Card reminders are development-only until recipient delivery and durable scheduling are verified');
 if(env.WALLET_LEGACY_TOP_UP_QA_ENABLED==='true')problems.push('Legacy Wallet top-up QA cannot be activated in production');
 if(env.WALLET_PACKAGE_PIPELINE_ENABLED==='true')problems.push('Wallet package verification/accounting is development-only; issuance is not approved');
 if(env.CORE_WALLET_DRAFTS_ENABLED==='true')problems.push('Core Wallet draft persistence is development-only and is not payment authorization');
 if(env.CORE_SUBSCRIPTION_RENEWAL_STOPS_ENABLED==='true')problems.push('Customer future-renewal stops are development-only until native authenticated management QA passes');
 if(env.CORE_PREPAID_RENEWAL_LINKS_ENABLED==='true')problems.push('Automatic prepaid renewal linking is development-only until full native lifecycle and durable worker acceptance');
 if(env.CORE_PREPAID_PURCHASE_INTAKE_ENABLED==='true')problems.push('Automatic prepaid purchase intake is development-only until pricing provisioning and durable worker acceptance');
 return [...new Set(problems)];
}
