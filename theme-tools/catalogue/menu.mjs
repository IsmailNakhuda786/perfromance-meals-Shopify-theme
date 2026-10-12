import {c,state,save,run,values,mf,before} from './sync.mjs';
const specs=c.programmes.map(p=>state.products['programme:'+p.key]);if(specs.some(p=>!p))throw Error('Programme mapping incomplete');
const midnight=new Date();midnight.setUTCHours(0,0,0,0);midnight.setUTCDate(midnight.getUTCDate()+((8-midnight.getUTCDay())%7||7));
const date=(day,offset)=>{const d=new Date(day);d.setUTCDate(d.getUTCDate()+offset);return d;};
for(let i=0;i<4;i++){
 const step='source-menu:'+i;if(state.steps.includes(step))continue;
 const windows=[];
 for(let j=0;j<c.deliveryWindows.length;j++){
  const w=c.deliveryWindows[j],handle=i===0&&j<2?'pm-qa-window-'+(j+1):'pm-source-week-'+(i+1)+'-'+w.key;
  const ids=[...new Set([...c.weekMenus[i].lunch,...c.weekMenus[i].dinner])].map(id=>state.products['mp-menu:'+id].id);
  const object=run(2,{handle:{type:'performance_menu_window',handle},input:{fields:[{key:'key',value:w.key},{key:'label',value:w.label},{key:'days',value:String(w.dayCount)},{key:'meals',value:JSON.stringify(ids)},{key:'business_stream',value:'meal_plan'}]}}).metaobject;
  windows.push(object.id);
 }
 const start=date(midnight,i*7),end=date(start,4),cutoff=date(start,-1);cutoff.setUTCHours(12);
 const week=run(2,{handle:{type:'performance_menu_week',handle:i<2?'pm-qa-week-'+(i+1):'pm-source-week-'+(i+1)},input:{fields:[{key:'label',value:'Week '+(i+1)},{key:'starts_on',value:start.toISOString().slice(0,10)},{key:'ends_on',value:end.toISOString().slice(0,10)},{key:'cutoff_at',value:cutoff.toISOString()},{key:'programmes',value:JSON.stringify(specs.map(p=>p.id))},{key:'windows',value:JSON.stringify(windows)},{key:'business_stream',value:'meal_plan'}]}}).metaobject;
 state.steps.push(step);state.menuWeeks ||= [];state.menuWeeks.push(week.id);save();console.log('Source menu',i+1);
}
const inclusions=specs.map((p,i)=>({ownerId:p.id,...mf('inclusions',c.programmes[i].key==='6by60plus'?['Frozen weekend meals','Channel access','Weigh-in machine','Rewards']:[],'list.single_line_text_field')}));values(inclusions);
// Preserve unused historical components but correct their old fixture display labels.
for(const old of before.bundleItems.nodes.filter(o=>o.handle.startsWith('pm-qa-component-'))){const fields=Object.fromEntries(old.fields.map(f=>[f.key,f.value]));const native=Object.values(state.products).find(p=>p.id===fields.product);if(native)run(2,{handle:{type:'performance_bundle_item',handle:old.handle},input:{fields:[{key:'label',value:native.title}]}});}
