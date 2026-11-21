import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { api, ApiError, errorMessage } from '@/api/client';
import type { ChatMessage, ChatRole, PlanRequest, ToolCallSummary } from '@/api/types';

/** How much of the conversation goes to the server with each question. */
const HISTORY_LIMIT = 30;

export interface ConversationEntry {
  id: number;
  role: ChatRole;
  content: string;
  /** What the co-pilot checked to write this reply (assistant entries only). */
  toolCalls: ToolCallSummary[];
  /** True when this reply's suggested plan was applied to the planner. */
  appliedPlan: boolean;
}

interface UseCopilotOptions {
  /** The plan on screen, sent so the co-pilot knows what the hiker is looking at. */
  context: PlanRequest | undefined;
  onSuggestion: (request: PlanRequest) => void;
}

function toMessages(entries: readonly ConversationEntry[]): ChatMessage[] {
  return entries.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content }));
}

/** 503 from the backend itself means no OpenAI key is configured. */
function isNotConfigured(error: unknown): boolean {
  return error instanceof ApiError && error.fromBackend && error.status === 503;
}

function describeError(error: Error): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'This backend doesn’t have the co-pilot yet. Restart it to pick up the latest version.';
  }
  return errorMessage(error);
}

/** The conversation with the co-pilot and the request that answers the latest question. */
export function useCopilot({ context, onSuggestion }: UseCopilotOptions) {
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const nextId = useRef(0);
  const mutation = useMutation({ mutationFn: api.copilot, retry: false });

  const newId = () => {
    nextId.current += 1;
    return nextId.current;
  };

  const ask = (conversation: readonly ConversationEntry[]) => {
    mutation.mutate(
      { messages: toMessages(conversation), context: context ?? null },
      {
        onSuccess: (response) => {
          const suggestion = response.suggested_request;
          if (suggestion) onSuggestion(suggestion);
          setEntries((current) => [
            ...current,
            {
              id: newId(),
              role: 'assistant',
              content: response.reply,
              toolCalls: response.tool_calls,
              appliedPlan: suggestion !== null,
            },
          ]);
        },
      },
    );
  };

  const send = (text: string) => {
    const content = text.trim();
    if (content === '' || mutation.isPending) return;
    const conversation = [
      ...entries,
      { id: newId(), role: 'user' as const, content, toolCalls: [], appliedPlan: false },
    ];
    setEntries(conversation);
    ask(conversation);
  };

  /** Asks again after a failure; the last entry is still the unanswered question. */
  const retry = () => {
    if (!mutation.isPending && entries.length > 0) ask(entries);
  };

  const { error } = mutation;
  return {
    entries,
    send,
    retry,
    isPending: mutation.isPending,
    notConfigured: isNotConfigured(error),
    error: error && !isNotConfigured(error) ? describeError(error) : null,
  };
}

export type Copilot = ReturnType<typeof useCopilot>;
