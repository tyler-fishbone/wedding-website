import Image from "next/image";
import Link from "next/link";
import { Countdown } from "./components/Countdown";
import { PlusDivider } from "./components/PlusDivider";
import { wedding } from "./content/wedding";

export default function Home() { return <><section className="home-hero"><div className="home-hero__copy"><h1>{wedding.couple}</h1><p className="date-lockup">Sunday, April 4th, 2027<br />{wedding.city}</p></div><div className="home-hero__image"><Image src="/katie-tyler-hero.jpg" alt="Katie and Tyler" fill priority sizes="100vw" /></div><Countdown target={wedding.countdownTarget} /></section><section className="home-intro"><p className="eyebrow">A little about us</p><h2>Long tables, good glasses, and the people we love</h2><p>We’re getting married out in the Hill Country and we want you there — read a bit about how we got here, find every event on the schedule, and let us know you’re coming.</p><div className="button-row"><Link className="button" href="/our-story">Our story</Link><Link className="button button--outline" href="/rsvp">RSVP</Link></div></section><PlusDivider /></>; }
