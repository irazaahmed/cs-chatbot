/**
 * Injects a JSON-LD structured-data block as a server-rendered
 * <script type="application/ld+json">. Same pattern as the Cybrum Solutions
 * marketing site's JsonLd component.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
