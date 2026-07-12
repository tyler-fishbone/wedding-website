import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { registryItems } from "../content/wedding";
export const metadata = { title: "Registry" };
export default function RegistryPage() { return <div className="page-shell page-shell--narrow"><PageIntro eyebrow="Registry" title="If you’d like to give a gift"><p>Your presence at the wedding is the only gift we need. For those who have asked, details will appear here.</p></PageIntro><div className="registry-grid">{registryItems.map((item) => <article key={item.title}><p className="eyebrow">{item.eyebrow}</p><h2>{item.title}</h2><p>{item.body}</p>{item.href && <a className="text-link" href={item.href}>Visit registry</a>}</article>)}</div><PlusDivider /></div>; }
