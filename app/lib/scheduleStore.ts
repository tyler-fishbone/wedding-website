import 'server-only';
import {events} from '../content/wedding';
import type {HouseholdView} from './rsvp';
import {buildSchedule,type ScheduleEventRecord} from './schedule';
import {database} from './rsvpStore';

export async function loadSchedule(household:HouseholdView) {
 if(!household.events.length)return [];
 const filter=new URLSearchParams({id:`in.(${household.events.map(event=>event.id).join(',')})`,select:'id,slug,name,starts_at,ends_at,time_zone,venue_name,address_line_1,address_line_2,city,region,postal_code,country_code,description,attire'});
 const records=await database<ScheduleEventRecord[]>(`events?${filter}`);
 return buildSchedule(household,records,events);
}
