import { wedding } from "../content/wedding";
export function SiteFooter() { return <footer className="site-footer"><strong>{wedding.couple}</strong><p>{wedding.shortDateLabel} · {wedding.venue} · {wedding.city}</p></footer>; }
