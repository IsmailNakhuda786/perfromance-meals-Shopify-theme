import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';

// Isolated clients keep fixture databases separate from the running app's
// provider. Preserve the existing PostgreSQL override for earlier QA scripts.
const postgresClient=process.env.CORE_TEST_DATABASE_CLIENT||process.env.CORE_TEST_POSTGRES_CLIENT;
const module=await import(postgresClient?pathToFileURL(postgresClient).href:'@prisma/client');
export const PrismaClient=module.PrismaClient;
export function buildServices(options) {
 return build({...options,...(postgresClient?{alias:{'@prisma/client':postgresClient},external:[...(options.external||[]),postgresClient]}:{})});
}
