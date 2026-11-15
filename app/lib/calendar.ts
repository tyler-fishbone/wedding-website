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

type AppleCalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  details: string;
};

function calendarUtcTime(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/[,;]/g, "\\$&");
}

function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder();
  let result = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += character;
    bytes += size;
  }
  return result;
}

export function buildAppleCalendarFile(event: AppleCalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TylerAndKatie//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + event.id + "@tylerkatiewedding.vercel.app",
    "DTSTAMP:" + calendarUtcTime(now),
    "DTSTART:" + calendarUtcTime(new Date(event.startsAt)),
    "DTEND:" + calendarUtcTime(new Date(event.endsAt)),
    "SUMMARY:" + escapeCalendarText(event.title),
    ...(event.location ? ["LOCATION:" + escapeCalendarText(event.location)] : []),
    ...(event.details ? ["DESCRIPTION:" + escapeCalendarText(event.details)] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  return lines.map(foldCalendarLine).join("\r\n");
}

export function calendarLocation(event: {location: string; address?: string; addressCityState?: string}): string {
  const venue = event.location === "Location to be announced" ? "" : event.location;
  return [venue, event.address, event.addressCityState].filter(Boolean).join(", ");
}
