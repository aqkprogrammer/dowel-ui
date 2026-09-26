/**
 * What a streamed response sounds like, and where its sentences end.
 *
 * Pure functions, kept apart from the component so the rules can be read and
 * tested on their own — and so an application with its own renderer can reuse
 * them for text it announces some other way.
 */

export interface SpeakableOptions {
  /**
   * The response is still arriving. An unclosed code fence is withheld rather
   * than summarised, because its line count is not known yet.
   */
  streaming?: boolean;
}

const FENCE = /^(`{3,}|~{3,})[ \t]*([\w+#.-]*)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm;
const OPEN_FENCE = /^(`{3,}|~{3,})[^\n]*$/m;

function describeCode(language: string, body: string): string {
  const lines = body.replace(/\n$/, "").split("\n").length;
  const counted = `${String(lines)} ${lines === 1 ? "line" : "lines"}`;
  return language ? `Code block, ${language}, ${counted}.` : `Code block, ${counted}.`;
}

/**
 * Markdown as a listener would want it read.
 *
 * A screen reader given raw model output reads "asterisk asterisk", every URL
 * in full, and a code block symbol by symbol. None of that is the answer. Code
 * becomes a one-line summary — the reader can navigate to the block itself —
 * links keep their text, and formatting marks disappear.
 */
export function toSpeakable(
  source: string,
  { streaming = false }: SpeakableOptions = {},
): string {
  let text = source.replace(/\r\n?/g, "\n");

  text = text.replace(FENCE, (_match, _fence, language: string, body: string) =>
    describeCode(language, body),
  );

  // A fence that has opened but not closed. Mid-stream its contents are
  // withheld entirely; once the stream is over it is summarised as it stands.
  const open = OPEN_FENCE.exec(text);
  if (open) {
    const before = text.slice(0, open.index);
    if (streaming) {
      text = before;
    } else {
      const header = open[0].replace(/^(`{3,}|~{3,})[ \t]*/, "");
      const language = /^[\w+#.-]*/.exec(header)?.[0] ?? "";
      text = `${before}${describeCode(language, text.slice(open.index + open[0].length + 1))}`;
    }
  }

  // Line-anchored rules use [ \t] rather than \s: with the m flag, \s would
  // cross line breaks and merge a row, heading or item into its neighbour.
  return (
    text
      // Table separator rows carry no words.
      .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/gm, "")
      // Table rows read as a comma-separated line.
      .replace(/^[ \t]*\|(.+)\|[ \t]*$/gm, (_row, cells: string) =>
        cells
          .split("|")
          .map((cell) => cell.trim())
          .filter(Boolean)
          .join(", "),
      )
      // Horizontal rules.
      .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, "")
      // Headings, block quotes and unordered list markers.
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
      .replace(/^[ \t]*>[ \t]?/gm, "")
      .replace(/^[ \t]*[-*+][ \t]+/gm, "")
      // Images keep their description; links keep their text.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_image, alt: string) => (alt ? `Image: ${alt}` : ""))
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Emphasis and inline code. Single underscores are left alone: they are
      // far more often part of an identifier than a mark of emphasis.
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1$2")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1")
  );
}

interface Segmenter {
  segment(input: string): Iterable<{ segment: string }>;
}

type SegmenterConstructor = new (
  locale: string | undefined,
  options: { granularity: "sentence" },
) => Segmenter;

function sentenceSegmenter(locale: string | undefined): Segmenter | null {
  const Constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (typeof Constructor !== "function") return null;
  try {
    return new Constructor(locale, { granularity: "sentence" });
  } catch {
    // An unsupported locale tag throws; the root locale's rules still apply.
    return new Constructor(undefined, { granularity: "sentence" });
  }
}

/**
 * Terminal punctuation followed by space, or a line break. Only used where
 * Intl.Segmenter is missing; it knows nothing of abbreviations or quotes.
 */
const FALLBACK_BREAK = /(?<=[.!?。！？…]["'”’)\]]*)\s+|\n+/;

/**
 * Splits text into sentences.
 *
 * Uses the platform's Unicode sentence rules when it has them, which handle
 * decimals, quotes and scripts that do not end sentences with a full stop.
 * Whitespace-only segments are dropped; text is trimmed.
 */
export function splitSentences(text: string, locale?: string): string[] {
  const segmenter = sentenceSegmenter(locale);
  const parts = segmenter
    ? Array.from(segmenter.segment(text), (part) => part.segment)
    : text.split(FALLBACK_BREAK);
  return parts.map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/**
 * The sentences it is safe to speak.
 *
 * While a response is streaming its last sentence is never complete: "The
 * total is 3." may yet become "The total is 3.5 million", and announcing the
 * first is announcing something the model did not say. A sentence becomes
 * speakable only once the next one has begun — or the stream has ended.
 */
export function completeSentences(
  source: string,
  { streaming = false, locale }: SpeakableOptions & { locale?: string } = {},
): string[] {
  const sentences = splitSentences(toSpeakable(source, { streaming }), locale);
  return streaming ? sentences.slice(0, -1) : sentences;
}

/**
 * Roughly how long a screen reader takes to say something, in milliseconds.
 *
 * Only an estimate — the page cannot know the listener's speech rate — so it is
 * used to pace the queue, never to cut anything short. Script without spaces
 * between words is counted by characters instead.
 */
export function estimateSpeechMs(text: string, wordsPerMinute: number): number {
  const words = Math.max(text.split(/\s+/).filter(Boolean).length, text.length / 6);
  return Math.max(400, Math.round((words / Math.max(wordsPerMinute, 1)) * 60_000));
}
