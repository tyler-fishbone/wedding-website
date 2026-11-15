'use client';
import styles from './AdminDashboard.module.css';
import type {AddressSubmission,AdminHousehold} from '../lib/admin';
export function AddressReview({submissions,households,busy,save}:{submissions:AddressSubmission[];households:AdminHousehold[];busy:boolean;save:(body:Record<string,unknown>)=>Promise<void>}){
 if(!submissions.length)return null;
 return <section><h2>Mailing addresses to match ({submissions.length})</h2><p>Choose the existing household for each submission. Applying these details preserves any mailing hold.</p>{submissions.map(submission=>{
 const p=submission.payload;
 return <details key={submission.id}><summary>{p.firstName1} {p.lastName1}{p.firstName2?` and ${p.firstName2} ${p.lastName2}`:''}</summary><p>{submission.review_reason}</p><p>{p.email} · {p.phone}</p><p>{[p.address1,p.address2,p.city,p.state,p.zip,p.countryCode].filter(Boolean).join(' · ')}</p>{p.fortuneCookieHope&&<p>Fortune cookie: {p.fortuneCookieHope}</p>}<form className={styles.editForm} onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void save({kind:'apply-address',submissionId:submission.id,householdId:String(data.get('householdId'))});}}><label>Household<select name="householdId" required disabled={busy} defaultValue=""><option value="" disabled>Choose a household</option>{households.map(household=><option key={household.id} value={household.id}>{household.display_name}</option>)}</select></label><button className="button button--outline" disabled={busy}>Apply address to household</button></form></details>;
 })}</section>;
}
