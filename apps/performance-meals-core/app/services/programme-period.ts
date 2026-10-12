export function sixtyDayPeriod(startMonday: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startMonday)) throw new Error('Invalid programme start date');
  const start = new Date(`${startMonday}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== startMonday || start.getUTCDay() !== 1) {
    throw new Error('Programme must start on a valid Monday');
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 59);
  return {startsOn: startMonday, endsOn: end.toISOString().slice(0, 10), durationDays: 60};
}

export function consecutiveMenuWeeks(weeks: Array<{startsOn:string}>, startMonday:string, count:number) {
  const start = new Date(`${sixtyDayPeriod(startMonday).startsOn}T00:00:00Z`);
  return Number.isSafeInteger(count) && count > 0 && weeks.length === count && weeks.every((week,index) => {
    const expected = new Date(start);
    expected.setUTCDate(expected.getUTCDate() + index * 7);
    return week.startsOn === expected.toISOString().slice(0,10);
  });
}

export function programmeMenuBlock(startMonday:string, block:number) {
  if(!Number.isSafeInteger(block)||block<0||block>2) throw new Error('Invalid programme menu block');
  const period=sixtyDayPeriod(startMonday);
  const start=new Date(`${period.startsOn}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate()+block*28);
  const end=new Date(start);
  end.setUTCDate(end.getUTCDate()+(block===2?3:27));
  return {startsOn:start.toISOString().slice(0,10),endsOn:end.toISOString().slice(0,10),menuWeeks:block===2?1:4,servedDays:block===2?4:20};
}
