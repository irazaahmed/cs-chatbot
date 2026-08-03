/**
 * Central marketing-site config: brand strings, nav routes, and the Cybrum
 * Solutions channels the Contact page points at. One source of truth so the
 * nav, footer, and pages never drift.
 *
 * Naming rule (per the product owner): use "CS Chatbot" where the name is
 * short (nav, buttons, chips) and "Cybrum Solutions Chatbot" where it's spelled
 * out in prose (page intros, metadata, structured data).
 */

export const site = {
  shortName: "CS Chatbot",
  fullName: "Cybrum Solutions Chatbot",
  url: "https://chatbot.cybrumsolutions.dev",
  tagline: "An AI chatbot trained on your own website, also available on WhatsApp.",
} as const;

/** The parent company site and the ways to reach the team. */
export const cybrum = {
  url: "https://www.cybrumsolutions.dev",
  contactUrl: "https://www.cybrumsolutions.dev/contact",
  productUrl: "https://www.cybrumsolutions.dev/products/chatbot",
  whatsappLink: "https://wa.me/923370292786",
  whatsappDisplay: "+92 337 0292786",
  email: "info@cybrumsolutions.dev",
} as const;

/** Primary marketing navigation — every entry is a real route. Home is the logo. */
export const navLinks = [
  { label: "How to use", href: "/how-to-use" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
