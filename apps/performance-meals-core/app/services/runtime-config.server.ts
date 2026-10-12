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
 return [...new Set(problems)];
}
