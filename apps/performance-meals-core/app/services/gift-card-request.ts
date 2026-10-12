// Bound sensitive request bodies before parsing; never persist or echo the code.
export async function readGiftCardCode(request:Request){
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new Error('Invalid claim request');
 const reader=request.body?.getReader();
 if(!reader)throw new Error('Invalid claim request');
 const chunks:Uint8Array[]=[];
 let length=0;
 try{
  let complete=false;
  while(!complete){
   const result=await reader.read();
   complete=result.done;
   if(complete)break;
   const value=result.value!;
   length+=value.byteLength;
   if(length>512){await reader.cancel();throw new Error('Invalid claim request');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);
 let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(typeof body?.code!=='string'||!/^[a-z0-9]{8,20}$/i.test(body.code))throw new Error('Invalid claim request');
 return body.code as string;
}
