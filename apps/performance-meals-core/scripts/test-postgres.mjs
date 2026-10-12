import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const envFile=process.argv[2];
if(!envFile)throw new Error('Provide the ignored PostgreSQL environment file.');
process.loadEnvFile(envFile);
if(!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL||''))throw new Error('PostgreSQL connection required.');
process.env.DIRECT_DATABASE_URL||=process.env.DATABASE_URL_UNPOOLED;
const directory=resolve('node_modules/.cache/postgres-validation');
mkdirSync(directory,{recursive:true});
const schema=readFileSync('prisma/production/schema.prisma','utf8').replace('provider = "prisma-client-js"','provider = "prisma-client-js"\n  output = "./client"');
writeFileSync(resolve(directory,'schema.prisma'),schema);
function run(command,args,env=process.env) {
 const result=spawnSync(command,args,{env,encoding:'utf8'});
 // Database credentials must never reach test logs.
 console.log(((result.stdout||'')+(result.stderr||'')).replace(/postgres(?:ql)?:\/\/\S+/g,'[REDACTED DATABASE URL]'));
 if(result.status!==0)throw new Error('PostgreSQL validation failed.');
}
run(resolve('node_modules/.bin/prisma'),['generate','--schema',resolve(directory,'schema.prisma')],{...process.env,PRISMA_GENERATE_SKIP_AUTOINSTALL:'true'});
process.env.CORE_TEST_POSTGRES_CLIENT=resolve(directory,'client/index.js');
const {PrismaClient}=await import(process.env.CORE_TEST_POSTGRES_CLIENT);
const db=new PrismaClient();
try {
 const shops=['core-fixture.myshopify.com','menu-fixture.myshopify.com'];
 for(const model of ['mealPlanDraft','mealPlanSelection','mealPlanMenuRevision','operationalLine','webhookReceipt']) {
  if(await db[model].count({where:{shop:{in:shops}}}))throw new Error('Existing test namespace records found; refusing to overwrite or remove them.');
 }
}finally{await db.$disconnect();}
run(process.execPath,['--test','--test-concurrency=1','tests/core.test.mjs','tests/programme-menus.test.mjs']);
