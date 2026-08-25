import { PlusDivider } from "../components/PlusDivider";
import { travelSections } from "../content/wedding";
import type { GuideItem } from "../content/wedding";

export const metadata = { title: "Travel" };

function GuideItemBody({ item }: { item: GuideItem }) {
  if (!item.bodyLink) {
    return <>{item.body.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</>;
  }

  const linkStart = item.body.indexOf(item.bodyLink.label);
  const linkEnd = linkStart + item.bodyLink.label.length;

  return <p>{item.body.slice(0, linkStart)}<a href={item.bodyLink.href} target="_blank" rel="noreferrer">{item.bodyLink.label}</a>{item.body.slice(linkEnd)}</p>;
}

export default function TravelPage() {
  return (
    <div className="page-shell">
      {travelSections.map((section) => (
        <section className="guide-section" key={section.title}>
          <h2>{section.title}</h2>
          <div className="guide-grid">
            {section.items.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <GuideItemBody item={item} />
                {item.link && <a className="text-link" href={item.link.href} target="_blank" rel="noreferrer">{item.link.label}</a>}
                {item.note && <p>{item.note}</p>}
              </article>
            ))}
          </div>
        </section>
      ))}
      <PlusDivider />
    </div>
  );
}
