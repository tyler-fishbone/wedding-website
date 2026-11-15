import {EventCard} from './EventCard';
import type {WeddingEvent} from '../content/wedding';
import type {HouseholdView} from '../lib/rsvp';
import {hasPendingRsvps} from '../lib/schedule';
import styles from './HouseholdSchedule.module.css';

export function HouseholdSchedule({household,events,busy,onRestart}:{household:HouseholdView;events:WeddingEvent[];busy:boolean;onRestart:()=>void}) {
 const pending=hasPendingRsvps(household);
 return <div className={styles.schedule}>
  <header className={styles.heading}><div><h2>Your weekend</h2><p>{household.name}</p></div><button type="button" className="text-link" disabled={busy} onClick={onRestart}>Not your household?</button></header>
  {events.length>0?<>
   <div className={styles.rsvpNotice}><p>{pending?'You still have events to RSVP to.':'Your RSVP responses are saved.'}</p><a className="button" href="/rsvp">{pending?'Complete your RSVP':'Review or update RSVP'}</a></div>
   <div className="event-list">{events.map(event=><EventCard key={event.id} event={event}/>)}</div>
  </>:<p>There are no events available for this invitation. Please contact Tyler or Katie.</p>}
 </div>;
}
