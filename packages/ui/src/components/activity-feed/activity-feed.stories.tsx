import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { CircleCheck, GitBranch, GitPullRequest, Rocket, TriangleAlert } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/avatar";
import { Badge } from "@/components/badge";

import {
  ActivityContent,
  ActivityDescription,
  ActivityFeed,
  ActivityIndicator,
  ActivityItem,
  ActivityTime,
  ActivityTitle,
} from "./activity-feed";

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-96">
    <Story />
  </div>
);

const meta = {
  title: "Data/Activity Feed",
  component: ActivityFeed,
  parameters: { controls: { disable: true } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

const EVENTS = [
  {
    id: "1",
    icon: Rocket,
    title: "Deployed to production",
    detail: "Build 1420 · main",
    at: "2026-09-01T09:12:00Z",
    label: "12 minutes ago",
  },
  {
    id: "2",
    icon: CircleCheck,
    title: "All checks passed",
    detail: "24 tests, 0 failures",
    at: "2026-09-01T09:04:00Z",
    label: "20 minutes ago",
  },
  {
    id: "3",
    icon: GitPullRequest,
    title: "Opened pull request #482",
    detail: "Add keyboard shortcuts to the command palette",
    at: "2026-08-31T17:20:00Z",
    label: "Yesterday",
  },
  {
    id: "4",
    icon: GitBranch,
    title: "Created branch feat/shortcuts",
    detail: "From main",
    at: "2026-08-31T16:02:00Z",
    label: "Yesterday",
  },
];

export const Default: Story = {
  render: () => (
    <ActivityFeed>
      {EVENTS.map((event, index) => {
        const Icon = event.icon;
        return (
          <ActivityItem key={event.id} last={index === EVENTS.length - 1}>
            <ActivityIndicator>
              <Icon />
            </ActivityIndicator>
            <ActivityContent>
              <ActivityTitle>{event.title}</ActivityTitle>
              <ActivityDescription>{event.detail}</ActivityDescription>
              <ActivityTime dateTime={event.at}>{event.label}</ActivityTime>
            </ActivityContent>
          </ActivityItem>
        );
      })}
    </ActivityFeed>
  ),
};

/** Avatars as the rail markers, via asChild. */
export const WithAvatars: Story = {
  render: () => (
    <ActivityFeed>
      {[
        {
          id: "1",
          who: "AL",
          title: "Ada Lovelace approved the pull request",
          at: "2026-09-01T09:12:00Z",
          label: "12 minutes ago",
        },
        {
          id: "2",
          who: "GH",
          title: "Grace Hopper left a comment",
          at: "2026-09-01T08:40:00Z",
          label: "44 minutes ago",
        },
        {
          id: "3",
          who: "KJ",
          title: "Katherine Johnson requested changes",
          at: "2026-08-31T18:05:00Z",
          label: "Yesterday",
        },
      ].map((event, index, all) => (
        <ActivityItem key={event.id} last={index === all.length - 1}>
          <ActivityIndicator asChild>
            <Avatar size="xs">
              <AvatarFallback>{event.who}</AvatarFallback>
            </Avatar>
          </ActivityIndicator>
          <ActivityContent>
            <ActivityTitle>{event.title}</ActivityTitle>
            <ActivityTime dateTime={event.at}>{event.label}</ActivityTime>
          </ActivityContent>
        </ActivityItem>
      ))}
    </ActivityFeed>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <ActivityFeed>
      <ActivityItem>
        <ActivityIndicator className="border-success/40 text-success">
          <CircleCheck />
        </ActivityIndicator>
        <ActivityContent>
          <ActivityTitle className="flex items-center gap-2">
            Deployment succeeded
            <Badge variant="success" size="sm">
              Live
            </Badge>
          </ActivityTitle>
          <ActivityTime dateTime="2026-09-01T09:12:00Z">12 minutes ago</ActivityTime>
        </ActivityContent>
      </ActivityItem>
      <ActivityItem last>
        <ActivityIndicator className="border-warning/40 text-warning">
          <TriangleAlert />
        </ActivityIndicator>
        <ActivityContent>
          <ActivityTitle>Build finished with warnings</ActivityTitle>
          <ActivityDescription>3 unused exports detected.</ActivityDescription>
          <ActivityTime dateTime="2026-09-01T09:05:00Z">19 minutes ago</ActivityTime>
        </ActivityContent>
      </ActivityItem>
    </ActivityFeed>
  ),
};
