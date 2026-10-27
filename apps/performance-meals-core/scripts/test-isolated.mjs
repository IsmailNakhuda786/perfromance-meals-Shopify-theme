import {mkdtempSync,readFileSync,writeFileSync,cpSync,readdirSync,rmSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// Business-logic regression uses a disposable SQLite database. PostgreSQL/native
// integration is a separate gate; this command never targets the app database.
const root=process.cwd();
mkdirSync(join(root,'.shopify'),{recursive:true});
const temp=mkdtempSync(join(root,'.shopify','regression-')); 
try{
 const source=readFileSync(join(root,'prisma/schema.prisma'),'utf8');
 if(!/provider\s*=\s*"sqlite"/.test(source)||!/^generator client\s*\{/m.test(source))throw Error('Canonical SQLite fixture schema required');
 const client=join(temp,'client');
 const schema=source.replace(/generator client\s*\{[^}]*\}/,`generator client {\n provider = "prisma-client-js"\n output = ${JSON.stringify(client)}\n}`);
 const schemaPath=join(temp,'schema.prisma');writeFileSync(schemaPath,schema);
 cpSync(join(root,'prisma/migrations'),join(temp,'migrations'),{recursive:true});
 writeFileSync(join(temp,'fixture.sqlite'),'');
 const env={...process.env,NODE_ENV:'test',DATABASE_URL:`file:${join(temp,'fixture.sqlite')}`,DIRECT_DATABASE_URL:'',CORE_TEST_DATABASE_CLIENT:join(client,'index.js'),PRISMA_GENERATE_SKIP_AUTOINSTALL:'true'};
 const prisma=resolve(root,'node_modules/prisma/build/index.js');
 for(const args of [['generate','--schema',schemaPath],['migrate','deploy','--schema',schemaPath]]){
  const result=spawnSync(process.execPath,[prisma,...args],{cwd:root,env,encoding:'utf8'});
  if(result.status!==0){process.stderr.write(`Prisma ${args[0]} failed\n${result.stdout||''}${result.stderr||''}`);throw Error('Disposable fixture setup failed');}
 }
 const available=readdirSync(join(root,'tests')).filter(name=>name.endsWith('.test.mjs')).sort();
 const selected=process.argv.slice(2);
 if(selected.some(name=>!available.includes(name.replace(/^tests\//,''))))throw Error('Select existing test files inside tests/ only.');
 const files=(selected.length?selected.map(name=>name.replace(/^tests\//,'')):available).map(name=>join(root,'tests',name));
 // Separate test files share one disposable SQLite file. Serialize by default
 // to avoid cross-file lock timeouts on a busy Mac. In-file race tests still
 // exercise concurrent requests; an explicit bounded override remains available.
 const concurrency=process.env.CORE_TEST_CONCURRENCY??'1';
 if(!/^[1-4]$/.test(concurrency))throw Error('Test concurrency must be 1–4.');
 const result=spawnSync(process.execPath,['--test',`--test-concurrency=${concurrency}`,...files],{cwd:root,env,stdio:'inherit'});
 if(result.error)throw result.error;
 process.exitCode=result.status??1;
}finally{rmSync(temp,{recursive:true,force:true});}
