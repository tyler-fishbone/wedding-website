import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { guideSections } from "../content/wedding";
export const metadata = { title: "Local guide" };
export default function LocalGuidePage() { return <div className="page-shell"><PageIntro eyebrow="Local guide" title="Making a trip of it"><p>Our working guide to a long weekend in Austin—where to stay, what to eat, and where to wander between wedding events.</p></PageIntro>{guideSections.map((section) => <section className="guide-section" key={section.title}><h2>{section.title}</h2><div className="guide-grid">{section.items.map((item) => <article key={item.title}><p className="eyebrow">{item.eyebrow}</p><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>)}<PlusDivider /></div>; }
