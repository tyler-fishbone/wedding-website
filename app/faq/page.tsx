import { FaqList } from "../components/FaqList";
import { faqs } from "../content/wedding";
export const metadata = { title: "FAQ" };
export default function FaqPage() { return <div className="page-shell page-shell--narrow"><FaqList items={faqs} /></div>; }
