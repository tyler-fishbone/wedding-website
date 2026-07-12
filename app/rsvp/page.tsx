import Link from "next/link";
import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
export const metadata = { title: "RSVP" };
export default function RsvpPage() { return <div className="page-shell page-shell--narrow"><PageIntro eyebrow="RSVP" title="Coming soon"><p>Formal invitations and online responses aren’t open just yet. If you haven’t shared your mailing address, you can do that now.</p></PageIntro><Link className="button" href="/save-the-date">Share your address</Link><PlusDivider /></div>; }
