// Reuses the same dot-blink animation as the crawl-progress indicator
// (see .pv-dot in app/globals.css) so streaming and crawling share one
// "something is happening" visual language instead of two.
export function ThinkingDots({ dotClassName = "bg-current opacity-60" }: { dotClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 py-0.5" aria-label="Thinking">
      <span className={`pv-dot h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      <span className={`pv-dot h-1.5 w-1.5 rounded-full ${dotClassName} [animation-delay:0.15s]`} />
      <span className={`pv-dot h-1.5 w-1.5 rounded-full ${dotClassName} [animation-delay:0.3s]`} />
    </span>
  );
}
