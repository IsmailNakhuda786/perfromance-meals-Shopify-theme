import db from '../db.server';
import publicHolidays from '../data/singapore-public-holidays.json';
import {assertShop} from './security.server';
export type HolidayCalendar={years:number[];closedDates:string[];source:string};
export function readyHolidayCalendar(value:unknown):HolidayCalendar{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Merchant holiday calendar required');
 const c=value as HolidayCalendar;
 if(!Array.isArray(c.years)||!c.years.length||c.years.length>10||new Set(c.years).size!==c.years.length||c.years.some(y=>!Number.isSafeInteger(y)||y<2020||y>2100)||!Array.isArray(c.closedDates)||c.closedDates.length>1000||new Set(c.closedDates).size!==c.closedDates.length||typeof c.source!=='string'||!c.source.trim()||c.source.length>1000)throw Error('Complete merchant holiday calendar required');
 for(const date of c.closedDates)if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!c.years.includes(Number(date.slice(0,4))))throw Error('Holiday date outside the verified calendar');
 const catalogue=publicHolidays as Record<string,unknown>;
 const official:string[]=[];for(const year of c.years){const entry=catalogue[String(year)] as {dates?:string[]}|undefined;if(!entry||!Array.isArray(entry.dates))throw Error('Official holiday coverage is unavailable for that year');official.push(...entry.dates);}
 return {years:[...c.years].sort(),closedDates:[...new Set([...c.closedDates,...official])].sort(),source:c.source.trim()};
}
export function readyBookingSlotAllowed(at:Date,calendar:HolidayCalendar){
 if(!Number.isFinite(at.getTime()))return false;
 const local=new Date(at.getTime()+8*3600000),date=local.toISOString().slice(0,10);
 return calendar.years.includes(local.getUTCFullYear())&&local.getUTCDay()!==6&&!calendar.closedDates.includes(date);
}
export function readyBookingActive(shop:string,customerGid:string){
 assertShop(shop);
 return process.env.NODE_ENV!=='production'&&process.env.CORE_READY_CUSTOMER_BOOKING_ENABLED==='true'&&process.env.READY_DELIVERY_CAPACITY_ENABLED==='true'&&/^gid:\/\/shopify\/Customer\/\d+$/.test(customerGid)&&process.env.CORE_READY_BOOKING_QA_CUSTOMER===customerGid;
}
// Caller is an authenticated merchant route. No new setting is inferred from
// prototype defaults; missing year coverage prevents customer slot selection.
export async function configureReadyBookingPolicy(input:{shop:string;noticeHours:number;calendar:HolidayCalendar;expectedRevision:number}){
 assertShop(input.shop);
 if(process.env.NODE_ENV==='production'||process.env.READY_DELIVERY_CAPACITY_ENABLED!=='true')throw Error('Delivery management is not activated');
 if(!Number.isSafeInteger(input.noticeHours)||input.noticeHours<1||input.noticeHours>8760||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)throw Error('Explicit notice period and revision required');
 const holidayCalendar=JSON.stringify(readyHolidayCalendar(input.calendar));
 return db.$transaction(async tx=>{
  const current=await tx.readyDeliveryPolicy.findUnique({where:{shop:input.shop}});
  if(!current){if(input.expectedRevision!==0)throw Error('Policy changed; reload');return tx.readyDeliveryPolicy.create({data:{shop:input.shop,noticeHours:input.noticeHours,holidayCalendar}});}
  if(current.noticeHours===input.noticeHours&&current.holidayCalendar===holidayCalendar&&(current.revision===input.expectedRevision||input.expectedRevision===0&&current.revision===1))return current;
  const changed=await tx.readyDeliveryPolicy.updateMany({where:{shop:input.shop,revision:input.expectedRevision},data:{noticeHours:input.noticeHours,holidayCalendar,revision:{increment:1}}});
  if(changed.count!==1)throw Error('Policy changed; reload');return tx.readyDeliveryPolicy.findUniqueOrThrow({where:{shop:input.shop}});
 },{timeout:30000});
}

// Optional namespace isolates approved development fixtures from pre-existing
// merchant capacity. It is never accepted from a customer payload.
export function readyBookingSlotScope(shop:string){
 assertShop(shop);const prefix=process.env.CORE_READY_BOOKING_QA_SLOT_PREFIX;
 if(prefix!==undefined&&(!/^[A-Za-z0-9_-]{1,100}$/.test(prefix)))throw Error('Invalid approved slot namespace');
 return {shop,...(prefix?{slotKey:{startsWith:prefix}}:{})};
}
