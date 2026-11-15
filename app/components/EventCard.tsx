import { buildGoogleCalendarUrl, calendarLocation } from "../lib/calendar";
import { wedding, type WeddingEvent } from "../content/wedding";

export function EventCard({ event }: { event: WeddingEvent }) {
  const calendarUrl = event.startDateTime && event.endDateTime
    ? buildGoogleCalendarUrl({
        title: `${wedding.couple}: ${event.name}`,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        timezone: event.timezone ?? wedding.timezone,
        location: calendarLocation(event),
        details: event.description,
      })
    : null;
  return <article className="event-card"><div className="event-date"><span>{event.eyebrow}</span></div><div className="event-card__body"><h2>{event.name}</h2>{event.subtitle && <p>{event.subtitle}</p>}<dl><div><dt>Where</dt><dd>{event.locationHref ? <a href={event.locationHref} target="_blank" rel="noreferrer">{event.location}</a> : event.location}{event.address && <small>{event.address}<br />{event.addressCityState}{event.addressHref && <> <a className="address-map-link" href={event.addressHref} target="_blank" rel="noreferrer" aria-label={`Open ${event.location} in Google Maps`}>↗</a></>}</small>}</dd></div><div><dt>When</dt><dd>{event.time}</dd></div>{event.attire && <div><dt>Attire</dt><dd>{event.attire}</dd></div>}</dl>{event.description && <p>{event.description}</p>}{calendarUrl ? <div className="button-row">
    <a className="text-link" href={calendarUrl} target="_blank" rel="noreferrer" aria-label={'Add ' + event.name + ' to Google Calendar'}>Google Calendar</a>
    <a className="text-link" href={'/api/rsvp?calendar=' + encodeURIComponent(event.id)} aria-label={'Add ' + event.name + ' to Apple Calendar'}>Apple Calendar</a>
  </div> : <span className="coming-soon">Calendar details coming soon</span>}</div></article>;
}
