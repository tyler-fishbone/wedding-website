export type NavigationItem = { label: string; href: string };
export type WeddingEvent = { id: string; eyebrow: string; day: string; name: string; status: "confirmed" | "coming-soon"; time: string; location: string; address?: string; attire: string; description: string; startDateTime?: string; endDateTime?: string };
export type StorySection = { eyebrow: string; title: string; body: string };
export type GuideItem = { eyebrow: string; title: string; body: string };
export type GuideSection = { title: string; items: GuideItem[] };
export type FaqItem = { question: string; answer: string };
export type RegistryItem = { eyebrow: string; title: string; body: string; href?: string; status: "active" | "coming-soon" };

export const wedding = { couple: "Katie and Tyler", dateIso: "2027-04-04", dateLabel: "Sunday, April 4, 2027", shortDateLabel: "April 4, 2027", countdownTarget: "2027-04-04T16:00:00-05:00", city: "Austin, Texas", venue: "Addison Grove", timezone: "America/Chicago" } as const;

export const navigation: NavigationItem[] = [
  { label: "Home", href: "/" }, { label: "Our story", href: "/our-story" }, { label: "Schedule", href: "/schedule" }, { label: "Local guide", href: "/local-guide" }, { label: "FAQ", href: "/faq" }, { label: "Registry", href: "/registry" }, { label: "RSVP", href: "/rsvp" }, { label: "Save the date", href: "/save-the-date" },
];

export const events: WeddingEvent[] = [
  { id: "welcome-party", eyebrow: "Saturday, April 3", day: "03", name: "Welcome party", status: "coming-soon", time: "Details to come", location: "Austin, Texas", attire: "Casual and comfortable", description: "Join us for a first round of hugs, drinks, and good company before the wedding day." },
  { id: "wedding", eyebrow: "Sunday, April 4", day: "04", name: "Ceremony and reception", status: "coming-soon", time: "Details to come", location: wedding.venue, address: "Austin, Texas", attire: "Garden formal", description: "We’ll gather under the oaks, then settle in for dinner, glasses raised, and a long night together." },
];

export const storySections: StorySection[] = [
  { eyebrow: "How we met", title: "Where we started", body: "Our real beginning—first impressions, the setting, and the small detail we still remember—will live here." },
  { eyebrow: "Falling in love", title: "The part that made it real", body: "The trips, rituals, and ordinary days that turned seeing each other into building a life together." },
  { eyebrow: "The proposal", title: "How Tyler asked", body: "The story of where it happened, who knew, and how the plan actually unfolded is coming soon." },
  { eyebrow: "Now", title: "Why Austin", body: "A city we love, a grove full of old trees, and one long table with our favorite people around it." },
];

export const guideSections: GuideSection[] = [
  { title: "Where to stay", items: [{ eyebrow: "Downtown Austin", title: "Stay close to the city", body: "A convenient home base for restaurants, music, and the rest of the wedding weekend. Hotel-block details are coming soon." }, { eyebrow: "Hill Country", title: "Stay closer to the venue", body: "Quieter inns and rentals west of town trade nightlife for a shorter wedding-day drive." }] },
  { title: "Food and drink", items: [{ eyebrow: "Barbecue", title: "Make time for smoke", body: "Austin has no shortage of excellent brisket. We’ll share a short list of favorites before you book the weekend." }, { eyebrow: "Coffee", title: "Start slowly", body: "Neighborhood coffee shops are one of our favorite ways to spend a morning here." }] },
  { title: "Things to do", items: [{ eyebrow: "Outdoors", title: "Barton Springs and Zilker Park", body: "A spring-fed swim and a big patch of green make a very Austin morning." }, { eyebrow: "Music", title: "Find a small room", body: "Skip the giant venue and catch a band somewhere close enough to see the set list." }] },
  { title: "Getting around", items: [{ eyebrow: "Airport", title: "Austin-Bergstrom (AUS)", body: "The city’s main airport is southeast of downtown. Allow extra time during busy weekends." }, { eyebrow: "Wedding day", title: "Transportation details to come", body: "Addison Grove is outside central Austin. We’ll share the safest, simplest plan well before the wedding." }] },
];

export const faqs: FaqItem[] = [
  { question: "Can we bring our kids?", answer: "Please follow the names on your invitation. We’ll share household-specific details when invitations go out." },
  { question: "Am I invited to the welcome party?", answer: "Weekend-event details will be included with your invitation." },
  { question: "What should I wear?", answer: "Plan on garden formal for the wedding. Choose shoes that are comfortable on grass." },
  { question: "Is the ceremony indoors or outdoors?", answer: "The current plan is to gather outdoors under the oaks, with weather plans available if we need them." },
  { question: "Is there parking at the venue?", answer: "Yes. We’ll publish full arrival and transportation guidance closer to the date." },
  { question: "Do you have a gift registry?", answer: "Not yet. We’ll add registry information here when it is ready." },
  { question: "Can I bring a plus-one?", answer: "Please follow the names on your invitation. Reach out to us if anything is unclear." },
  { question: "Who do we contact with questions?", answer: "You can contact Katie or Tyler directly for now." },
];

export const registryItems: RegistryItem[] = [{ eyebrow: "Registry", title: "Details coming soon", body: "Your presence is the gift we care about. For those who have asked, we’ll add registry information here later.", status: "coming-soon" }];
