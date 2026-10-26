import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
import {runInNewContext} from 'node:vm';
// Render the actual account component with deterministic hook values. Never
// invoke a financial handler or require a browser/customer session in tests.
const source=readFileSync('extensions/performance-meals-account/src/OrderStatusBlock.jsx','utf8');
const component=source.slice(source.indexOf('function GiftCardClaim('),source.indexOf('\nfunction Rewards('));
const {code}=await transform(component,{loader:'jsx',jsxFactory:'view'});
function render(props,message=''){
 let index=0;const states=['TESTCODE',false,message];
 const nodes=[];const view=(type,props,...children)=>{const node={type,props:props||{},children};nodes.push(node);return node;};
 const fn=runInNewContext(code+'\nGiftCardClaim',{view,useState:()=>[states[index++],()=>{}]});
 const tree=fn(props);const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(' '):node&&typeof node==='object'?text(node.children):'';
 return {text:text(tree),buttons:nodes.filter(n=>n.type==='s-button'),fields:nodes.filter(n=>n.type==='s-password-field')};
}
test('account loading and load failures never masquerade as disabled Gift Card policy',()=>{
 for(const accountError of [false,true]){const ui=render({accountLoaded:false,accountError});assert.doesNotMatch(ui.text,/not available here yet/);assert.match(ui.text,accountError?/Retry loading account/:/Checking your account/);assert.equal(ui.buttons.length,0);assert.equal(ui.fields.length,0);}
});
test('a successful transfer remains visible during account refresh and refresh failure',()=>{
 for(const accountError of [false,true]){const ui=render({accountLoaded:false,accountError},'Gift Card value added to your Wallet.');assert.match(ui.text,/Gift Card value added/);assert.equal(ui.buttons.length,0);}
});
test('loaded merchant policy and Wallet readiness still gate redemption',()=>{
 const disabled=render({accountLoaded:true,enabled:false});assert.match(disabled.text,/not available here yet/);assert.equal(disabled.buttons.length,0);
 const blocked=render({accountLoaded:true,enabled:true,blocked:true});assert.equal(blocked.buttons[0].props.disabled,true);assert.equal(blocked.fields[0].props.disabled,true);
 const ready=render({accountLoaded:true,enabled:true,blocked:false});assert.equal(ready.buttons[0].props.disabled,false);
});
