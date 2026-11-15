import {readFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import assert from 'node:assert/strict';
loadEnvFile('.env.local');
const sourcePath=process.argv.find(arg=>arg.endsWith('.json'));
if(!sourcePath)throw new Error('Provide the prepared import JSON path. Dry run is default; --apply writes data.');
const source=JSON.parse(await readFile(sourcePath,'utf8'));
const order=['households','guests','events','invitations','import_source_records','planning_issues'];
const householdIds=new Set(source.households.map(h=>h.id));
const guestIds=new Set(source.guests.map(g=>g.id));
const eventIds=new Set(source.events.map(e=>e.id));
assert.equal(householdIds.size,source.households.length);
assert.equal(guestIds.size,source.guests.length);
assert.equal(eventIds.size,source.events.length);
assert.ok(source.guests.every(g=>householdIds.has(g.household_id)&&g.display_name&&!g.display_name.includes('?')));
assert.ok(source.invitations.every(i=>guestIds.has(i.guest_id)&&eventIds.has(i.event_id)));
assert.equal(new Set(source.invitations.map(i=>i.guest_id+':'+i.event_id)).size,source.invitations.length);
assert.ok(source.invitations.filter(i=>i.assignment_source==='mailing-address-first-pass').every(i=>i.review_required===true));
console.log('Validated import counts:',Object.fromEntries(order.map(table=>[table,source[table].length])));
if(!process.argv.includes('--apply')){console.log('Dry run only; no records changed.');process.exit(0);}
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY;
if(!url||!key)throw new Error('Server configuration missing');
for(const table of order){
 const rows=source[table];
 for(let i=0;i<rows.length;i+=50){
  const response=await fetch(`${url}/rest/v1/${table}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+50))});
  if(!response.ok){const error=await response.json();throw new Error(`Import failed for ${table}: ${response.status} ${error.code??''}`);}
 }
 console.log(`Imported ${rows.length} ${table} records (existing records preserved).`);
}
