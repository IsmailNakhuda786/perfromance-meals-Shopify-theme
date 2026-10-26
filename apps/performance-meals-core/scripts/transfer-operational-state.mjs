import {PrismaClient,Prisma} from '@prisma/client';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {snapshotFields,validateSnapshot,exportOperationalSnapshot,importOperationalSnapshot} from './operational-snapshot.mjs';
const [mode,file]=process.argv.slice(2),shop=process.env.ALLOWED_SHOP;
if(!shop||!file||!['export','import'].includes(mode))throw new Error('Provide export|import, a protected local file, and ALLOWED_SHOP.');
const postgres=/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL||'');
if(mode==='import'&&!postgres)throw new Error('Import requires the PostgreSQL client and database URL.');
const db=new PrismaClient(),fields=snapshotFields(Prisma.dmmf.datamodel.models);
try{
 if(mode==='export'){
  if(existsSync(file))throw new Error('Refusing to overwrite an existing evidence snapshot.');
  const snapshot=await db.$transaction(tx=>exportOperationalSnapshot(tx,shop,fields),{timeout:60000,...(postgres?{isolationLevel:'RepeatableRead'}:{})});
  writeFileSync(file,JSON.stringify(snapshot),{mode:0o600,flag:'wx'});
  console.log('Protected complete operational snapshot created; OAuth credentials excluded.');
 }else{
  const snapshot=JSON.parse(readFileSync(file,'utf8'));validateSnapshot(snapshot,shop,fields);
  await db.$transaction(tx=>importOperationalSnapshot(tx,snapshot,shop,fields),{timeout:60000,isolationLevel:'Serializable'});
  console.log('Operational snapshot imported atomically without overwriting conflicts. Reauthenticate Shopify.');
 }
}finally{await db.$disconnect();}
