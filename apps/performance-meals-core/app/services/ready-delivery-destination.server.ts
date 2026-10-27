import {createHash} from 'node:crypto';
import {assertShop} from './security.server';
import {readOrderDispatch} from './order-dispatch.server';

export const READY_VISIT_DESTINATION_QUERY=`#graphql
query CoreReadyVisitDestination($id:ID!,$after:String){
 shop{myshopifyDomain}
 currentAppInstallation{app{id}accessScopes{handle}}
 order(id:$id){id test cancelledAt customer{id}
  fulfillmentOrders(first:5,after:$after){nodes{
   id order{id} deliveryMethod{methodType} destination{id address1 address2 city company countryCode province zip}
  }pageInfo{hasNextPage endCursor}}
 }
}`;
type Admin=Parameters<typeof readOrderDispatch>[0];
type Expected={appGid:string;customerGid:string;orderGid:string;fulfillmentOrderGids:string[]};
const ref=(kind:string,value:unknown)=>typeof value==='string'&&new RegExp('^gid://shopify/'+kind+'/\\d+$').test(value);
type Destination={id:string;address1:string|null;address2:string|null;city:string|null;company:string|null;countryCode:string|null;province:string|null;zip:string|null};

// Read-only internal proof. Exact address fields are compared, never guessed or
// fuzzily merged. Only an opaque fingerprint leaves this reader; no address is
// stored in a visit record. This is not capacity reservation or native booking.
export async function readReadyDeliveryVisitDestination(admin:Admin,shop:string,expected:Expected){
 assertShop(shop);
 if(process.env.NODE_ENV==='production')throw Error('Development destination verification only');
 if(!ref('App',expected.appGid)||!ref('Customer',expected.customerGid)||!ref('Order',expected.orderGid)||!Array.isArray(expected.fulfillmentOrderGids)||!expected.fulfillmentOrderGids.length||expected.fulfillmentOrderGids.length>100||expected.fulfillmentOrderGids.some(id=>!ref('FulfillmentOrder',id))||new Set(expected.fulfillmentOrderGids).size!==expected.fulfillmentOrderGids.length)throw Error('Exact owned native delivery references required');
 const required=new Set(expected.fulfillmentOrderGids),seen=new Set<string>(),cursors=new Set<string>();
 let after:string|null=null,address:string|null=null;
 do{
  const response=await admin.graphql(READY_VISIT_DESTINATION_QUERY,{variables:{id:expected.orderGid,after}}),body=await response.json(),d=body.data,o=d?.order,installation=d?.currentAppInstallation,page=o?.fulfillmentOrders;
  if(!response.ok||body.errors||d?.shop?.myshopifyDomain!==shop||installation?.app?.id!==expected.appGid||!Array.isArray(installation.accessScopes)||o?.id!==expected.orderGid||o.test!==true||o.cancelledAt!==null||o.customer?.id!==expected.customerGid||!Array.isArray(page?.nodes)||page.nodes.length>5||typeof page.pageInfo?.hasNextPage!=='boolean')throw Error('Complete owned destination evidence unavailable');
  const scopes=new Set(installation.accessScopes.map((s:{handle:string})=>s?.handle));
  for(const key of ['merchant_managed_fulfillment_orders','third_party_fulfillment_orders'])if(!scopes.has('read_'+key)&&!scopes.has('write_'+key))throw Error('Complete delivery visibility required');
  for(const row of page.nodes){
   if(!ref('FulfillmentOrder',row?.id)||row.order?.id!==expected.orderGid||seen.has(row.id)||seen.size>=100)throw Error('Ambiguous native delivery coverage');
   seen.add(row.id);if(!required.has(row.id))continue;
   const dest=row.destination as Destination|null;
   if(!dest||!ref('FulfillmentOrderDestination',dest.id)||!['SHIPPING','LOCAL'].includes(row.deliveryMethod?.methodType)||dest.countryCode!=='SG'||typeof dest.address1!=='string'||!dest.address1.trim()||typeof dest.zip!=='string'||!/^\d{6}$/.test(dest.zip))throw Error('Complete Singapore shipping destination required');
   const fields=[dest.address1,dest.address2,dest.city,dest.company,dest.countryCode,dest.province,dest.zip];
   if(fields.some(value=>value!==null&&(typeof value!=='string'||value.length>1024)))throw Error('Invalid native destination');
   const identity=JSON.stringify(fields);
   if(address!==null&&address!==identity)throw Error('Packages have different delivery destinations');
   address=identity;
  }
  after=null;
  if(page.pageInfo.hasNextPage){
   const next=page.pageInfo.endCursor;
   if(!page.nodes.length||typeof next!=='string'||!next||next.length>2048||cursors.has(next)||cursors.size>=20)throw Error('Incomplete native destination coverage');
   cursors.add(next);after=next;
  }
 }while(after!==null);
 if(address===null||[...required].some(id=>!seen.has(id)))throw Error('Requested native delivery unavailable');
 const dispatch=await readOrderDispatch(admin,shop,expected.orderGid);
 if(!dispatch.complete||dispatch.cancelled||dispatch.customerGid!==expected.customerGid||dispatch.byLine.size)throw Error('Current undispatched owned order required');
 const destinationKey=createHash('sha256').update(JSON.stringify([shop,expected.customerGid,expected.orderGid,address])).digest('hex');
 return {destinationKey,fulfillmentOrderGids:[...required].sort(),destinationVerified:true as const,dispatchVerified:true as const,bookingConfirmed:false as const};
}
