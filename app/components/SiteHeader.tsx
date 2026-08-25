"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation, wedding } from "../content/wedding";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const primaryNavigation = navigation.filter((item) => !["/rsvp", "/save-the-date"].includes(item.href));
  const rsvp = navigation.find((item) => item.href === "/rsvp");

  return <header className="site-header"><div className="site-header__inner"><nav className="site-nav site-nav--primary" aria-label="Main navigation">{primaryNavigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</nav><Link className="wordmark" href="/" aria-label={`${wedding.couple} home`}><Image src="/katie-tyler-drawing-bw.svg" alt="" width={72} height={120} priority /></Link><div className="site-header__actions">{rsvp && <Link className="nav-highlight" href={rsvp.href} aria-current={pathname === rsvp.href ? "page" : undefined}>{rsvp.label}<span aria-hidden="true">↘</span></Link>}<button className="menu-button" type="button" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Menu"}</button></div><nav id="mobile-navigation" className={open ? "mobile-nav mobile-nav--open" : "mobile-nav"} aria-label="Mobile navigation">{navigation.map((item) => <Link className={item.highlight ? "nav-highlight" : undefined} key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}</nav></div></header>;
}
