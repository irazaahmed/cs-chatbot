const PDF_SCHEME = "pdf://";

// PDF-sourced citations use a "pdf://<filename>" pseudo-URL (see
// worker.ts's pdf_ingest job) — not a real navigable link, so it renders as
// a plain label instead of a dead <a href="pdf://...">.
export function CitationLink({ url, className }: { url: string; className: string }) {
  if (url.startsWith(PDF_SCHEME)) {
    return <span className={className}>📄 {url.slice(PDF_SCHEME.length)}</span>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {url}
    </a>
  );
}
