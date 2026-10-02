/**
 * Stories that are not screenshotted, and why.
 *
 * This is the only way to opt a story out. An entry names either one story by
 * its id (`effects-fluid-orb--default`, the `id` in the Storybook URL) or every
 * story under a title (`Effects/Fluid Orb`, which also matches anything nested
 * below it). Each entry says what makes the story impossible to capture the
 * same way twice.
 *
 * Keep it short. The capture already freezes the clock, seeds `Math.random`,
 * turns animations off and stubs images from other hosts (see
 * tests/stories.spec.ts), which is enough for nearly every story. Before adding
 * an entry, run `pnpm visual:stability` and look at the diff: a story that
 * changes between two captures of the same build is usually reading something
 * the capture could pin down instead.
 */
export interface Exclusion {
  /** One story, by id. */
  id?: string;
  /** Every story whose title is this, or sits below it. */
  title?: string;
  reason: string;
}

export const exclusions: Exclusion[] = [
  {
    id: "ai-conversation--long-transcript",
    reason:
      "Opens scrolled to the top on some loads and to the latest message on others. " +
      "Conversation starts out assuming it is at the bottom: its ResizeObserver scrolls there on the first frame, unless the mount effect has already measured that it is not. " +
      "Which of the two runs first is settled inside the browser before the capture can do anything.",
  },
];

export function exclusionFor(story: { id: string; title: string }): Exclusion | undefined {
  return exclusions.find(
    (entry) =>
      entry.id === story.id ||
      (entry.title !== undefined &&
        (story.title === entry.title || story.title.startsWith(`${entry.title}/`))),
  );
}
