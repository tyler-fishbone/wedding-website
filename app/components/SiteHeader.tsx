"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation, wedding } from "../content/wedding";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <header className="site-header"><div className="site-header__inner"><Link className="wordmark" href="/">{wedding.couple}</Link><button className="menu-button" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Menu"}</button><nav id="site-navigation" className={open ? "site-nav site-nav--open" : "site-nav"} aria-label="Main navigation">{navigation.map((item) => <Link className={item.highlight ? "nav-highlight" : undefined} key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}</nav></div></header>;
}
