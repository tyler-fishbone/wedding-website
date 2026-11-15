import type {WeddingEvent} from '../content/wedding.ts';
import type {EventRecord,HouseholdView} from './rsvp.ts';

export type ScheduleEventRecord=EventRecord&{
 slug:string;address_line_1:string|null;address_line_2:string|null;city:string|null;region:string|null;postal_code:string|null;country_code:string|null;
};
export function hasPendingRsvps(household:HouseholdView):boolean {
 return household.events.some(event=>event.guests.some(guest=>guest.attendance===null));
}
function calendarTime(date:Date,timeZone:string):string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const part=(name:string)=>parts.find(item=>item.type===name)!.value;
 return `${part('year')}${part('month')}${part('day')}T${part('hour')}${part('minute')}${part('second')}`;
}
export function buildSchedule(household:HouseholdView,records:ScheduleEventRecord[],publishedDetails:WeddingEvent[]):WeddingEvent[] {
 const recordsById=new Map(records.map(event=>[event.id,event]));
 // Iterate the authenticated invitation view, never the full event catalogue.
 return household.events.flatMap(invitation=>{
  const event=recordsById.get(invitation.id);
  if(!event)return [];
  const details=publishedDetails.find(item=>item.id===event.slug);
  const start=event.starts_at?new Date(event.starts_at):null;
  const end=event.ends_at?new Date(event.ends_at):null;
  const time=new Intl.DateTimeFormat('en-US',{timeZone:event.time_zone,hour:'numeric',minute:'2-digit'});
  const address=[event.address_line_1,event.address_line_2].filter(Boolean).join(', ')||details?.address;
  const cityState=[event.city,event.region,event.postal_code].filter(Boolean).join(' ')||details?.addressCityState;
  const location=event.venue_name??details?.location??'Location to be announced';
  const mapLocation=[location,address,cityState].filter(Boolean).join(', ');
  return [{id:event.id,name:event.name,timezone:event.time_zone,eyebrow:start?new Intl.DateTimeFormat('en-US',{timeZone:event.time_zone,weekday:'long',month:'long',day:'numeric'}).format(start):details?.eyebrow??'Date to be announced',day:start?new Intl.DateTimeFormat('en-US',{timeZone:event.time_zone,day:'2-digit'}).format(start):details?.day??'',status:start?'confirmed' as const:details?.status??'coming-soon' as const,time:start?`${time.format(start)}${end?`–${time.format(end)}`:''}`:details?.time??'Time to be announced',location,address,addressCityState:cityState,locationHref:location===details?.location?details?.locationHref:undefined,addressHref:address?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLocation)}`:undefined,subtitle:details?.subtitle,attire:event.attire??details?.attire??'',description:event.description??details?.description??'',...(start?{startDateTime:calendarTime(start,event.time_zone)}:{}),...(end?{endDateTime:calendarTime(end,event.time_zone)}:{})}];
 });
}
