export type CalendarEvent = {
  title: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  location: string;
  details: string;
};

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${event.startDateTime}/${event.endDateTime}`, ctz: event.timezone, location: event.location, details: event.details });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
