import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { Preloader } from "@/components/ui/Preloader";
import { JsonLd } from "@/components/JsonLd";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = "https://chatbot.cybrumsolutions.dev";
const CYBRUM_URL = "https://www.cybrumsolutions.dev";

// Site-wide brand entity, present on every page (including pages other
// schema blocks reference as `provider`/`brand` without an @id) so AI
// answer engines and Google's Knowledge Graph have one canonical
// "Cybrum Solutions" identity to resolve, not a scattered nested object
// per page. Only facts that are actually true go here — no invented
// sameAs profiles.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${CYBRUM_URL}/#organization`,
  name: "Cybrum Solutions",
  url: CYBRUM_URL,
  logo: `${BASE_URL}/logo-dark-theme.png`,
  email: "info@cybrumsolutions.dev",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "CS Chatbot — Free AI Chatbot for Your Website and WhatsApp",
  description:
    "Create a free AI chatbot for your website and your own WhatsApp number in minutes. Paste your URL, watch it learn your site, and chat instantly — no signup, no card. Answers only from your own content, in English, Urdu, or Roman Urdu.",
  keywords: [
    "create a chatbot",
    "create free chatbot",
    "free chatbot for website",
    "AI chatbot for website",
    "chatbot for website free",
    "AI chatbot for WhatsApp",
    "WhatsApp AI chatbot Pakistan",
    "easy way to create a chatbot",
    "website chatbot builder",
    "no-code chatbot builder",
    "Roman Urdu chatbot",
    "chatbot for small business Pakistan",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "CS Chatbot — Free AI Chatbot for Your Website and WhatsApp",
    description:
      "Paste your URL, watch it learn your site, and chat instantly — no signup, no card. Website and WhatsApp, your choice. A Cybrum Solutions product.",
    url: BASE_URL,
    siteName: "CS Chatbot",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CS Chatbot — Free AI Chatbot for Your Website and WhatsApp",
    description:
      "Paste your URL, watch it learn your site, and chat instantly — no signup, no card. Website and WhatsApp, your choice.",
  },
  verification: {
    google: "B-ewPtxWvI8ES5EEiQ89Q-rEYdQF82AbE_5uJu4ZRPc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved theme before paint to avoid a flash. Supports
            light / dark / system; defaults to dark (brand) when unset —
            same mechanism as the Cybrum Solutions marketing site. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('cs-theme')||'dark';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','dark');}try{if(sessionStorage.getItem('cs-splash'))document.documentElement.setAttribute('data-splash','seen');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={organizationJsonLd} />
        <Preloader />
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
