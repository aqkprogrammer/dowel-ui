import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Battery,
  BatteryCharging,
  Bell,
  BellRing,
  Bookmark,
  Check,
  Cloud,
  CloudUpload,
  Copy,
  Download,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  GitFork,
  Link,
  Lock,
  LockOpen,
  Maximize,
  Mic,
  MicOff,
  Minimize,
  Moon,
  Pause,
  Pen,
  Play,
  Search,
  Send,
  Star,
  Sun,
  ThumbsUp,
  Upload,
  User,
  UserCheck,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { MorphButton, type MorphButtonProps } from "./morph-button";

const meta = {
  title: "Form/Morph Button",
  component: MorphButton,
  args: {
    icon: <Mic />,
    activeIcon: <MicOff />,
    label: "Microphone",
    tone: "destructive",
    morph: "scale",
    trigger: "toggle",
  },
  argTypes: {
    morph: { control: "select", options: ["scale", "rise", "tilt"] },
    tone: {
      control: "select",
      options: ["current", "primary", "success", "warning", "destructive", "info"],
    },
    trigger: { control: "select", options: ["toggle", "transient", "hover", "manual"] },
    adornment: { control: "select", options: ["none", "sparkle", "dot"] },
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "destructive"],
    },
    icon: { control: false },
    activeIcon: { control: false },
  },
} satisfies Meta<typeof MorphButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

type Item = { source: string } & MorphButtonProps;

/*
 * Every amicro item of the morph, color-morph, sparkle and ring types, in
 * source order. The demo swapped on hover; here each one is driven by the
 * trigger its meaning calls for — a microphone toggles, "Copy Hash" confirms
 * and reverts, "Deploy App" keeps the hover affordance.
 */
const ITEMS: Item[] = [
  {
    source: "Star on GitHub",
    label: "Star on GitHub",
    icon: <GitFork />,
    activeIcon: <Star />,
    morph: "rise",
    adornment: "sparkle",
    tone: "warning",
  },
  {
    source: "Deploy App",
    label: "Deploy App",
    icon: <Cloud />,
    activeIcon: <CloudUpload />,
    tone: "info",
    trigger: "hover",
  },
  {
    source: "Copy Hash",
    label: "Copy Hash",
    activeLabel: "Copied",
    icon: <Copy />,
    activeIcon: <Check />,
    tone: "success",
    trigger: "transient",
  },
  {
    source: "Share",
    label: "Share",
    icon: <Link />,
    activeIcon: <Send />,
    tone: "info",
    trigger: "hover",
  },
  {
    source: "Preview",
    label: "Preview",
    icon: <Play />,
    activeIcon: <Pause />,
    tone: "success",
  },
  {
    source: "Subscribe",
    label: "Subscribe",
    icon: <Bell />,
    activeIcon: <BellRing />,
    morph: "tilt",
    adornment: "dot",
    tone: "warning",
  },
  { source: "Search", label: "Search", icon: <Search />, activeIcon: <X /> },
  { source: "Theme", label: "Theme", icon: <Moon />, activeIcon: <Sun />, tone: "warning" },
  {
    source: "Microphone",
    label: "Microphone",
    icon: <Mic />,
    activeIcon: <MicOff />,
    tone: "destructive",
  },
  {
    source: "Camera",
    label: "Camera",
    icon: <Video />,
    activeIcon: <VideoOff />,
    tone: "destructive",
  },
  { source: "Volume", label: "Volume", icon: <Volume2 />, activeIcon: <VolumeX /> },
  { source: "Lock", label: "Lock", icon: <Lock />, activeIcon: <LockOpen />, tone: "success" },
  {
    source: "Directory",
    label: "Directory",
    icon: <Folder />,
    activeIcon: <FolderOpen />,
    tone: "info",
  },
  { source: "Visibility", label: "Visibility", icon: <Eye />, activeIcon: <EyeOff /> },
  {
    source: "Save Later",
    label: "Save Later",
    icon: <Bookmark />,
    fillOnActive: true,
    tone: "primary",
  },
  { source: "Like", label: "Like", icon: <ThumbsUp />, fillOnActive: true, tone: "primary" },
  {
    source: "Download",
    label: "Download",
    icon: <Download />,
    activeIcon: <Check />,
    tone: "success",
    trigger: "transient",
  },
  {
    source: "Upload",
    label: "Upload",
    icon: <Upload />,
    activeIcon: <Check />,
    tone: "info",
    trigger: "transient",
  },
  {
    source: "Account",
    label: "Account",
    icon: <User />,
    activeIcon: <UserCheck />,
    tone: "success",
  },
  {
    source: "Submit",
    label: "Submit",
    activeLabel: "Submitted",
    icon: <Send />,
    activeIcon: <Check />,
    tone: "success",
    trigger: "transient",
  },
  {
    source: "Edit",
    label: "Edit",
    activeLabel: "Saved",
    icon: <Pen />,
    activeIcon: <Check />,
    tone: "success",
    trigger: "transient",
  },
  {
    source: "Network",
    label: "Network",
    icon: <Wifi />,
    activeIcon: <WifiOff />,
    tone: "destructive",
  },
  {
    source: "Power",
    label: "Power",
    icon: <Battery />,
    activeIcon: <BatteryCharging />,
    tone: "success",
  },
  { source: "Expand", label: "Expand", icon: <Maximize />, activeIcon: <Minimize /> },
  {
    source: "Favorite",
    label: "Favorite",
    icon: <Star />,
    fillOnActive: true,
    tone: "warning",
  },
];

/** All 25 amicro morph, color-morph, sparkle and ring buttons. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-3">
      {ITEMS.map(({ source, ...props }) => (
        <MorphButton key={source} className="rounded-full" {...props} />
      ))}
    </div>
  ),
};

/** The same set icon-only, as amicro's matrix layout. Each needs an aria-label. */
export const IconOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map(({ source, label: _label, activeLabel: _activeLabel, ...props }) => (
        <MorphButton
          key={source}
          aria-label={source}
          variant="ghost"
          className="rounded-full"
          {...props}
        />
      ))}
    </div>
  ),
};

export const Morphs: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <MorphButton morph="scale" icon={<Moon />} activeIcon={<Sun />} label="Scale" />
      <MorphButton morph="rise" icon={<Upload />} activeIcon={<Check />} label="Rise" />
      <MorphButton morph="tilt" icon={<Bell />} activeIcon={<BellRing />} label="Tilt" />
    </div>
  ),
};

/** A transient confirmation: announced politely, reverts after `revertAfter`. */
export const Transient: Story = {
  args: {
    trigger: "transient",
    icon: <Copy />,
    activeIcon: <Check />,
    label: "Copy hash",
    activeLabel: "Copied",
    tone: "success",
  },
};

export const Hover: Story = {
  args: {
    trigger: "hover",
    icon: <Cloud />,
    activeIcon: <CloudUpload />,
    label: "Deploy app",
    tone: "info",
  },
};
