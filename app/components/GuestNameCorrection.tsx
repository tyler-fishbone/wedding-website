'use client';

import {useState,type FormEvent} from 'react';
import type {HouseholdView} from '../lib/rsvp';
import styles from './RsvpForm.module.css';

export function GuestNameCorrection({household,busy,onSubmit}:{
 household:HouseholdView;
 busy:boolean;
 onSubmit:(guestId:string,correctedName:string)=>Promise<unknown>;
}) {
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const guests=[...new Map(household.events.flatMap(event=>event.guests.map(guest=>[guest.id,guest] as const))).values()];
 if(!guests.length)return null;

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget;
  const fields=new FormData(form);
  setSaving(true);
  setMessage('');
  setError('');
  try{
   await onSubmit(String(fields.get('guestId')??''),String(fields.get('correctedName')??''));
   form.reset();
   setMessage('Thanks! Katie and Tyler will review your name correction.');
  }catch(error){
   setError(error instanceof Error?error.message:'Could not send the correction. Please try again.');
  }finally{
   setSaving(false);
  }
 }

 return <details className={styles.eventDetails}>
  <summary>Correct a guest name</summary>
  <form onSubmit={submit}>
   <label>Guest<select name="guestId" required disabled={busy||saving}>
    {guests.map(guest=><option key={guest.id} value={guest.id}>{guest.name}</option>)}
   </select></label>
   <label>Correct full name<input name="correctedName" maxLength={100} required disabled={busy||saving}/></label>
   <button className="button button--outline" type="submit" disabled={busy||saving}>{saving?'Sending…':'Request name correction'}</button>
  </form>
  {message&&<p role="status">{message}</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </details>;
}
