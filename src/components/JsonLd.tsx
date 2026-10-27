/**
 * Renders a JSON-LD block. Server component, so the markup is in the HTML a crawler receives
 * without running any JavaScript — which is the whole point of it.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // `<` is escaped so a stray "</script>" inside any content string can't close the tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
