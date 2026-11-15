import type {WeddingFormPayload} from './weddingFormTypes.ts';

export class AddressValidationError extends Error {}
const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
export const countryOptions=countryCodes.map(code=>({code,name:regionNames.of(code)??code})).sort((a,b)=>a.name.localeCompare(b.name,'en'));
const limits:Record<keyof WeddingFormPayload,number>={submissionId:36,firstName1:100,lastName1:100,firstName2:100,lastName2:100,email:254,phone:80,address1:300,address2:300,city:150,state:150,zip:30,countryCode:2,fortuneCookieHope:2000,submittedAt:40,userAgent:1000,pageUrl:2000,referrer:2000};
export function validateAddressPayload(input:unknown):WeddingFormPayload{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new AddressValidationError('Please enter your mailing details.');
 const body=input as Record<string,unknown>;
 if(Object.keys(body).some(field=>!Object.hasOwn(limits,field)))throw new AddressValidationError('Invalid address submission.');
 const fields={} as WeddingFormPayload;
 for(const field of Object.keys(limits)as(keyof WeddingFormPayload)[]){
  const value=body[field]??'';
  if(typeof value!=='string'||value.length>limits[field]||value.includes('\u0000'))throw new AddressValidationError('Please check your mailing details.');
  fields[field]=value.trim();
 }
 fields.email=fields.email.toLowerCase();fields.countryCode=fields.countryCode.toUpperCase();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fields.submissionId))throw new AddressValidationError('Please refresh the page and try again.');
 if(!fields.firstName1||!fields.lastName1||!fields.address1||!fields.city||!fields.phone)throw new AddressValidationError('Please fill out all required fields.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))throw new AddressValidationError('Please enter a valid email address.');
 const phoneDigits=fields.phone.replace(/\D/g,'').length;
 if(phoneDigits<(fields.countryCode==='US'?10:6)||phoneDigits>20)throw new AddressValidationError('Please enter a valid phone number.');
 if(!countryCodes.includes(fields.countryCode))throw new AddressValidationError('Please choose your country.');
 if(fields.countryCode==='US'&&(!fields.state||!fields.zip))throw new AddressValidationError('Please enter your state and ZIP code.');
 if(Boolean(fields.firstName2)!==Boolean(fields.lastName2))throw new AddressValidationError('Please enter both names for the second guest, or leave both blank.');
 if(fields.submittedAt&&Number.isNaN(Date.parse(fields.submittedAt)))throw new AddressValidationError('Please refresh the page and try again.');
 return fields;
}
