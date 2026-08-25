import Link from "next/link";
import type { FaqItem } from "../content/wedding";

function FaqAnswer({ item }: { item: FaqItem }) {
  return <p>{item.answer.split("\n").map((line, index) => {
    const linkStart = item.answerLink ? line.indexOf(item.answerLink.label) : -1;
    const linkEnd = item.answerLink ? linkStart + item.answerLink.label.length : -1;

    return <span key={`${item.question}-${index}`}>{index > 0 && <br />}{item.answerLink && linkStart >= 0 ? <>{line.slice(0, linkStart)}<Link href={item.answerLink.href}>{item.answerLink.label}</Link>{line.slice(linkEnd)}</> : line}</span>;
  })}</p>;
}

export function FaqList({ items }: { items: FaqItem[] }) { return <div className="faq-list">{items.map((item) => <article className="faq-item" key={item.question}><h2>{item.question}</h2><FaqAnswer item={item} /></article>)}</div>; }
