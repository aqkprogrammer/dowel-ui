"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import {
  Conversation,
  ConversationMessages,
  ConversationScrollButton,
  ConversationStatus,
} from "@/components/ai-conversation";
import {
  Message,
  MessageActions,
  MessageAvatar,
  MessageBody,
  MessageFooter,
} from "@/components/ai-message";
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
import { TokenCount } from "@/components/ai-token-usage";
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
import { cn } from "@/lib/utils";

/**
 * A complete chat surface.
 *
 * Assembled from the AI components rather than reimplementing any of them, so
 * every decision they encode still holds here: the transcript is a list and not
 * a live region, state is announced separately, and the composer will not send
 * mid-IME-composition.
 */

export interface ChatToolCall {
  id: string;
  name: string;
  status: ToolStatus;
  arguments?: string;
  result?: string;
}

export interface ChatSource {
  index: number;
  title: string;
  origin?: string;
  href?: string;
}

export interface ChatMessage {
  id: string;
  from: "user" | "assistant";
  content: string;
  reasoning?: string;
  tools?: ChatToolCall[];
  sources?: ChatSource[];
  tokens?: number;
  /** Still arriving: shows the caret. */
  streaming?: boolean;
}

export interface AiChatBlockProps {
  messages: ChatMessage[];
  onSend?: (message: string) => void;
  onStop?: () => void;
  /** A response is in flight. */
  busy?: boolean;
  /** Shown before the first token arrives. */
  waiting?: boolean;
  models?: ModelOption[];
  model?: string;
  onModelChange?: (model: string) => void;
  /** Shown when the transcript is empty. */
  empty?: ReactNode;
  placeholder?: string;
  className?: string;
}

export function AiChatBlock({
  messages,
  onSend,
  onStop,
  busy = false,
  waiting = false,
  models,
  model,
  onModelChange,
  empty,
  placeholder = "Ask anything…",
  className,
}: AiChatBlockProps) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend?.(trimmed);
    setDraft("");
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <Conversation>
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center p-8">
            {empty ?? (
              <EmptyState>
                <EmptyStateTitle>Start a conversation</EmptyStateTitle>
                <EmptyStateDescription>
                  Ask a question, paste an error, or describe what you are trying to build.
                </EmptyStateDescription>
              </EmptyState>
            )}
          </div>
        ) : (
          <ConversationMessages>
            {messages.map((message) => (
              <Message key={message.id} from={message.from}>
                {message.from === "assistant" ? <MessageAvatar>AI</MessageAvatar> : null}
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

                  {message.from === "assistant" && !message.streaming ? (
                    <>
                      <MessageActions>
                        <Button variant="ghost" size="icon-sm" aria-label="Copy response">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <rect
                              x="9"
                              y="9"
                              width="12"
                              height="12"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Regenerate response">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Button>
                      </MessageActions>
                      {message.tokens === undefined ? null : (
                        <MessageFooter>
                          <TokenCount value={message.tokens} />
                        </MessageFooter>
                      )}
                    </>
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

      {/* State, never content — the transcript above stays navigable at the
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
            {models && models.length > 0 ? (
              <ModelSelector
                aria-label="Model"
                models={models}
                value={model}
                onValueChange={onModelChange}
                triggerSize="sm"
              />
            ) : null}
            <PromptInputSubmit onStop={onStop} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
