import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { guideSections } from "../content/wedding";
export const metadata = { title: "Local guide" };
export default function LocalGuidePage() { return <div className="page-shell"><PageIntro eyebrow="Austin"><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></PageIntro>{guideSections.map((section) => <section className="guide-section" key={section.title}><h2>{section.title}</h2><div className="guide-grid">{section.items.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>)}<PlusDivider /></div>; }
