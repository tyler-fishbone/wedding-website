import type {WeddingFormPayload} from './weddingFormTypes';
export async function submitWeddingForm(payload:WeddingFormPayload):Promise<void>{
 const response=await fetch('/api/address',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const result=await response.json() as {ok?:boolean;error?:string};
 if(!response.ok||result.ok!==true)throw new Error(result.error??'We couldn’t save your address. Please try again.');
}
