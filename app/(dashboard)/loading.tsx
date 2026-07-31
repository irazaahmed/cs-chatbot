// Shown instantly while a dashboard page's server component (and its DB
// queries) resolve, so navigating between tabs — and the first paint right
// after sign-in — shows a skeleton immediately instead of a frozen blank
// screen. Next.js wraps the page in a Suspense boundary using this file.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-7 w-44 rounded-lg bg-surface/80" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-surface/60" />
      <div className="glass mt-6 h-[420px] rounded-3xl" />
    </div>
  );
}
