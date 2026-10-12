import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/services/programme-period.ts'],outdir:'.shopify/period-test',bundle:true,format:'esm',platform:'node'});
const {sixtyDayPeriod,consecutiveMenuWeeks,programmeMenuBlock} = await import('../.shopify/period-test/programme-period.js');

test('customer Monday is retained and inclusive coverage is exactly 60 calendar days', () => {
  assert.deepEqual(sixtyDayPeriod('2026-10-12'), {startsOn:'2026-10-12',endsOn:'2026-12-10',durationDays:60});
  assert.deepEqual(sixtyDayPeriod('2026-12-28'), {startsOn:'2026-12-28',endsOn:'2027-02-25',durationDays:60});
});

test('available Monday requires consecutive weekly menus without gaps or duplicates', () => {
  const weeks = ['2026-10-12','2026-10-19','2026-10-26','2026-11-02'].map(startsOn=>({startsOn}));
  assert.equal(consecutiveMenuWeeks(weeks,'2026-10-12',4),true);
  assert.equal(consecutiveMenuWeeks([...weeks.slice(0,3),{startsOn:'2026-11-09'}],'2026-10-12',4),false);
  assert.equal(consecutiveMenuWeeks([weeks[0],weeks[1],weeks[1],weeks[3]],'2026-10-12',4),false);
  assert.equal(consecutiveMenuWeeks(weeks.slice(0,3),'2026-10-12',4),false);
});

test('invalid dates and non-Mondays cannot become programme start dates', () => {
  for (const date of ['2026-10-11','2026-02-30','2026-2-2','','2026-10-12T00:00:00Z']) {
    assert.throws(() => sixtyDayPeriod(date));
  }
});

test('weekday-only coverage includes the final four days within the original 60-day period',()=>{
  assert.deepEqual(programmeMenuBlock('2026-10-12',0),{startsOn:'2026-10-12',endsOn:'2026-11-08',menuWeeks:4,servedDays:20});
  assert.deepEqual(programmeMenuBlock('2026-10-12',1),{startsOn:'2026-11-09',endsOn:'2026-12-06',menuWeeks:4,servedDays:20});
  assert.deepEqual(programmeMenuBlock('2026-10-12',2),{startsOn:'2026-12-07',endsOn:'2026-12-10',menuWeeks:1,servedDays:4});
  assert.equal([0,1,2].reduce((sum,block)=>sum+programmeMenuBlock('2026-10-12',block).servedDays*2,0),88);
  for(const block of [-1,3,1.5]) assert.throws(()=>programmeMenuBlock('2026-10-12',block));
});
