/**
 * A JSON-LD graph, emitted as a script tag.
 *
 * The payload is built server-side from the registry, never from user input,
 * so the only escaping needed is the one that stops a `</script>` sequence
 * inside a description from closing the tag early.
 */
export function JsonLd({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json.replace(/</g, "\\u003c") }}
    />
  );
}
