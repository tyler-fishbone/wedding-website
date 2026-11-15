'use client';

import {useState,type FormEvent} from 'react';
import type {DietaryRestrictionInput,HouseholdView} from '../lib/rsvp';
import styles from './RsvpForm.module.css';

export function GuestDietaryRestrictions({household,busy,expanded,onSave}:{
 household:HouseholdView;
 busy:boolean;
 expanded:boolean;
 onSave:(notes:DietaryRestrictionInput[])=>Promise<unknown>;
}) {
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const guests=[...new Map(household.events.flatMap(event=>event.guests.map(guest=>[guest.id,guest] as const))).values()];
 if(!guests.length)return null;

 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget;
  const fields=new FormData(form);
  const notes=guests.map(guest=>({guestId:guest.id,restrictions:String(fields.get(guest.id)??'').trim()}))
   .filter(note=>note.restrictions);
  setMessage('');
  setError('');
  if(!notes.length){
   setError('Enter dietary restrictions for at least one guest.');
   return;
  }
  setSaving(true);
  try{
   await onSave(notes);
   form.reset();
   setMessage('Dietary restrictions saved.');
  }catch(error){
   setError(error instanceof Error?error.message:'Could not save dietary restrictions. Please try again.');
  }finally{
   setSaving(false);
  }
 }

 return <details className={styles.eventDetails} open={expanded||undefined}>
  <summary>Dietary restrictions</summary>
  <p>Optional. Leave a guest’s field blank to keep any note already on file.</p>
  <form onSubmit={save}>
   {guests.map(guest=><label key={guest.id}>{guest.name}
    <textarea name={guest.id} maxLength={500} rows={2} disabled={busy||saving}/>
   </label>)}
   <button className="button button--outline" type="submit" disabled={busy||saving}>{saving?'Saving…':'Save dietary restrictions'}</button>
  </form>
  {message&&<p role="status">{message}</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </details>;
}
