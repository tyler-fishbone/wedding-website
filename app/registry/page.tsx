import { PageIntro } from "../components/PageIntro";
import { PlusDivider } from "../components/PlusDivider";
import { registryItems } from "../content/wedding";
export const metadata = { title: "Registry" };
const registry = registryItems[0];
export default function RegistryPage() { return <div className="page-shell page-shell--narrow"><PageIntro eyebrow="Registry"><p>Yes, we want stuff from you.</p></PageIntro><section className="registry-coming-soon"><h2>{registry.title}</h2>{registry.href && <p><a className="button" href={registry.href} target="_blank" rel="noopener noreferrer">{registry.body}</a></p>}</section><PlusDivider /></div>; }
