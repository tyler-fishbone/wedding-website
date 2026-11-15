'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import styles from './RsvpForm.module.css';
import {GuestDietaryRestrictions} from './GuestDietaryRestrictions';
import {GuestNameCorrection} from './GuestNameCorrection';
import {HouseholdSchedule} from './HouseholdSchedule';
import type {WeddingEvent} from '../content/wedding';
import type { Attendance, HouseholdView, ResponseInput } from '../lib/rsvp';

type Match = {name:string;guestNames:string[];token:string};
type Result = {schedule?:WeddingEvent[];household?:HouseholdView;matches?:Match[];error?:string};
type Step = 'lookup'|'confirm'|'edit'|'review'|'success';
async function request(body?: unknown, method?: string, purpose: 'rsvp'|'schedule' = 'rsvp'): Promise<Result> {
 const response = await fetch(purpose==='schedule'?'/api/rsvp?view=schedule':'/api/rsvp',{method:method??(body?'POST':'GET'),credentials:'same-origin',cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const result = await response.json() as Result;
 if (!response.ok) throw new Error(result.error??'We couldn’t complete that request. Please try again.');
 return result;
}
function eventDate(event: HouseholdView['events'][number], details?: WeddingEvent) {
 if (!event.startsAt) return details?`${details.eyebrow} · ${details.time}`:'Time to be announced';
 const day = new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:event.timeZone}).format(new Date(event.startsAt));
 const time = new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:event.timeZone});
 return `${day} · ${time.format(new Date(event.startsAt))}${event.endsAt?`–${time.format(new Date(event.endsAt))}`:''}`;
}
export function RsvpForm({purpose='rsvp'}:{purpose?:'rsvp'|'schedule'}) {
 const pageRequest=(body?:unknown,method?:string)=>request(body,method,purpose);
 const [schedule,setSchedule]=useState<WeddingEvent[]>([]);
 const eventHeading = useRef<HTMLHeadingElement>(null);
 const [eventIndex,setEventIndex] = useState(0);
 const [step,setStep] = useState<Step>('lookup');
 const [mode,setMode] = useState<'name'|'email'>('name');
 const [query,setQuery] = useState('');
 const [matches,setMatches] = useState<Match[]>([]);
 const [household,setHousehold] = useState<HouseholdView|null>(null);
 const [error,setError] = useState<string|null>(null);
 const [notFound,setNotFound] = useState(false);
 const [busy,setBusy] = useState(true);
 const [loadingSession,setLoadingSession]=useState(true);
 useEffect(()=>{
  let active = true;
  pageRequest().then(result=>{if(active&&result.household){setHousehold(result.household);setSchedule(result.schedule??[]);setEventIndex(0);setStep('edit');}}).catch(()=>{}).finally(()=>{if(active){setBusy(false);setLoadingSession(false);}});
  return ()=>{active=false;};
 },[purpose]);
 useEffect(()=>{
  if((step==='edit'||step==='review'||step==='success')&&eventHeading.current){eventHeading.current.focus({preventScroll:true});eventHeading.current.scrollIntoView({block:'start'});}
 },[step,eventIndex]);
 async function find(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true); setError(null); setNotFound(false);
  try {
   const result = await pageRequest({action:'lookup',mode,query});
   const found = result.matches??[]; setMatches(found);
   if(found.length) setStep('confirm'); else setNotFound(true);
  } catch(error) {setError(error instanceof Error?error.message:'Please try again.');} finally {setBusy(false);}
 }
 async function confirm(match: Match) {
  setBusy(true);setError(null);
  try {const result=await pageRequest({action:'confirm',token:match.token}); if(!result.household)throw new Error('Please find your invitation again.');setHousehold(result.household);setSchedule(result.schedule??[]);setEventIndex(0);setStep('edit');} catch(error){setError(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}
 }
 async function restart() {
  setBusy(true);setError(null);
  try {await pageRequest(undefined,'DELETE');setHousehold(null);setSchedule([]);setEventIndex(0);setMatches([]);setNotFound(false);setQuery('');setMode('name');setStep('lookup');}catch{setError('Please try again.');}finally{setBusy(false);}
 }
 function answer(eventId: string,guestId: string,attendance: Attendance) {
  setHousehold(current=>current?{...current,events:current.events.map(event=>event.id===eventId?{...event,guests:event.guests.map(guest=>guest.id===guestId?{...guest,attendance}:guest)}:event)}:current);
 }
 function continueEvent(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();setError(null);
  if(!household)return;
  const currentEvent=household.events[eventIndex];
  if(!currentEvent||currentEvent.guests.some(guest=>!guest.attendance)){
   setError('Please choose a response for each guest before continuing.');return;
  }
  if(eventIndex<household.events.length-1){setEventIndex(eventIndex+1);return;}
  const unansweredIndex=household.events.findIndex(invitedEvent=>invitedEvent.guests.some(guest=>!guest.attendance));
  if(unansweredIndex!==-1){setEventIndex(unansweredIndex);setError('Please choose a response for each guest before continuing.');return;}
  setStep('review');
 }
 function editEvent(index: number) {
  setEventIndex(index);setError(null);setStep('edit');
 }
 async function submit() {
  if(!household)return;
  const responses:ResponseInput[]=[];
  for(const event of household.events)for(const guest of event.guests){if(!guest.attendance)return;responses.push({eventId:event.id,guestId:guest.id,attendance:guest.attendance});}
  setBusy(true);setError(null);
  try{const result=await pageRequest({action:'save',responses});if(!result.household)throw new Error('Please try again.');setHousehold(result.household);setStep('success');}catch(error){setError(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}
 }
 if(loadingSession)return <section className={`form-card ${styles.root}`} style={{marginTop:24}} aria-busy="true"><p role="status">{purpose==='schedule'?'Loading your schedule…':'Loading your invitation…'}</p></section>;
 const currentEvent=household?.events[eventIndex];
 const nextEvent=household?.events[eventIndex+1];
 const emailFallback = <button type="button" className="button button--outline" disabled={busy} onClick={()=>{setMode('email');setQuery('');setNotFound(false);setError(null);}}>Try your email address</button>;
 return <section className={`form-card ${styles.root}`} style={{marginTop:24}} aria-busy={busy}>
  {error&&(step!=='edit'||purpose==='schedule')&&<p className="form-error" role="alert">{error}</p>}
  {step==='lookup'&&<>
   <h2>{purpose==='schedule'?'Find your household':'Find your invitation'}</h2>{purpose==='schedule'&&<p>Find your household to see your weekend events. You can RSVP separately.</p>}
   <p>{mode==='name'?'Enter your full name to find your household. You don’t need a printed invitation to RSVP.':'Enter the email address we have on file for you or your household.'}</p>
   <form onSubmit={find}>
    <label>{mode==='name'?'Full name':'Email address'}<input type={mode==='email'?'email':'text'} name={mode==='email'?'email':'name'} value={query} onChange={event=>setQuery(event.target.value)} autoComplete={mode==='email'?'email':'name'} maxLength={200} required disabled={busy}/></label>
    <button className="button" disabled={busy} type="submit">{busy?'Please wait…':'Find invitation'}</button>
   </form>
   {notFound&&<p role="status" style={{marginTop:20}}>{mode==='name'?'We couldn’t find that name. Try the email address we have on file.':'We couldn’t find your invitation. Please contact Tyler or Katie.'}</p>}
   {mode==='name'?<div style={{marginTop:20}}>{emailFallback}</div>:<button className="text-link" type="button" disabled={busy} onClick={()=>{setMode('name');setNotFound(false);setError(null);setQuery('');}}>Search by name instead</button>}
  </>}
  {step==='confirm'&&<>
   <h2>Is this your household?</h2>
   {matches.map(match=><div key={match.token} style={{marginBottom:28}}><h3>{match.name}</h3><p>{match.guestNames.join(' · ')}</p><button className="button" type="button" disabled={busy} onClick={()=>confirm(match)}>Yes, this is my household</button></div>)}
   <button className="text-link" type="button" disabled={busy} onClick={()=>{setStep('lookup');setMatches([]);setError(null);}}>That’s not us — search again</button>
  </>}
  {household&&(step==='edit'||step==='success')&&<GuestNameCorrection
   key={household.id}
   household={household}
   busy={busy}
   onSubmit={(guestId,correctedName)=>pageRequest({action:'request-name-correction',guestId,correctedName})}
  />}
  {household&&purpose==='rsvp'&&step==='edit'&&<GuestDietaryRestrictions
   key={household.id} household={household} busy={busy} expanded={false}
   onSave={notes=>pageRequest({action:'save-dietary-restrictions',notes})}
  />}
  {step==='edit'&&household&&purpose==='schedule'&&<HouseholdSchedule household={household} events={schedule} busy={busy} onRestart={restart}/>}
  {step==='edit'&&household&&purpose==='rsvp'&&<>
   <div className={styles.householdHeader}><p>{household.name}</p><button className={`text-link ${styles.quietLink}`} type="button" disabled={busy} onClick={restart}>Not your household?</button></div>
   {!currentEvent?<p>There are no events available for this invitation. Please contact Tyler or Katie.</p>:<form onSubmit={continueEvent} noValidate>
    <div className={styles.progress} aria-label={`Event ${eventIndex+1} of ${household.events.length}`}><p>Event {eventIndex+1} of {household.events.length}</p><div className={styles.progressTrack} aria-hidden="true">{household.events.map((event,index)=><span key={event.id} className={index<=eventIndex?styles.progressComplete:undefined}/>)}</div></div>
    <header className={styles.eventHeader}>
     <h2 ref={eventHeading} tabIndex={-1}>{currentEvent.name}</h2>
     <p>{eventDate(currentEvent,schedule.find(event=>event.id===currentEvent.id))}</p>{currentEvent.venue&&<p>{currentEvent.venue}</p>}
     {(currentEvent.description||currentEvent.attire)&&<details className={styles.eventDetails}><summary>Event details</summary>{currentEvent.description&&<p>{currentEvent.description}</p>}{currentEvent.attire&&<p>Attire: {currentEvent.attire}</p>}</details>}
    </header>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <div><h3 className={styles.question}>Who’s joining us?</h3><div className={styles.guests}>
     {currentEvent.guests.map(guest=><div className={styles.guestRow} key={`${currentEvent.id}-${guest.id}`}>
      <span className={styles.guestName} id={`guest-${currentEvent.id}-${guest.id}`}>{guest.name}</span>
      <div className={styles.choices} role="radiogroup" aria-labelledby={`guest-${currentEvent.id}-${guest.id}`}>
       {(['attending','declined'] as const).map(status=><label className={styles.choice} key={status}><input type="radio" name={`${currentEvent.id}-${guest.id}`} value={status} checked={guest.attendance===status} onChange={()=>{answer(currentEvent.id,guest.id,status);setError(null);}} required disabled={busy}/><span>{status==='attending'?'Attending':'Can’t make it'}</span></label>)}
      </div>
     </div>)}
    </div></div>
    <div className={styles.navigation}>
     {eventIndex>0&&<button className="button button--outline" type="button" disabled={busy} onClick={()=>{setError(null);setEventIndex(eventIndex-1);}}>Back</button>}
     <button className={`button ${styles.nextButton}`} type="submit" disabled={busy}>{nextEvent?`Next: ${nextEvent.name}`:'Review responses'}</button>
    </div>
   </form>}
  </>}
  {step==='review'&&household&&<>
   <h2 ref={eventHeading} tabIndex={-1}>Review your responses</h2><p>Check your answers, then submit your RSVP.</p>
   {household.events.map((event,index)=><section key={event.id} className={styles.reviewEvent}><div className={styles.reviewHeading}><h3>{event.name}</h3><button className={`text-link ${styles.quietLink}`} type="button" disabled={busy} onClick={()=>editEvent(index)} aria-label={`Edit ${event.name} responses`}>Edit</button></div><dl className={styles.reviewGuests}>{event.guests.map(guest=><div key={guest.id}><dt>{guest.name}</dt><dd>{guest.attendance==='attending'?'Attending':'Can’t make it'}</dd></div>)}</dl></section>)}
   <div className={styles.navigation}><button className="button button--outline" type="button" disabled={busy} onClick={()=>editEvent(household.events.length-1)}>Back</button><button className={`button ${styles.nextButton}`} type="button" disabled={busy} onClick={submit}>{busy?'Saving…':'Submit RSVP'}</button></div>
  </>}
  {step==='success'&&household&&<div aria-live="polite"><h2 ref={eventHeading} tabIndex={-1}>Your RSVP is saved.</h2><p>Thank you! You can return to this page to review or update your responses.</p><p><a className="text-link" href="/schedule">View your weekend schedule</a></p><button className="button" type="button" onClick={()=>editEvent(0)}>Review or update responses</button><br/><button className="text-link" type="button" disabled={busy} onClick={restart}>Find another invitation</button></div>}
  {household&&purpose==='rsvp'&&step==='success'&&<GuestDietaryRestrictions
   key={household.id} household={household} busy={busy} expanded
   onSave={notes=>pageRequest({action:'save-dietary-restrictions',notes})}
  />}
 </section>;
}
