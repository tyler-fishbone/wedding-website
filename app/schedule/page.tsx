import { EventCard } from "../components/EventCard";
import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { events } from "../content/wedding";
export const metadata = { title: "Schedule" };
export default function SchedulePage() { return <div className="page-shell"><PageIntro eyebrow="Wedding weekend"><p>Everything below is in Austin. Exact times, addresses, and invitation details are coming soon.</p></PageIntro><div className="event-list">{events.map((event) => <EventCard key={event.id} event={event} />)}</div><PlusDivider /></div>; }
