import { EventCard } from "../components/EventCard";
import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { events } from "../content/wedding";
export const metadata = { title: "Schedule" };
export default function SchedulePage() { return <div className="page-shell"><PageIntro eyebrow="Schedule of events" title="What to expect and when"><p>Everything below is in Austin. We’ll fill in exact times, addresses, and invitation details as plans become final.</p></PageIntro><div className="event-list">{events.map((event) => <EventCard key={event.id} event={event} />)}</div><PlusDivider /></div>; }
