"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/avatar";
import { Button } from "@/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/form";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Separator } from "@/components/separator";
import { Switch } from "@/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { cn } from "@/lib/utils";

/**
 * A settings page: profile, notifications and a danger zone.
 *
 * Two things are deliberate. Switches apply immediately and have no Save button
 * — a switch that needs saving is a broken promise, so anything staged belongs
 * in a form instead. And the destructive action asks for confirmation naming
 * exactly what will be destroyed, rather than a generic "Are you sure?".
 */

export interface SettingsProfile {
  name: string;
  email: string;
  bio?: string;
}

export interface SettingsNotification {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface SettingsBlockProps {
  profile: SettingsProfile;
  notifications: SettingsNotification[];
  /** Staged: the profile form has a Save button. */
  onSaveProfile?: (profile: SettingsProfile) => void;
  /** Immediate: a switch applies as soon as it is flipped. */
  onToggleNotification?: (id: string, enabled: boolean) => void;
  onDeleteAccount?: () => void;
  pending?: boolean;
  /** Extra tabs, if the product needs them. */
  extraTabs?: { value: string; label: string; content: ReactNode }[];
  className?: string;
}

export function SettingsBlock({
  profile,
  notifications,
  onSaveProfile,
  onToggleNotification,
  onDeleteAccount,
  pending = false,
  extraTabs = [],
  className,
}: SettingsBlockProps) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [touched, setTouched] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  const emailError =
    touched && !email.includes("@") ? "Enter a valid email address." : undefined;
  const nameError = touched && name.trim().length === 0 ? "Enter your name." : undefined;

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!email.includes("@") || name.trim().length === 0) return;
    onSaveProfile?.({ name, email, bio });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and how you are notified.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList variant="underline">
          <TabsTrigger value="profile" variant="underline">
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" variant="underline">
            Notifications
          </TabsTrigger>
          {extraTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} variant="underline">
              {tab.label}
            </TabsTrigger>
          ))}
          <TabsTrigger value="danger" variant="underline">
            Danger zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>Profile</h2>
              </CardTitle>
              <CardDescription>This is how you appear to your team.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form onSubmit={handleSave} className="gap-4">
                <div className="flex items-center gap-4">
                  <Avatar size="lg">
                    <AvatarFallback>
                      {name
                        .split(" ")
                        .map((part) => part[0] ?? "")
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" size="sm" disabled={pending}>
                    Change photo
                  </Button>
                </div>

                <FormField name="name" error={nameError}>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      value={name}
                      disabled={pending}
                      onChange={(event) => {
                        setName(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>

                <FormField name="email" error={emailError}>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      disabled={pending}
                      onChange={(event) => {
                        setEmail(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>Used for sign-in and notifications.</FormDescription>
                  <FormMessage />
                </FormField>

                <FormField name="bio">
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Input
                      value={bio}
                      disabled={pending}
                      placeholder="A sentence about you"
                      onChange={(event) => {
                        setBio(event.target.value);
                      }}
                    />
                  </FormControl>
                </FormField>

                <div className="flex justify-end">
                  <Button type="submit" loading={pending}>
                    Save changes
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h2>Notifications</h2>
              </CardTitle>
              <CardDescription>
                These apply straight away — there is nothing to save.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start justify-between gap-4 px-6 py-4"
                >
                  <div className="grid gap-1">
                    <Label htmlFor={notification.id}>{notification.label}</Label>
                    <p className="text-xs text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch
                    id={notification.id}
                    checked={notification.enabled}
                    onCheckedChange={(checked) => {
                      onToggleNotification?.(notification.id, checked);
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {extraTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {tab.content}
          </TabsContent>
        ))}

        <TabsContent value="danger">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle asChild>
                <h2>Delete this account</h2>
              </CardTitle>
              <CardDescription>
                Everything in the workspace is removed permanently. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <p className="text-sm text-muted-foreground">
                Your projects, deployments and audit history are deleted along with the account.
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete account</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Delete {profile.name}&rsquo;s account?</DialogTitle>
                    {/* Names what is destroyed. "Are you sure?" tells nobody
                        anything they did not already know. */}
                    <DialogDescription>
                      This permanently deletes the account, its projects and all deployment
                      history. It cannot be undone.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-2">
                    <Label htmlFor="confirm-delete">
                      Type <span className="font-mono">{profile.email}</span> to confirm
                    </Label>
                    <Input
                      id="confirm-delete"
                      value={confirmation}
                      autoComplete="off"
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                      }}
                    />
                  </div>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={confirmation !== profile.email}
                      onClick={onDeleteAccount}
                    >
                      Delete account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
