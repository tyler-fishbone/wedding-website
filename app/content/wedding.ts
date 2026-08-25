export type NavigationItem = { label: string; href: string; highlight?: boolean };
export type WeddingEvent = { id: string; eyebrow: string; day: string; name: string; status: "confirmed" | "coming-soon"; time: string; location: string; locationHref?: string; address?: string; addressCityState?: string; addressHref?: string; attire: string; description: string; startDateTime?: string; endDateTime?: string };
export type GuideItem = { eyebrow: string; title: string; body: string; bodyLink?: { label: string; href: string }; link?: { label: string; href: string }; note?: string };
export type GuideSection = { title: string; items: GuideItem[] };
export type FaqItem = { question: string; answer: string; answerLink?: { label: string; href: string } };
export type RegistryItem = { eyebrow: string; title: string; body: string; href?: string; status: "active" | "coming-soon" };

export const wedding = { couple: "Katie and Tyler", dateIso: "2027-04-04", dateLabel: "Sunday, April 4, 2027", shortDateLabel: "April 4, 2027", dateMark: "04 · 04 · 27", countdownTarget: "2027-04-04T16:00:00-05:00", city: "Austin, Texas", venue: "The Addison Grove", timezone: "America/Chicago" } as const;

export const navigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Schedule", href: "/schedule" },
  { label: "Travel", href: "/travel" },
  { label: "Local guide", href: "/local-guide" },
  { label: "FAQ", href: "/faq" },
  { label: "Registry", href: "/registry" },
  { label: "RSVP", href: "/rsvp" },
  { label: "Save the date", href: "/save-the-date", highlight: true },
];

export const events: WeddingEvent[] = [
  { id: "welcome-party", eyebrow: "Saturday, April 3", day: "03", name: "Welcome party", status: "confirmed", time: "4–7 PM", location: "Nica on 4th", locationHref: "https://www.nicaon4th.com/home", address: "117 W 4th Street, Suite 101A", addressCityState: "Austin, TX 78701", addressHref: "https://www.google.com/maps/search/?api=1&query=Nica+on+4th+117+W+4th+Street+Suite+101A+Austin+TX+78701", attire: "Snazzy casual", description: "Jazz, cocktails and light bites.", startDateTime: "20270403T160000", endDateTime: "20270403T190000" },
  { id: "wedding", eyebrow: "Sunday, April 4", day: "04", name: "Wedding Ceremony & Partáy", status: "confirmed", time: "5–11 PM", location: wedding.venue, locationHref: "https://www.theaddisongrove.com/", address: "11903 Fitzhugh Road", addressCityState: "Austin, TX 78736", addressHref: "https://www.google.com/maps/search/?api=1&query=The+Addison+Grove+11903+Fitzhugh+Road+Austin+TX+78736", attire: "Garden formal", description: "", startDateTime: "20270404T170000", endDateTime: "20270404T230000" },
];

export const travelSections: GuideSection[] = [
  { title: "Where to stay", items: [{ eyebrow: "Hotel block", title: "Hyatt Regency Austin", body: "We have a room block at the Hyatt Regency Austin on Barton Springs Road. It is right on the lake, with immediate access to the Hike-and-Bike Trail! It’s also a 5 minute drive — or 15 minute walk — from our welcome party venue — across the Congress Avenue bridge. The shuttle bus will pick up guests here to bring them to and from the wedding venue.", bodyLink: { label: "Hyatt Regency Austin", href: "https://www.hyatt.com/hyatt-regency/en-US/ausra-hyatt-regency-austin" }, link: { label: "Courtesy Block Booking Link", href: "https://www.hyatt.com/events/en-US/group-booking/AUSRA/G-BFWB" }, note: "Guests can also call the hotel at 512-480-2079 to make a reservation referencing the group code G-BFWB." }, { eyebrow: "More options", title: "More places to stay", body: "There are plenty more places to stay in town – other hotels, Airbnb’s.\n\nFor a truly Austin experience, you can stay in the city’s most historic hotel: The Driskill. A wealthy cattle barron built it in 1886. Some say it’s haunted…" }] },
  { title: "Getting around", items: [{ eyebrow: "Fly in", title: "Austin-Bergstrom International Airport", body: "All major airlines fly into AUS. From the airport, the easiest trip into town is by taxi or rideshare." }, { eyebrow: "Drive around", title: "Rental cars and wedding transportation", body: "Avis and Hertz are available at the airport. Discount codes, rideshare offers, and wedding-day transportation details are coming soon." }] },
];

export const guideSections: GuideSection[] = [
  { title: "Eat and drink", items: [{ eyebrow: "Restaurants", title: "Restaurants", body: "Casa de Luz, Lolo Wine Bar, Lenoir, Loro, Odd Duck, and Fonda San Miguel." }, { eyebrow: "Barbecue", title: "Barbecue", body: "Leroy and Lewis, KG BBQ, and Mum Foods." }, { eyebrow: "Mexican", title: "Mexican", body: "Veracruz All Natural, El Alma, and Matt’s El Rancho." }, { eyebrow: "Coffee", title: "Coffee", body: "Desnudo, Figure 8, and Radio." }] },
  { title: "What to do", items: [{ eyebrow: "Swimming", title: "Swimming", body: "Barton Springs and Deep Eddy." }, { eyebrow: "Live music", title: "Live music", body: "Antone’s, the Continental Club, the Broken Spoke, the White Horse, and Equipment Room." }] },
];

export const faqs: FaqItem[] = [
  { question: "Can we bring our kids?", answer: "If they're over 18 and their names are on the invitation, definitely! Otherwise, this wedding is adults only. We look forward to spending some adult time with you. Not like that, but like... you know." },
  { question: "Am I invited to the welcome party?", answer: "Weekend-event details will be included with your invitation." },
  { question: "What should I wear?", answer: "See the schedule page. If you have any questions, reach out to Tyler or Katie!", answerLink: { label: "schedule page", href: "/schedule" } },
  { question: "Is the ceremony indoors or outdoors?", answer: "We’ve planned an outdoor ceremony, but we’ll pivot indoors if the weather changes. Keep an eye on the forecast closer to our wedding weekend in case you need to pack an umbrella!" },
  { question: "Is there parking at the venue?", answer: "Yes, there’s plenty of parking at the venue. It’s about a 25-minute drive from the Hyatt Regency Austin, so feel free to carpool. We will have a shuttle bus for out-of-towners, coming to and from the Hyatt on Sunday. Since the venue is a bit more remote, rideshares can be more infrequent — so we recommend planning accordingly." },
  { question: "Do you have a gift registry?", answer: "Not yet. We’ll add registry information here when it is ready." },
  { question: "Can I bring a plus-one?", answer: "Please follow the names on your invitation. Reach out to us if anything is unclear." },
];

export const registryItems: RegistryItem[] = [{ eyebrow: "Registry", title: "Details coming soon", body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.", status: "coming-soon" }];
