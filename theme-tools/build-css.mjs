import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [path.join(dir,'node_modules/@tailwindcss/cli/dist/index.mjs'), '-i', path.join(dir,'theme.css'), '-o', path.join(dir,'../theme/assets/theme.css'), '--minify'], { stdio:'inherit', cwd:dir });

// Apply merchant palette to compiled declarations without changing approved classes/layout.
const output=path.join(dir,'../theme/assets/theme.css');
const palette={'f5b300':'--pm-ready-accent','e85d04':'--pm-plan-accent','f7f5f0':'--pm-canvas','1a1a1a':'--pm-charcoal'};
const css=fs.readFileSync(output,'utf8').replace(/(?<!\\)#(f5b300|e85d04|f7f5f0|1a1a1a)(?![a-f0-9])/gi,(value,hex)=>`var(${palette[hex.toLowerCase()]},${value})`);
fs.writeFileSync(output,css);
