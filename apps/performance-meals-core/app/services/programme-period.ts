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

// Jerome confirmed these totals for both 6 by60 programmes. Frozen dispatches
// are arranged through menus/merchant; no weekday or batch split is invented.
export function sixtyDayEntitlement(startMonday:string){
 const period=sixtyDayPeriod(startMonday);
 const weekdays=[0,1,2].reduce((sum,block)=>sum+programmeMenuBlock(startMonday,block).servedDays,0);
 if(weekdays!==44)throw Error('Programme weekday coverage differs');
 return {policyVersion:'sixty-day-20261012',...period,weekdayDays:weekdays,mealsPerWeekday:2,weekdayMeals:88,frozenMeals:32,totalMeals:120,automaticRenewal:false,frozenDelivery:'MENU_OR_MERCHANT_ARRANGED'};
}

// Historical rows without a saved snapshot stay explicit; catalogue edits must
// not manufacture or alter an already purchased entitlement.
export function savedSixtyDayEntitlement(snapshot:string|null,startsOn:string|null,endsOn:string|null){
 if(!snapshot||!startsOn||!endsOn)return null;
 try{
  const expected=sixtyDayEntitlement(startsOn),saved=JSON.parse(snapshot);
  if(expected.endsOn!==endsOn||!saved||Object.keys(saved).length!==Object.keys(expected).length)return null;
  if(Object.entries(expected).some(([key,value])=>saved[key]!==value))return null;
  return expected;
 }catch{return null;}
}
