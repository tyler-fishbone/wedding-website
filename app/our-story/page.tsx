import Image from "next/image";
import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { storySections } from "../content/wedding";
export const metadata = { title: "Our story" };
export default function OurStoryPage() { return <div className="page-shell"><PageIntro eyebrow="Our story" title="Our story"><p>We’re still writing this part in our own words. For now, here’s the shape of the story we want to tell.</p></PageIntro><div className="story-grid">{storySections.map((section, index) => <div className="story-row" key={section.eyebrow}><article><p className="eyebrow">{section.eyebrow}</p><h2>{section.title}</h2><p>{section.body}</p></article>{index === 0 && <div className="story-image"><Image src="/katie-tyler-story.jpg" alt="Katie and Tyler hugging by the water" fill sizes="(max-width: 760px) 100vw, 45vw" /></div>}</div>)}</div><PlusDivider /></div>; }
