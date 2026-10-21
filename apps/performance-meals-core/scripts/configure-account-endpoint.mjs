import {writeFileSync,readFileSync,existsSync,utimesSync} from 'node:fs';
// Shopify CLI supplies APP_URL for the active development tunnel.
const source=process.env.NODE_ENV==='development'&&process.env.APP_URL?process.env.APP_URL:process.env.PERFORMANCE_MEALS_APP_URL||process.env.SHOPIFY_APP_URL;
if(!source) throw new Error('Set PERFORMANCE_MEALS_APP_URL to the installed app HTTPS backend before building.');
const url=new URL(source);
if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash) throw new Error('The app endpoint must be a trusted HTTPS origin.');
const notifyPreview=process.argv.includes('--notify-preview');
if(notifyPreview&&process.env.NODE_ENV!=='development')throw new Error('Preview notification is development-only.');
const target=new URL('../extensions/performance-meals-account/src/app-endpoint.generated.js',import.meta.url);
const content=`export const APP_URL=${JSON.stringify(url.origin)};\n`;
if(!existsSync(target)||readFileSync(target,'utf8')!==content)writeFileSync(target,content);
// CLI's first extension build can precede its web predev command. The generated
// file is ignored, so notify the watched entry AFTER database setup, once per
// preview startup. Its contents do not change and no development URL is tracked.
if(notifyPreview){
 const entry=new URL('../extensions/performance-meals-account/src/OrderStatusBlock.jsx',import.meta.url);
 const now=new Date();utimesSync(entry,now,now);
}
