import test from 'node:test';
import assert from 'node:assert/strict';
import { Liquid } from 'liquidjs';
import { readFile } from 'node:fs/promises';

test('reward amounts follow native currency formatting without overlapping dollar tokens', async () => {
  const source = await readFile(new URL('../../theme/snippets/reward-money-text.liquid', import.meta.url), 'utf8');
  const engine = new Liquid();
  engine.registerFilter('money_with_currency', value => `$${(Number(value) / 100).toFixed(2)} SGD`);
  const rendered = await engine.parseAndRender(source, {text: '$1 / $5 / $11 / $25 / $50 / $100 / $200'});
  assert.equal(rendered.trim(), '$1.00 SGD / $5.00 SGD / $11.00 SGD / $25.00 SGD / $50.00 SGD / $100.00 SGD / $200.00 SGD');
  engine.registerFilter('money_with_currency', value => `${(Number(value) / 100).toFixed(2)} EUR`);
  assert.equal((await engine.parseAndRender(source, {text: '$11 voucher'})).trim(), '11.00 EUR voucher');
});
