import fs from 'node:fs';import {execFileSync} from 'node:child_process';import path from 'node:path';
const dir='work/naming-audit',cli=path.resolve('work/shopify-cli/node_modules/.bin/shopify'),audit=JSON.parse(fs.readFileSync(dir+'/before.json'));
const query=fs.readFileSync(dir+'/update.graphql','utf8').trim().split('\n')[2];
for(const p of audit.products.nodes.filter(p=>p.sellingPlanGroups.nodes.length)){
 const group=p.sellingPlanGroups.nodes[0];
 const name=p.handle==='pm-qa-biweekly'?'Biweekly':'Just Protein';
 const plans=group.sellingPlans.nodes.map((plan,i)=>({id:plan.id,name:p.handle==='pm-qa-biweekly'?'Biweekly':plan.options[0]}));
 fs.writeFileSync(dir+'/plan-operation.graphql',query);fs.writeFileSync(dir+'/plan-variables.json',JSON.stringify({id:group.id,input:{name,sellingPlansToUpdate:plans}}));
 execFileSync(cli,['store','execute','--store','performance-meals-development.myshopify.com','--version','2026-10','--query-file',dir+'/plan-operation.graphql','--variable-file',dir+'/plan-variables.json','--allow-mutations','--output-file',dir+'/plan-result.json','--json'],{stdio:'pipe'});
 const result=JSON.parse(fs.readFileSync(dir+'/plan-result.json'));if(result.errors?.length||result.sellingPlanGroupUpdate.userErrors.length)throw Error(JSON.stringify(result.errors||result.sellingPlanGroupUpdate.userErrors));fs.appendFileSync(dir+'/plan-changes.jsonl',JSON.stringify(result)+'\n');
}
