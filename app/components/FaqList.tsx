import type { FaqItem } from "../content/wedding";
export function FaqList({ items }: { items: FaqItem[] }) { return <div className="faq-list">{items.map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>; }
