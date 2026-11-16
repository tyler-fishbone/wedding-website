 'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import type {HouseholdList} from '../lib/admin';
import styles from './AdminDashboard.module.css';
import {countInvitedHouseholds,householdsForEvent,summarizeHouseholdRsvp,type GuestRsvpStatus,type HouseholdRsvpStatus} from '../lib/adminCounts';
const guestRsvpBadge:Record<GuestRsvpStatus,{icon:string;label:string}>={
 yes:{icon:'✅',label:'Yes'},
 no:{icon:'❌',label:'No'},
 mixed:{icon:'↔',label:'Yes and no'},
 partial:{icon:'◐',label:'Partial'},
 pending:{icon:'⏳',label:'Pending'},
 'not-invited':{icon:'—',label:'No invite'}
};

export function AdminHouseholdTable(){
 const [data,setData]=useState<HouseholdList|null>(null),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(true),[query,setQuery]=useState(''),[eventId,setEventId]=useState(''),[status,setStatus]=useState('all');
 const [rsvpFilter,setRsvpFilter]=useState<HouseholdRsvpStatus|'all'|'needs-response'>('all');
 async function load(){setBusy(true);setError('');try{const response=await fetch('/api/admin?scope=list',{cache:'no-store'});const result=await response.json();if(response.status===401){setData(null);return;}if(!response.ok)throw new Error(result.error);setData(result.householdList);}catch(error){setError(error instanceof Error?error.message:'Could not load households.');}finally{setBusy(false);}}
 useEffect(()=>{void load();},[]);
 async function signIn(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({passphrase:password})});const result=await response.json();if(!response.ok)throw new Error(result.error);setPassword('');await load();}catch(error){setError(error instanceof Error?error.message:'Could not sign in.');}finally{setBusy(false);}}
 async function signOut(){setBusy(true);try{const response=await fetch('/api/admin',{method:'DELETE'});if(!response.ok)throw new Error('Could not sign out.');setData(null);}catch(error){setError(error instanceof Error?error.message:'Could not sign out.');}finally{setBusy(false);}}
 async function setInvitation(householdId:string,eventId:string,active:boolean){
  const response=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'set-household-invitation',householdId,eventId,active})});
  const result=await response.json()as{error?:string};
  if(!response.ok)throw new Error(result.error??'Could not save the invitation.');
  setData(current=>current?{...current,rows:current.rows.map(row=>row.id===householdId?{...row,events:row.events.map(event=>event.id===eventId?{...event,invitedGuestCount:active?row.guests.length:0,invitedGuestIds:active?row.guests.map(guest=>guest.id):[],status:active?'Invited':'Not invited',needsReview:false}:event)}:row)}:current);
 }
 if(!data)return <section className="form-card" style={{marginTop:0}}><h1>Wedding planning</h1><p>Sign in to track RSVPs and manage households.</p>{error&&<p role="alert" className="form-error">{error}</p>}<form onSubmit={signIn}><label>Shared passphrase<input type="password" autoComplete="current-password" value={password} required disabled={busy} onChange={event=>setPassword(event.target.value)}/></label><button className="button" disabled={busy}>{busy?'Please wait…':'Sign in'}</button></form></section>;
 const rows=householdsForEvent(data.rows,eventId).filter(row=>[row.name,row.email??'',...row.guests.map(guest=>guest.name)].join(' ').toLowerCase().includes(query.trim().toLowerCase())&&(status==='all'||row.mailingStatus===status))
  .map(row=>({...row,rsvp:summarizeHouseholdRsvp(row,eventId)}))
  .filter(({rsvp})=>rsvpFilter==='all'||rsvpFilter===rsvp.status||(rsvpFilter==='needs-response'&&(rsvp.status==='partial'||rsvp.status==='unanswered')));
 const invitedTotals=countInvitedHouseholds(data.rows,eventId);
 return <div className={styles.dashboard} aria-busy={busy}><header className={styles.heading}><div><h1>Households</h1><p>{data.rows.filter(row=>row.guests.length>0).length} households · {data.rows.reduce((count,row)=>count+row.guests.length,0)} named guests · {data.rows.reduce((count,row)=>count+row.guests.filter(guest=>guest.dietaryRestrictions).length,0)} with dietary restrictions</p></div><div className="button-row"><a href="/admin/add">Add household</a><a href="/admin/add?mode=guest">Add guest</a><a href="/admin/review">Follow-ups & address review</a><button disabled={busy} onClick={load}>Refresh</button><button disabled={busy} onClick={signOut}>Sign out</button></div></header>{error&&<p role="alert" className="form-error">{error}</p>}<div className={styles.filters}><label>Find household or guest<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name or email"/></label><label>Event<select value={eventId} onChange={event=>{setEventId(event.target.value);setStatus('all');}}><option value="">All events</option>{data.events.map(event=><option key={event.id} value={event.id}>{event.name}</option>)}</select></label><label>RSVP status<select value={rsvpFilter} onChange={event=>setRsvpFilter(event.target.value as typeof rsvpFilter)}>
 <option value="all">All RSVP statuses</option>
 <option value="needs-response">Needs response</option>
 <option value="complete">Fully responded</option>
 <option value="partial">Partially responded</option>
 <option value="unanswered">No response</option>
 </select></label><label>Show<select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">{eventId?'All invited households':'All households'}</option><option value="missing_address">Missing address</option><option value="on_hold">Mailing hold</option></select></label></div><p aria-live="polite">{eventId&&<><strong>Event total: {invitedTotals.households} invited households · {invitedTotals.guests} invited guests</strong><br/></>}* needs review</p><div className={`${styles.tableWrap} ${styles.compact}`}><table><thead><tr><th>Household</th><th>Guest RSVPs</th><th>Mailing</th>{data.events.filter(event=>!eventId||event.id===eventId).map(event=><th key={event.id}>{event.name}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.length===0&&<tr><td colSpan={eventId?5:data.events.length+4}>No households match these filters.</td></tr>}{rows.map(row=><tr key={row.id}><th scope="row"><a href={`/admin/households/${row.id}`}>{row.name}</a>{row.needsReview?' *':''}</th><td><ul className={styles.guestRsvpList}>{row.rsvp.guests.map(guest=>{
 const badge=guestRsvpBadge[guest.status];
 const dietary=row.guests.find(member=>member.id===guest.id)?.dietaryRestrictions;
 const answers=guest.responses.map(response=>{
  const name=data.events.find(event=>event.id===response.eventId)?.name??'Event';
  const answer=response.attendance==='attending'?'Yes':response.attendance==='declined'?'No':'Pending';
  return name+' '+answer;
 }).join(' · ');
 return <li key={guest.id} title={answers||badge.label}>
  <span aria-hidden="true">{badge.icon}</span>
  <span>{guest.name}</span>
  <small>{badge.label}</small>
  {dietary&&<span className={styles.dietaryNote}>🍽 {dietary}</span>}
 </li>;
 })}</ul></td><td>{row.addressLines.length?row.addressLines.map((line,index)=><div key={index}>{line}</div>):'missing address'}{row.mailingStatus==='on_hold'&&<strong>Mailing on hold</strong>}</td>{row.events.filter(event=>!eventId||event.id===eventId).map(event=><td key={event.id}><InvitationCheckbox householdName={row.name} eventName={data.events.find(item=>item.id===event.id)?.name??'Event'} invitation={event} disabled={busy} save={active=>setInvitation(row.id,event.id,active)}/></td>)}<td><a href={`/admin/households/${row.id}`}>Edit</a></td></tr>)}</tbody></table></div></div>;
}

function InvitationCheckbox({householdName,eventName,invitation,disabled,save}:{householdName:string;eventName:string;invitation:HouseholdList['rows'][number]['events'][number];disabled:boolean;save:(active:boolean)=>Promise<void>}){
 const checkbox=useRef<HTMLInputElement>(null);
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{if(checkbox.current)checkbox.current.indeterminate=invitation.status==='Mixed';},[invitation.status,saving]);
 async function change(active:boolean){setSaving(true);setSaved(false);setError('');try{await save(active);setSaved(true);}catch(error){setError((error instanceof Error?error.message:'Could not save.')+' Refresh to verify before trying again.');}finally{setSaving(false);}}
 return <div><label className={styles.inviteToggle}><input ref={checkbox} type="checkbox" aria-label={`${eventName} invitation for ${householdName}`} checked={invitation.status==='Invited'} disabled={disabled||saving} onChange={event=>{void change(event.target.checked);}}/>{invitation.status}{invitation.needsReview?' *':''}</label><span aria-live="polite">{saving?'Saving…':saved?'Saved':''}</span>{error&&<span role="alert">{error}</span>}</div>;
}
