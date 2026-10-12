import {writeFileSync} from 'node:fs';
// Shopify CLI supplies APP_URL for the active development tunnel.
const source=process.env.NODE_ENV==='development'&&process.env.APP_URL?process.env.APP_URL:process.env.PERFORMANCE_MEALS_APP_URL||process.env.SHOPIFY_APP_URL;
if(!source) throw new Error('Set PERFORMANCE_MEALS_APP_URL to the installed app HTTPS backend before building.');
const url=new URL(source);
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash) throw new Error('The app endpoint must be a trusted HTTPS origin.');
const target=new URL('../extensions/performance-meals-account/src/app-endpoint.generated.js',import.meta.url);
writeFileSync(target,`export const APP_URL=${JSON.stringify(url.origin)};\n`);
