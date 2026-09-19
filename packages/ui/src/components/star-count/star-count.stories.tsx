import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "@/components/button";

import { StarCount } from "./star-count";

const STARGAZERS = [
  "octocat",
  "hubot",
  "monalisa",
  "defunkt",
  "mojombo",
  "pjhyett",
  "wycats",
].map((name) => ({
  name,
  src: `https://picsum.photos/seed/${name}/80/80`,
  href: "#",
}));

const meta: Meta<typeof StarCount> = {
  title: "Display/Star Count",
  component: StarCount,
  args: {
    count: 4821,
    variant: "plain",
    animateOnMount: true,
    maxAvatars: 5,
  },
  argTypes: {
    variant: { control: "select", options: ["plain", "pill"] },
    stargazers: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { stargazers: STARGAZERS },
};

/**
 * SmoothUI GitHub Stars Animation, both demo instances: with five stargazer
 * avatars, and `showAvatars={false}` (here: no `stargazers`). The source
 * fetched these from the GitHub API; here they are props.
 */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <figure className="flex flex-col items-center gap-3">
        <StarCount count={4821} stargazers={STARGAZERS} maxAvatars={5} />
        <figcaption className="text-xs text-muted-foreground">
          GitHub Stars Animation — with avatars
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-3">
        <StarCount count={4821} />
        <figcaption className="text-xs text-muted-foreground">
          GitHub Stars Animation — showAvatars false
        </figcaption>
      </figure>
    </div>
  ),
};

/** A star button linking to the repository. */
export const Pill: Story = {
  args: { variant: "pill", href: "#", count: 12_300, format: { notation: "compact" } },
};

function Live() {
  const [count, setCount] = useState(998);
  return (
    <div className="flex items-center gap-4">
      <StarCount count={count} variant="pill" locales="en-US" />
      <Button
        variant="outline"
        onClick={() => {
          setCount((value) => value + 1);
        }}
      >
        Star
      </Button>
    </div>
  );
}

/** Later changes roll from the previous value, and the star pops. */
export const Changing: Story = {
  parameters: { controls: { disable: true } },
  render: () => <Live />,
};
