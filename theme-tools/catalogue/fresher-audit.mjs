import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

// Read-only evidence audit. This never creates products or infers a price.
const directory = process.argv[2] || 'work/fresher-reference-20261014';
const portions = {Balanced: ['Regular'], 'Weight Loss': ['Regular', 'Petite']};
const types = {Flexible: 1, Committed: 2, Focussed: 3};
const terms = ['10 Days', '20 Days', '40 Days'];
const observations = new Map();
for (const file of readdirSync(directory).filter(name => name.endsWith('.txt'))) {
  const text = readFileSync(path.join(directory, file), 'utf8');
  const breakdown = text.slice(text.lastIndexOf('Package Breakdown'));
  const value = name => breakdown.match(new RegExp(`(?:^|\\n)${name}\\s+([^\\n]+)`))?.[1]?.trim();
  const plan = value('Plan'), portion = value('Portion'), type = value('Type'), term = value('Term');
  const amount = breakdown.match(/Subtotal:\s*\$\s*([\d,]+\.\d{2})\s*\(w\/GST\)/)?.[1];
  if (!amount || !plan || !portion || !type || !term) continue;
  if (!portions[plan]?.includes(portion) || !types[type] || !terms.includes(term)) {
    throw Error(`Unsupported source combination in ${file}`);
  }
  const priceMinor = Number(amount.replaceAll(',', '').replace('.', ''));
  if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) throw Error(`Invalid price in ${file}`);
  const key = [plan, portion, type, term].join(' / ');
  if (observations.has(key) && observations.get(key).priceMinor !== priceMinor) {
    throw Error(`Conflicting source prices for ${key}`);
  }
  observations.set(key, {plan, portion, type, term, mealsPerDay: types[type], priceMinor, currency: 'SGD', includesGst: true, evidenceFile: file});
}
const missing = [];
for (const [plan, choices] of Object.entries(portions)) {
  for (const portion of choices) for (const type of Object.keys(types)) for (const term of terms) {
    const key = [plan, portion, type, term].join(' / ');
    if (!observations.has(key)) missing.push(key);
  }
}
console.log(JSON.stringify({source: 'https://fresher.com.sg/meal-plans-order/', observedOn: '2026-10-14', complete: missing.length === 0, expectedCombinations: 27, observations: [...observations.values()], missing, breakfastWeekMinor: 3600, breakfastAuthority: 'Explicit merchant clarification via user; five breakfasts per week', readySeriesPrepaid: 'HOLD — merchant delivery clarification required', mutationsPerformed: false}, null, 2));
