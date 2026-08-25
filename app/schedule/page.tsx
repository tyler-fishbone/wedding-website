import { EventCard } from "../components/EventCard";
import { PlusDivider } from "../components/PlusDivider";
import { events } from "../content/wedding";
export const metadata = { title: "Schedule" };
export default function SchedulePage() { return <div className="page-shell"><div className="event-list">{events.map((event) => <EventCard key={event.id} event={event} />)}</div><PlusDivider /></div>; }
