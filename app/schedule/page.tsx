import {PageIntro} from '../components/PageIntro';
import {PlusDivider} from '../components/PlusDivider';
import {RsvpForm} from '../components/RsvpForm';
export const metadata={title:'Schedule'};
export default function SchedulePage(){return <div className="page-shell"><PageIntro eyebrow="Schedule"><p>Your plans for our wedding weekend.</p></PageIntro><RsvpForm purpose="schedule"/><PlusDivider/></div>;}
