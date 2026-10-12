import fs from 'node:fs';
const source=fs.readFileSync('prisma/schema.prisma','utf8');
const target=source.replace('provider = "sqlite"','provider = "postgresql"').replace('url = env("DATABASE_URL")','url = env("DATABASE_URL")\n  directUrl = env("DIRECT_DATABASE_URL")');
fs.mkdirSync('prisma/production',{recursive:true});
if(process.argv.includes('--check')){if(fs.readFileSync('prisma/production/schema.prisma','utf8')!==target)throw new Error('Production schema differs from canonical models');}else fs.writeFileSync('prisma/production/schema.prisma',target);
