import {sixtyDayPeriod,consecutiveMenuWeeks} from './programme-period';
export type Programme = {id:string; stream:string; menuWeeks:number; purchasePolicy?:{mode:string;durationDays:number;startDay:string}; variant:{id:string; productGid:string; available:boolean; mealsPerDay:number; requiresPlan:boolean; plans:string[]}};
export type MenuWindow = {key:string;stream:string;days:number;meals:string[]};
export type MenuWeek = {handle:string;stream:string;startsOn:string;endsOn:string;cutoffAt:string;programmes:string[];windows:MenuWindow[]};
export type DraftInput = {programmeId:string;variantId:string;sellingPlanId?:string;startMonday?:string;selections:Record<string,Record<string,Record<string,number>>>};
export function gid(type:string,value:unknown) {
  const text=String(value||'');
  if (/^\d+$/.test(text)) return `gid://shopify/${type}/${text}`;
  if (new RegExp(`^gid://shopify/${type}/\\d+$`).test(text)) return text;
  throw new Error(`Invalid ${type} reference`);
}
export function validateSelection(input:DraftInput,programme:Programme,weeks:MenuWeek[],complete=false,now=Date.now()) {
  if (!input || programme.stream!=='meal_plan' || gid('Product',input.programmeId)!==programme.id || gid('ProductVariant',input.variantId)!==programme.variant.id || programme.variant.productGid!==programme.id || !programme.variant.available) throw new Error('Invalid Meal Plan programme');
  const plan=input.sellingPlanId?gid('SellingPlan',input.sellingPlanId):null;
  const periodBased=programme.purchasePolicy?.mode==='period' && programme.purchasePolicy.durationDays===60 && programme.purchasePolicy.startDay==='MONDAY';
  if (periodBased ? !!plan || programme.variant.requiresPlan : !plan || !programme.variant.requiresPlan || !programme.variant.plans.includes(plan)) throw new Error('Invalid selling plan allocation');
  const period=periodBased?sixtyDayPeriod(input.startMonday || ''):null;
  if(!periodBased && input.startMonday) throw new Error('Unexpected programme start date');
  if (!Number.isInteger(programme.menuWeeks)||programme.menuWeeks<1||!Number.isInteger(programme.variant.mealsPerDay)||programme.variant.mealsPerDay<1) throw new Error('Incomplete programme configuration');
  const eligible=weeks.filter(w=>w.stream==='meal_plan' && Date.parse(w.cutoffAt)>now && (!w.programmes.length||w.programmes.includes(programme.id)) && (!period || w.startsOn>=period.startsOn)).sort((a,b)=>a.startsOn.localeCompare(b.startsOn)).slice(0,programme.menuWeeks);
  if(period && eligible[0]?.startsOn!==period.startsOn) throw new Error('Selected Monday unavailable');
  if(eligible.length!==programme.menuWeeks) throw new Error('Published menu unavailable');
  if(period && !consecutiveMenuWeeks(eligible,period.startsOn,programme.menuWeeks)) throw new Error('Consecutive published menus unavailable');
  if (!input.selections || typeof input.selections!=='object'||Array.isArray(input.selections)) throw new Error('Invalid selection payload');
  for(const key of Object.keys(input.selections)) if(!eligible.some(w=>w.handle===key)) throw new Error('Unknown or expired menu week');
  const result=[];
  for (const week of eligible) {
    if(!week.windows.length || !Number.isFinite(Date.parse(week.cutoffAt))) throw new Error('Invalid menu configuration');
    const selected=input.selections[week.handle]||{};
    for(const key of Object.keys(selected)) if(!week.windows.some(w=>w.key===key)) throw new Error('Unknown delivery window');
    for(const window of week.windows) {
      if(window.stream!=='meal_plan'||!Number.isInteger(window.days)||window.days<1) throw new Error('Invalid delivery window');
      const meals=[];let total=0;
      for(const [id,quantity] of Object.entries(selected[window.key]||{})) {
        const productId=gid('Product',id);
        if(!window.meals.includes(productId)||!Number.isSafeInteger(quantity)||quantity<1) throw new Error('Invalid meal or quantity');
        total+=quantity;meals.push({productGid:productId,quantity});
      }
      const allocation=window.days*programme.variant.mealsPerDay;
      if(total>allocation || (complete&&total!==allocation)) throw new Error('Meal allocation incomplete or exceeded');
      result.push({businessStream:'meal_plan',schemaVersion:1,week:week.handle,startsOn:week.startsOn,endsOn:week.endsOn,window:window.key,meals});
    }
  }
  return {programmeGid:programme.id,variantGid:programme.variant.id,sellingPlanGid:plan,startsOn:period?.startsOn||null,endsOn:period?.endsOn||null,windows:result,cutoffAt:new Date(Math.min(...eligible.map(w=>Date.parse(w.cutoffAt))))};
}
export const STREAMS=['ready_series','meal_plan','shared'] as const;
export function department(stream:string,isGiftCard:boolean) {
  if(isGiftCard) return stream==='shared'?'gift_card_sales':null;
  return stream==='ready_series'?'ready_series':stream==='meal_plan'?'meal_plan':stream==='shared'?'shared':null;
}
