import Link from "next/link";
import { navLinks, cybrum } from "@/lib/site";
import { BrandLockup } from "@/components/ui/BrandMark";

/**
 * Shared marketing footer: the brand lockup, the same routes as the header, and
 * the Cybrum Solutions credit. No client hooks, so it renders on the server
 * even inside client pages.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <span className="group inline-flex">
              <BrandLockup chip={34} bubble={17} />
            </span>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              An AI chatbot trained only on your website&apos;s content — answers with
              sources, in English, Urdu, or Roman Urdu, on your website and on
              WhatsApp.
            </p>
          </div>

          <div className="flex gap-16">
            <nav aria-label="Footer">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Company</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href={cybrum.url} target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-foreground">
                    Cybrum Solutions
                  </a>
                </li>
                <li>
                  <a href={cybrum.contactUrl} target="_blank" rel="noopener noreferrer" className="text-muted transition-colors hover:text-foreground">
                    Contact
                  </a>
                </li>
                <li>
                  <a href={`mailto:${cybrum.email}`} className="text-muted transition-colors hover:text-foreground">
                    {cybrum.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-sm text-muted">
          <p>
            © {new Date().getFullYear()} CS Chatbot — a product by{" "}
            <a href={cybrum.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent-bright transition-colors hover:text-accent">
              Cybrum Solutions
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
