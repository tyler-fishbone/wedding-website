import { FaqList } from "../components/FaqList";
import { PageIntro } from "../components/PageIntro";
import { faqs } from "../content/wedding";
export const metadata = { title: "FAQ" };
export default function FaqPage() { return <div className="page-shell page-shell--narrow"><PageIntro eyebrow="FAQ" title="Good to know"><p>We’ll keep this page current as more of the weekend clicks into place.</p></PageIntro><FaqList items={faqs} /></div>; }
