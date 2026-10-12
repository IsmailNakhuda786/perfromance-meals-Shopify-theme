import {PrismaClient} from '@prisma/client';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const models=['mealPlanDraft','mealPlanSelection','operationalLine','webhookReceipt','planOperation','migrationMapping','customerWallet','walletEntry','walletReservation','commercePolicy','mealPlanMenuRevision'];
const [mode,file]=process.argv.slice(2),shop=process.env.ALLOWED_SHOP;
if(!shop||!file||!['export','import'].includes(mode))throw new Error('Provide export|import, a protected local file, and ALLOWED_SHOP.');
if(mode==='import'&&!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL||''))throw new Error('Import requires the PostgreSQL client and database URL.');
const db=new PrismaClient();
try{
 if(mode==='export'){
  if(existsSync(file))throw new Error('Refusing to overwrite an existing evidence snapshot.');
  const records={};
  // Consistent snapshot; OAuth credentials are deliberately excluded. Reauthenticate after migration.
  await db.$transaction(async tx=>{for(const model of models)records[model]=await tx[model].findMany({where:{shop}});});
  writeFileSync(file,JSON.stringify({version:2,shop,records}),{mode:0o600,flag:'wx'});
  console.log('Protected operational snapshot created; OAuth credentials excluded.');
 }else{
  const snapshot=JSON.parse(readFileSync(file,'utf8'));
  const expectedModels=snapshot.version===1?models.filter(model=>model!=='mealPlanMenuRevision'):models;
  if(![1,2].includes(snapshot.version)||snapshot.shop!==shop||!snapshot.records||Object.keys(snapshot.records).sort().join()!==[...expectedModels].sort().join())throw new Error('Snapshot scope/model mismatch.');
  // Older evidence snapshots predate paid-menu revisions; preserve compatibility without changing them.
  if(snapshot.version===1)snapshot.records.mealPlanMenuRevision=[];
  await db.$transaction(async tx=>{
   for(const model of models)for(const record of snapshot.records[model]){
    if(record.shop!==shop)throw new Error('Cross-store record rejected.');
    const where=model==='commercePolicy'?{shop}:{id:record.id};
    const existing=await tx[model].findUnique({where});
    if(existing){
     const normalized=JSON.parse(JSON.stringify(existing));
     if(Object.keys(record).some(key=>JSON.stringify(normalized[key])!==JSON.stringify(record[key])))throw new Error('Conflicting destination record; nothing overwritten.');
    }else await tx[model].create({data:record});
   }
  },{timeout:60000});
  console.log('Operational snapshot imported atomically without overwriting conflicts. Reauthenticate Shopify.');
 }
}finally{await db.$disconnect();}
