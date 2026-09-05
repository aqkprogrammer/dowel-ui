"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import {
  Conversation,
  ConversationMessages,
  ConversationScrollButton,
  ConversationStatus,
} from "@/components/ai-conversation";
import { Message, MessageAvatar, MessageBody, MessageFooter } from "@/components/ai-message";
import { ModelSelector, type ModelOption } from "@/components/ai-model-selector";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@/components/ai-prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-reasoning";
import { Response, ThinkingIndicator } from "@/components/ai-response";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-sources";
import { StructuredOutput, type OutputField } from "@/components/ai-structured-output";
import { TokenCount, TokenUsage } from "@/components/ai-token-usage";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolPayload,
  ToolSection,
  type ToolStatus,
} from "@/components/ai-tool";
import { Button } from "@/components/button";
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from "@/components/empty-state";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLabel,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/sidebar";
import { cn } from "@/lib/utils";

/**
 * A whole AI application surface: the conversations down one side, the one
 * you are in across the middle, and what the model is working from on the
 * other side.
 *
 * The third column is the point. A chat box on its own hides the two things a
 * person most needs to trust an answer — what the model was given, and how
 * much of its window is already spent — and a workspace that shows both is a
 * workspace where "why did it say that?" has somewhere to look.
 *
 * Every decision the AI components encode still holds: the transcript is a
 * list and not a live region, state is announced separately, and the composer
 * will not send mid-IME-composition.
 */

export interface WorkspaceThread {
  id: string;
  title: string;
  /** Machine-readable time of the last message. */
  at?: string;
  /** Human label, e.g. "2h ago". */
  label?: string;
}

export interface WorkspaceAttachment {
  id: string;
  name: string;
  /** e.g. "PDF · 2.4 MB". */
  detail?: string;
  href?: string;
}

export interface WorkspaceToolCall {
  id: string;
  name: string;
  status: ToolStatus;
  arguments?: string;
  result?: string;
}

export interface WorkspaceSource {
  index: number;
  title: string;
  origin?: string;
  href?: string;
}

export interface WorkspaceMessage {
  id: string;
  from: "user" | "assistant";
  content: string;
  reasoning?: string;
  tools?: WorkspaceToolCall[];
  sources?: WorkspaceSource[];
  tokens?: number;
  /** Still arriving: shows the caret. */
  streaming?: boolean;
}

export interface WorkspaceOutput {
  title?: string;
  fields: OutputField[];
  value: Record<string, unknown>;
  streaming?: boolean;
  errors?: Record<string, string>;
}

export interface AiWorkspaceBlockProps {
  /** The application's name, at the top of the conversation list. */
  name?: string;
  threads: WorkspaceThread[];
  activeThread?: string;
  onSelectThread?: (id: string) => void;
  onNewThread?: () => void;
  /** The transcript of the active thread. */
  messages: WorkspaceMessage[];
  onSend?: (message: string) => void;
  onStop?: () => void;
  /** A response is in flight. */
  busy?: boolean;
  /** Shown before the first token arrives. */
  waiting?: boolean;
  models?: ModelOption[];
  model?: string;
  onModelChange?: (model: string) => void;
  /** Context consumed so far, and the window. Both or neither. */
  tokensUsed?: number;
  tokenLimit?: number;
  attachments?: WorkspaceAttachment[];
  onAttach?: () => void;
  onRemoveAttachment?: (attachment: WorkspaceAttachment) => void;
  /** A structured result the conversation is filling in, shown beside it. */
  output?: WorkspaceOutput;
  placeholder?: string;
  /** Anything else for the top bar — a share button, a settings link. */
  headerActions?: ReactNode;
  className?: string;
}

export function AiWorkspaceBlock({
  name = "Workspace",
  threads,
  activeThread,
  onSelectThread,
  onNewThread,
  messages,
  onSend,
  onStop,
  busy = false,
  waiting = false,
  models,
  model,
  onModelChange,
  tokensUsed,
  tokenLimit,
  attachments = [],
  onAttach,
  onRemoveAttachment,
  output,
  placeholder = "Ask anything…",
  headerActions,
  className,
}: AiWorkspaceBlockProps) {
  const [draft, setDraft] = useState("");

  const current = threads.find((thread) => thread.id === activeThread);
  const hasContext =
    (tokensUsed !== undefined && tokenLimit !== undefined) ||
    attachments.length > 0 ||
    onAttach !== undefined ||
    output !== undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setDraft("");
  }

  return (
    <SidebarProvider>
      <div className={cn("flex h-full min-h-0 w-full", className)}>
        <Sidebar label="Conversations" mobileTitle="Conversations">
          <SidebarHeader className="flex flex-row items-center justify-between gap-2">
            <span className="truncate px-2 text-sm font-semibold">{name}</span>
            <SidebarTrigger />
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Recent</SidebarGroupLabel>
              {threads.length === 0 ? (
                <p className="px-2 text-xs text-muted-foreground">No conversations yet.</p>
              ) : (
                <SidebarMenu>
                  {threads.map((thread) => (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton
                        href={`#${thread.id}`}
                        isActive={thread.id === activeThread}
                        onClick={(event) => {
                          event.preventDefault();
                          onSelectThread?.(thread.id);
                        }}
                      >
                        <SidebarMenuLabel className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                          <span className="truncate">{thread.title}</span>
                          {thread.label ? (
                            <time
                              dateTime={thread.at}
                              className="shrink-0 text-2xs text-muted-foreground"
                            >
                              {thread.label}
                            </time>
                          ) : null}
                        </SidebarMenuLabel>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroup>
          </SidebarContent>

          {onNewThread ? (
            <SidebarFooter>
              <Button variant="outline" size="sm" className="w-full" onClick={onNewThread}>
                New conversation
              </Button>
            </SidebarFooter>
          ) : null}
        </Sidebar>

        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
              {current?.title ?? "New conversation"}
            </h1>
            {models && models.length > 0 ? (
              <ModelSelector
                aria-label="Model"
                models={models}
                value={model}
                onValueChange={onModelChange}
                triggerSize="sm"
              />
            ) : null}
            {headerActions}
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Conversation>
                {messages.length === 0 ? (
                  <div className="grid h-full place-items-center p-8">
                    <EmptyState>
                      <EmptyStateTitle>Start a conversation</EmptyStateTitle>
                      <EmptyStateDescription>
                        Ask a question, attach a document, or describe what you need done.
                      </EmptyStateDescription>
                    </EmptyState>
                  </div>
                ) : (
                  <ConversationMessages>
                    {messages.map((message) => (
                      <Message key={message.id} from={message.from}>
                        {message.from === "assistant" ? (
                          <MessageAvatar>AI</MessageAvatar>
                        ) : null}
                        <MessageBody from={message.from} className="min-w-0 flex-1">
                          {message.reasoning ? (
                            <Reasoning className="mb-2">
                              <ReasoningTrigger streaming={message.streaming} />
                              <ReasoningContent>{message.reasoning}</ReasoningContent>
                            </Reasoning>
                          ) : null}

                          {message.tools?.map((tool) => (
                            <Tool key={tool.id} status={tool.status} className="mb-2">
                              <ToolHeader name={tool.name} status={tool.status} />
                              <ToolContent>
                                {tool.arguments ? (
                                  <ToolSection label="Arguments">
                                    <ToolPayload label={`${tool.name} arguments`}>
                                      {tool.arguments}
                                    </ToolPayload>
                                  </ToolSection>
                                ) : null}
                                {tool.result ? (
                                  <ToolSection label="Result">
                                    <ToolPayload label={`${tool.name} result`}>
                                      {tool.result}
                                    </ToolPayload>
                                  </ToolSection>
                                ) : null}
                              </ToolContent>
                            </Tool>
                          ))}

                          {message.from === "assistant" ? (
                            <Response streaming={message.streaming}>{message.content}</Response>
                          ) : (
                            message.content
                          )}

                          {message.sources && message.sources.length > 0 ? (
                            <Sources className="mt-3">
                              <SourcesTrigger count={message.sources.length} />
                              <SourcesContent>
                                {message.sources.map((source) => (
                                  <Source
                                    key={source.index}
                                    index={source.index}
                                    title={source.title}
                                    origin={source.origin}
                                    href={source.href ?? "#"}
                                  />
                                ))}
                              </SourcesContent>
                            </Sources>
                          ) : null}

                          {message.from === "assistant" &&
                          !message.streaming &&
                          message.tokens !== undefined ? (
                            <MessageFooter>
                              <TokenCount value={message.tokens} />
                            </MessageFooter>
                          ) : null}
                        </MessageBody>
                      </Message>
                    ))}

                    {waiting ? (
                      <Message from="assistant">
                        <MessageAvatar>AI</MessageAvatar>
                        <MessageBody from="assistant">
                          <ThinkingIndicator />
                        </MessageBody>
                      </Message>
                    ) : null}
                  </ConversationMessages>
                )}

                <ConversationScrollButton />
              </Conversation>

              {/* State, never content — the transcript stays navigable at the
                  reader's own pace. */}
              <ConversationStatus className="px-4 pb-1">
                {waiting ? "Waiting for a response" : busy ? "Generating response" : ""}
              </ConversationStatus>

              <div className="border-t border-border p-4">
                <PromptInput busy={busy} onSubmit={handleSubmit}>
                  <PromptInputTextarea
                    aria-label="Message"
                    placeholder={placeholder}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                    }}
                  />
                  <PromptInputToolbar>
                    {onAttach ? (
                      <Button type="button" variant="ghost" size="sm" onClick={onAttach}>
                        Attach
                      </Button>
                    ) : null}
                    <PromptInputSubmit onStop={onStop} />
                  </PromptInputToolbar>
                </PromptInput>
              </div>
            </div>

            {hasContext ? (
              /*
                A complementary landmark with a name, so it can be jumped to
                and skipped: it is beside the conversation, not part of it.
              */
              <aside
                aria-label="Context"
                className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-s border-border p-4 lg:flex"
              >
                <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Context
                </h2>

                {tokensUsed !== undefined && tokenLimit !== undefined ? (
                  <TokenUsage used={tokensUsed} limit={tokenLimit} />
                ) : null}

                {attachments.length > 0 || onAttach ? (
                  <section aria-labelledby="ai-workspace-attachments" className="grid gap-2">
                    <h3 id="ai-workspace-attachments" className="text-sm font-medium">
                      Attachments
                    </h3>
                    {attachments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nothing attached. The model sees only the conversation.
                      </p>
                    ) : (
                      <ul className="grid gap-1.5">
                        {attachments.map((attachment) => (
                          <li
                            key={attachment.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                          >
                            <span className="min-w-0">
                              {attachment.href ? (
                                <a
                                  href={attachment.href}
                                  className="block truncate rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/55"
                                >
                                  {attachment.name}
                                </a>
                              ) : (
                                <span className="block truncate">{attachment.name}</span>
                              )}
                              {attachment.detail ? (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {attachment.detail}
                                </span>
                              ) : null}
                            </span>
                            {onRemoveAttachment ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                // Named per file: three identical "Remove"
                                // buttons say nothing about which file goes.
                                aria-label={`Remove ${attachment.name}`}
                                onClick={() => {
                                  onRemoveAttachment(attachment);
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <path
                                    d="M6 6l12 12M18 6L6 18"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ) : null}

                {output ? (
                  <section aria-labelledby="ai-workspace-output" className="grid gap-2">
                    <h3 id="ai-workspace-output" className="text-sm font-medium">
                      {output.title ?? "Result"}
                    </h3>
                    <StructuredOutput
                      fields={output.fields}
                      value={output.value}
                      streaming={output.streaming}
                      errors={output.errors}
                    />
                  </section>
                ) : null}
              </aside>
            ) : null}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
