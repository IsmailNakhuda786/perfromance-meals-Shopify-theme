import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';

// PostgreSQL checks use an isolated generated client; the running SQLite app is untouched.
const postgresClient=process.env.CORE_TEST_POSTGRES_CLIENT;
const module=await import(postgresClient?pathToFileURL(postgresClient).href:'@prisma/client');
export const PrismaClient=module.PrismaClient;
export function buildServices(options) {
 return build({...options,...(postgresClient?{alias:{'@prisma/client':postgresClient},external:[...(options.external||[]),postgresClient]}:{})});
}
