/**
 * The CS Chatbot brand mark: the chat bubble carrying the "CS" lettermark, so
 * the icon reads as Cybrum Solutions. Kept in one place so every surface (nav,
 * footer, pages) draws the identical mark. `currentColor` drives both the
 * bubble stroke and the letters, so callers set the color via text color.
 */
export function BrandBubble({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <text
        x="11.7"
        y="11"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        stroke="none"
        fontSize="8.2"
        fontWeight="700"
        letterSpacing="-0.3"
        style={{ fontFamily: "var(--font-space-grotesk), 'Space Grotesk', sans-serif" }}
      >
        CS
      </text>
    </svg>
  );
}

/**
 * Full lockup used in the header and footer: the bubble in a soft accent chip
 * next to the "CS Chatbot" wordmark. Not a link itself — callers wrap it.
 */
export function BrandLockup({ chip = 36, bubble = 18 }: { chip?: number; bubble?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex items-center justify-center rounded-xl bg-accent/15 text-accent-bright transition-colors group-hover:bg-accent/25"
        style={{ width: chip, height: chip }}
      >
        <BrandBubble size={bubble} />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        CS<span className="text-accent"> Chatbot</span>
      </span>
    </span>
  );
}
