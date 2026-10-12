import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const tools = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(tools, '../theme');
export function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? filesIn(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
}
const files = filesIn(theme).filter(file => !file.endsWith('.gitattributes'));
const failures = [];
for (const file of files) {
  const relative = path.relative(theme, file);
  if (/\.(tsx?|jsx)$/.test(file)) failures.push(`${relative}: runtime source not allowed`);
  if (!/\.(liquid|json|js|css)$/.test(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  if (/react-dom|from ['"]react['"]|@vite|vite\/client|createRoot\(/i.test(source)) failures.push(`${relative}: React/Vite runtime`);
  if (/HTML\s*Download|Download\s*(HTML|PDF|ZIP|Theme)|QA\s*(hand.?off|hand)|screenshot|export\s*(source|tools)|prototype\s*ZIP/i.test(source)) failures.push(`${relative}: prototype control`);
  if (/build.?a.?box|how-it-works/i.test(source)) failures.push(`${relative}: removed flow`);
  if (file.endsWith('.json')) JSON.parse(source);
  if (file.endsWith('.liquid')) {
    const schema = source.match(/\{% schema %\}([\s\S]*?)\{% endschema %\}/);
    if (schema) {
      const names = JSON.parse(schema[1]).blocks?.map(block => block.name).filter(Boolean) || [];
      if (new Set(names).size !== names.length) failures.push(`${relative}: duplicate block display name rejected by Shopify`);
    }
  }
  for (const match of source.matchAll(/['"]([^'"]+)['"]\s*\|\s*asset_url/g)) if (!fs.existsSync(path.join(theme, 'assets', match[1]))) failures.push(`${relative}: missing asset ${match[1]}`);
  for (const match of source.matchAll(/\{%\s*render\s+['"]([^'"]+)['"]/g)) if (!fs.existsSync(path.join(theme, 'snippets', `${match[1]}.liquid`))) failures.push(`${relative}: missing snippet ${match[1]}`);
  if (file.endsWith('.js')) {
    const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (syntax.status) failures.push(`${relative}: ${syntax.stderr}`);
  }
  if (file.endsWith('.json') && /\/templates\/|\/sections\/.*group/.test(file)) {
    for (const section of Object.values(JSON.parse(source).sections || {})) if (!fs.existsSync(path.join(theme, 'sections', `${section.type}.liquid`))) failures.push(`${relative}: missing section ${section.type}`);
  }
}
const checked = files.filter(file => /\.(liquid|json|js|css)$/.test(file)).map(file => path.relative(theme, file));
const result = spawnSync(process.execPath, [path.join(tools, 'validate-shopify.mjs'), '--theme-path', theme, '--files', checked.join(','), '--json', '--artifact-id', 'performance-meals-release', '--revision', '2'], { encoding: 'utf8', env: { ...process.env, OPT_OUT_INSTRUMENTATION: 'true' }, maxBuffer: 10 * 1024 * 1024 });
const validation = JSON.parse(result.stdout);
const warnings = validation.responses.filter(entry => entry.result === 'inform');
fs.mkdirSync(path.resolve(tools, '../work'), { recursive: true });
fs.writeFileSync(path.resolve(tools, '../work/validation-final.json'), JSON.stringify({ files: files.length, staticFailures: failures, themeCheck: validation }, null, 2));
console.log(JSON.stringify({ files: files.length, checked: checked.length, staticFailures: failures, success: validation.success, findings: validation.responses.filter(entry => entry.result !== 'success') }, null, 2));
if (failures.length || !validation.success || warnings.length) process.exitCode = 1;
