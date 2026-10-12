import {productionConfigIssues} from '../app/services/runtime-config.server.ts';
const issues=productionConfigIssues(process.env);
if(issues.length){console.error('Deployment blocked: '+issues.join('; '));process.exitCode=1;}else console.log('Production configuration passed (secret values omitted).');
