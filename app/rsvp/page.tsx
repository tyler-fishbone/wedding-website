import { PageIntro } from '../components/PageIntro';
import { PlusDivider } from '../components/PlusDivider';
import { RsvpForm } from '../components/RsvpForm';
export const metadata = {title:'RSVP'};
export default function RsvpPage(){return <div className="page-shell page-shell--narrow"><PageIntro eyebrow="RSVP"><p>We can’t wait to celebrate with you.</p><p>Please RSVP by February 4, 2027. You can respond now and return later to update your answers.</p><p><a className="text-link" href="/save-the-date#mailing-address">Update your mailing address</a></p></PageIntro><RsvpForm/><PlusDivider/></div>;}
