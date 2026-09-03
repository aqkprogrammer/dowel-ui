/**
 * The model behind a review of extracted fields: where each value was read
 * from, what the reviewer decided about it, and how far through the review
 * they are.
 *
 * Pure, so overlap handling and the completion rule are tested without
 * rendering anything — and so an application can answer "is this review
 * finished" on the server from the same decisions the component reports,
 * rather than trusting a flag the client sent.
 */

export interface SourceSpan {
  /** Offset into the source text in UTF-16 code units. Inclusive. */
  start: number;
  /** Exclusive. */
  end: number;
}

export interface ExtractionField {
  /** Key in the extracted object. */
  name: string;
  label: string;
  /**
   * What the model extracted. Absent while streaming means it has not arrived;
   * absent once streaming has ended means the model found nothing.
   */
  value?: string;
  /**
   * Where in the source the value was read from. Absent means the model
   * supplied the value without evidence, which the review says outright.
   */
  span?: SourceSpan;
  /** 0 to 1. Shown as a number, never only as a colour. */
  confidence?: number;
  /** A textarea instead of a single line. For addresses and descriptions. */
  multiline?: boolean;
}

export type FieldDecision =
  /** The model's value, taken as it was. */
  | { kind: "accepted"; value: string }
  /** The reviewer's value, with the model's kept so a record can tell them apart. */
  | { kind: "corrected"; value: string; proposed: string }
  /** Wrong and not corrected — the field does not apply, or cannot be known. */
  | { kind: "rejected" };

/** A run of source text and the fields whose evidence covers it. */
export interface SourceRun {
  text: string;
  /** Field names, in declaration order. Empty for text nobody cites. */
  fields: string[];
}

/**
 * A span brought within the source, or null if nothing of it is.
 *
 * Offsets come from a model or an OCR layer and are wrong often enough that
 * refusing to render on a bad one would leave the whole review blank. A span
 * past the end is clamped; an inverted or empty one is treated as no evidence,
 * which is what it is.
 */
export function clampSpan(span: SourceSpan, length: number): SourceSpan | null {
  const start = Math.max(0, Math.min(span.start, length));
  const end = Math.max(0, Math.min(span.end, length));
  return end > start ? { start, end } : null;
}

/** The text a span points at, or an empty string if it points at nothing. */
export function evidenceOf(source: string, span: SourceSpan | undefined): string {
  if (!span) return "";
  const clamped = clampSpan(span, source.length);
  return clamped ? source.slice(clamped.start, clamped.end) : "";
}

/** Whether a field's value can be checked against the source at all. */
export function isSourced(source: string, field: ExtractionField): boolean {
  return field.span !== undefined && clampSpan(field.span, source.length) !== null;
}

/**
 * Cuts the source into runs at every span boundary, so overlapping evidence —
 * a total that sits inside the line that contains it — renders as nested
 * coverage rather than as two marks fighting over the same characters.
 */
export function segmentSource(source: string, fields: ExtractionField[]): SourceRun[] {
  const spans = fields.flatMap((field) => {
    const clamped = field.span ? clampSpan(field.span, source.length) : null;
    return clamped ? [{ name: field.name, ...clamped }] : [];
  });

  if (source.length === 0) return [];
  if (spans.length === 0) return [{ text: source, fields: [] }];

  const cuts = new Set<number>([0, source.length]);
  for (const span of spans) {
    cuts.add(span.start);
    cuts.add(span.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const runs: SourceRun[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index] ?? 0;
    const end = points[index + 1] ?? start;
    if (end <= start) continue;
    runs.push({
      text: source.slice(start, end),
      fields: spans.filter((span) => span.start <= start && span.end >= end).map((s) => s.name),
    });
  }
  return runs;
}

export interface ReviewSummary {
  total: number;
  reviewed: number;
  accepted: number;
  corrected: number;
  rejected: number;
  /** Fields with a value the model could not point to in the source. */
  unsourced: string[];
  /** Fields still awaiting a decision. */
  remaining: string[];
  /** Every field has a decision. The only completion signal worth trusting. */
  complete: boolean;
}

export function summarizeReview(
  source: string,
  fields: ExtractionField[],
  decisions: Record<string, FieldDecision> = {},
): ReviewSummary {
  const summary: ReviewSummary = {
    total: fields.length,
    reviewed: 0,
    accepted: 0,
    corrected: 0,
    rejected: 0,
    unsourced: [],
    remaining: [],
    complete: false,
  };

  for (const field of fields) {
    if (field.value !== undefined && !isSourced(source, field)) {
      summary.unsourced.push(field.name);
    }
    const decision = decisions[field.name];
    if (!decision) {
      summary.remaining.push(field.name);
      continue;
    }
    summary.reviewed += 1;
    summary[decision.kind] += 1;
  }

  summary.complete = fields.length > 0 && summary.remaining.length === 0;
  return summary;
}
