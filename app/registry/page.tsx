import { registryItems } from "../content/wedding";
export const metadata = { title: "Registry" };
const registry = registryItems[0];
export default function RegistryPage() { return <div className="page-shell page-shell--narrow registry-link">{registry.href && <a className="button" href={registry.href} target="_blank" rel="noopener noreferrer">{registry.body}</a>}</div>; }
