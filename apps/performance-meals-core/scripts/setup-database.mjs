import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';

const command=process.argv[2];
if(!['generate','migrate'].includes(command))throw new Error('Use generate or migrate.');
if(!process.env.DATABASE_URL&&existsSync('.env'))process.loadEnvFile('.env');
const url=process.env.DATABASE_URL||'';
const postgres=/^postgres(ql)?:\/\//.test(url);
if(!postgres&&!url.startsWith('file:'))throw new Error('Unsupported database configuration.');
if(process.env.NODE_ENV==='production'&&!postgres)throw new Error('Production requires PostgreSQL.');
if(postgres&&!process.env.DIRECT_DATABASE_URL)throw new Error('Direct PostgreSQL connection required for migrations.');
const schema=postgres?'prisma/production/schema.prisma':'prisma/schema.prisma';
const args=command==='generate'?['generate']:['migrate','deploy'];
const result=spawnSync(resolve('node_modules/.bin/prisma'),[...args,'--schema',schema],{stdio:'inherit',env:{...process.env,PRISMA_GENERATE_SKIP_AUTOINSTALL:'true'}});
process.exit(result.status??1);
