import {run,state,save,manifest} from './seed.mjs';
for(const [handle,p] of Object.entries(state.products)){
 if(state.events.some(e=>e.operation==='media:'+p.id))continue;
 const category=handle.includes('low-carb')?'Low Carb':handle.includes('high-carb')?'High Carb':'Just Protein';
 const image=manifest.readySeries.singlePurchase.find(m=>m.cat===category).img;
 run('media',{input:{id:p.id},media:[{mediaContentType:'IMAGE',originalSource:image,alt:p.title+' — QA reference image'}]});
 state.events.push({operation:'media:'+p.id});save();console.log('Added approved reference image',handle);
}
