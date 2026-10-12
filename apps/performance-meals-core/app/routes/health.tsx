import db from '../db.server';
import {productionConfigIssues} from '../services/runtime-config.server';
export async function loader(){
 const headers={'Cache-Control':'no-store','Content-Type':'application/json'};
 try{
  if(process.env.NODE_ENV==='production'&&productionConfigIssues(process.env).length)throw new Error('Configuration unavailable');
  await db.$queryRaw`SELECT 1`;
  return Response.json({status:'ok'},{headers});
 }catch{return Response.json({status:'unavailable'},{status:503,headers});}
}
