// Parse the approved SGD 5–500 custom range without floating-point arithmetic.
// Payment initiation must use this server-normalized value, never a browser price.
export function parseWalletTopUpAmount(value:unknown){
 if(typeof value!=='string'||value.length>6||!/^(0|[1-9]\d{0,2})(\.\d{1,2})?$/.test(value))throw new Error('Enter a valid Wallet top-up amount');
 const [whole,fraction='']=value.split('.');
 const minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(minor<500||minor>50000)throw new Error('Wallet top-up amount must be between SGD 5 and SGD 500');
 return {amountMinor:minor,amount:Math.floor(minor/100)+'.'+String(minor%100).padStart(2,'0')};
}
