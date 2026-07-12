import Image from "next/image";
import Link from "next/link";
import { Countdown } from "./components/Countdown";
import { PlusDivider } from "./components/PlusDivider";
import { wedding } from "./content/wedding";

export default function Home() { return <><section className="home-hero"><div className="home-hero__copy"><p className="eyebrow">We’re getting married</p><h1>{wedding.couple}</h1><p className="date-lockup">{wedding.dateLabel}<br />{wedding.city}</p></div><div className="home-hero__image"><Image src="/horse-high-five.png" alt="Katie and Tyler high-fiving on horseback" fill priority sizes="(max-width: 760px) 100vw, 52vw" /></div><Countdown target={wedding.countdownTarget} /></section><section className="home-intro"><p className="eyebrow">A little about us</p><h2>Long tables, good glasses, and the people we love</h2><p>We’re getting married under the oaks outside Austin, and we want you there. Find the shape of the weekend, make a trip of it, and check back as the details come together.</p><div className="button-row"><Link className="button" href="/our-story">Our story</Link><Link className="button button--outline" href="/rsvp">RSVP</Link></div></section><PlusDivider /></>; }
