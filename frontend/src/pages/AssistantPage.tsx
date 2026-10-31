import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import type { ChatMessage, ChatResponse } from "../types";

const CONVERSATION_KEY = "assistant_conversation_id";
const MODE_KEY = "assistant_last_mode";

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(() =>
    localStorage.getItem(CONVERSATION_KEY)
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [lastMode, setLastMode] = useState<ChatResponse["mode"] | null>(() => {
    const mode = localStorage.getItem(MODE_KEY);
    return mode === "ai" || mode === "mock" ? mode : null;
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: ["chat", conversationId],
    queryFn: () => api<ChatMessage[]>(`/chat/${conversationId}`),
    enabled: Boolean(conversationId),
  });

  const visibleMessages = history.data ?? messages;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, history.isFetching]);

  const send = useMutation({
    mutationFn: (content: string) =>
      api<ChatResponse>("/chat", {
        method: "POST",
        body: { message: content, ...(conversationId ? { conversationId } : {}) },
      }),
    onSuccess: (result, content) => {
      setConversationId(result.conversationId);
      localStorage.setItem(CONVERSATION_KEY, result.conversationId);
      localStorage.setItem(MODE_KEY, result.mode);
      setLastMode(result.mode);
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
        result.reply,
      ]);
      queryClient.setQueryData<ChatMessage[]>(["chat", result.conversationId], (current) => [
        ...(current ?? []),
        {
          id: `local-${Date.now()}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
        result.reply,
      ]);
    },
  });

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    setLastMode(null);
    localStorage.removeItem(CONVERSATION_KEY);
    localStorage.removeItem(MODE_KEY);
    queryClient.removeQueries({ queryKey: ["chat"] });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || send.isPending) return;
    setMessage("");
    send.mutate(trimmed);
  };

  const error = send.error ?? history.error;
  const errorMessage = error instanceof ApiError ? error.message : error?.message;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assistant</h1>
          <p className="text-sm text-slate-500">Ask about customers, shipments, and dashboard totals.</p>
        </div>
        <div className="flex items-center gap-2">
          {lastMode === "mock" && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Demo mode
            </span>
          )}
          <button
            type="button"
            onClick={newChat}
            className="rounded border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            New chat
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl bg-white p-4 shadow-sm sm:p-6">
        {visibleMessages.length === 0 && !history.isFetching && (
          <p className="py-12 text-center text-sm text-slate-500">
            Start a conversation about your logistics platform.
          </p>
        )}
        {visibleMessages.map((item) => (
          <div key={item.id} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              data-testid={`chat-message-${item.role}`}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm sm:max-w-[70%] ${
                item.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {item.content}
            </div>
          </div>
        ))}
        {send.isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
              Assistant is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 rounded-xl bg-white p-3 shadow-sm">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about shipments..."
          rows={2}
          className="min-h-12 flex-1 resize-y rounded border px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!message.trim() || send.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
