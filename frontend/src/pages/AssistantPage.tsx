import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import type { ChatMessage, ChatResponse } from "../types";
import Icon from "../components/Icon";

const CONVERSATION_KEY = "assistant_conversation_id";
const MODE_KEY = "assistant_last_mode";

function localId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function AssistantPage() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(CONVERSATION_KEY));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [lastMode, setLastMode] = useState<ChatResponse["mode"] | null>(() => { const mode = localStorage.getItem(MODE_KEY); return mode === "ai" || mode === "mock" ? mode : null; });
  const bottomRef = useRef<HTMLDivElement>(null);
  const history = useQuery({ queryKey: ["chat", conversationId], queryFn: () => api<ChatMessage[]>(`/chat/${conversationId}`), enabled: Boolean(conversationId) });
  const visibleMessages = history.data ?? messages;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages, history.isFetching]);

  const send = useMutation({
    mutationFn: (content: string) => api<ChatResponse>("/chat", { method: "POST", body: { message: content, ...(conversationId ? { conversationId } : {}) } }),
    onSuccess: (result, content) => {
      const userMessage: ChatMessage = { id: localId("user"), role: "user", content, createdAt: new Date().toISOString() };
      const reply: ChatMessage = { ...result.reply, id: result.reply.id || localId("assistant") };
      setConversationId(result.conversationId);
      localStorage.setItem(CONVERSATION_KEY, result.conversationId);
      localStorage.setItem(MODE_KEY, result.mode);
      setLastMode(result.mode);
      setMessages((current) => [...current, userMessage, reply]);
      queryClient.setQueryData<ChatMessage[]>(["chat", result.conversationId], (current) => [...(current ?? []), userMessage, reply]);
    },
  });

  const newChat = () => { setConversationId(null); setMessages([]); setLastMode(null); localStorage.removeItem(CONVERSATION_KEY); localStorage.removeItem(MODE_KEY); queryClient.removeQueries({ queryKey: ["chat"] }); };
  const submit = (event: FormEvent) => { event.preventDefault(); const trimmed = message.trim(); if (!trimmed || send.isPending) return; setMessage(""); send.mutate(trimmed); };
  const error = send.error ?? history.error;
  const errorMessage = error instanceof ApiError ? error.message : error?.message;

  return <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-5xl flex-col gap-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-blue-600">Operations copilot</p><h1 className="page-heading text-3xl font-extrabold text-slate-900">Assistant</h1><p className="mt-2 text-sm text-slate-500">Ask about customers, shipments, and dashboard totals.</p></div><div className="flex items-center gap-2">{lastMode === "mock" && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Demo mode</span>}<button type="button" onClick={newChat} className="btn-secondary"><Icon name="plus" size={16} /> New chat</button></div></div>
    <div className="surface flex min-h-[430px] flex-1 flex-col overflow-hidden"><div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"><Icon name="assistant" size={18} /></div><div><p className="text-sm font-extrabold text-slate-900">Shipflow assistant</p><p className="text-xs text-slate-500">Ready to help with your operations</p></div><span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online</span></div><div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">{visibleMessages.length === 0 && !history.isFetching && <div className="flex min-h-[280px] flex-col items-center justify-center text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Icon name="assistant" size={26} /></div><p className="font-bold text-slate-800">Start a conversation</p><p className="mt-1 max-w-sm text-sm text-slate-500">Start a conversation about your logistics platform.</p><p className="mt-1 max-w-sm text-xs text-slate-400">Ask about shipment status, customer totals, or your current logistics network.</p></div>}{visibleMessages.map((item, index) => <div key={item.id || `${item.role}-${item.createdAt}-${index}`} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%] ${item.role === "user" ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border border-slate-100 bg-slate-50 text-slate-800"}`} data-testid={`chat-message-${item.role}`}><p className="mb-1 text-[10px] font-bold uppercase tracking-[.1em] opacity-60">{item.role === "user" ? "You" : "Assistant"}</p><div className="whitespace-pre-wrap">{item.content}</div></div></div>)}{send.isPending && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">Assistant is typing...</div></div>}<div ref={bottomRef} /></div></div>
    {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{errorMessage}</div>}
    <form onSubmit={submit} className="surface flex items-end gap-2 p-3 sm:p-4"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask about shipments..." rows={2} className="input-field min-h-12 flex-1 resize-y border-0 bg-transparent shadow-none focus:ring-0" /><button type="submit" disabled={!message.trim() || send.isPending} aria-label="Send message" className="btn-primary min-h-11 px-4">{send.isPending ? "Sending..." : <><span className="hidden sm:inline">Send</span><Icon name="send" size={17} /></>}</button></form>
  </div>;
}
