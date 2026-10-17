import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {renderPage} from '../preview.mjs';
test('Ready Series distinguishes monthly delivery, delivery count and calendar-month renewal billing',async()=>{
 const $=load(await renderPage('/pages/ready-series'));
 const text=$('main').text().replace(/\s+/g,' ');
 assert.match(text,/deliveries repeat monthly/i);
 assert.match(text,/billing renews every 3 or 6 calendar months/i);
 assert.match(text,/3 or 6 deliveries/);
 assert.match(text,/Monthly\s*delivery schedule/i);
 assert.doesNotMatch(text,/every 28 days|28 DAYS BETWEEN DELIVERIES|10 predefined plans/i);
});
