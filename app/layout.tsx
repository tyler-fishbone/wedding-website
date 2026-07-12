import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Katie and Tyler", template: "%s | Katie and Tyler" },
  description: "Wedding weekend details for Katie and Tyler in Austin, Texas."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body><SiteHeader /><main>{children}</main><SiteFooter /></body>
    </html>
  );
}
