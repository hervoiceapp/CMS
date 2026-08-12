"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatSession } from "firebase/ai";
import { buildChatModel, toChatParams } from "@/lib/ai";
import type { AiCopilotConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { Robot01Icon, RefreshIcon, ArrowUp01Icon } from "@hugeicons/core-free-icons";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function CopilotChatPlayground({ config }: { config: AiCopilotConfig }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionRef = useRef<ChatSession | null>(null);
  const keyRef = useRef<string>("");
  const messagesRef = useRef<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const resetChat = () => {
    setMessages([]);
    sessionRef.current = null;
    keyRef.current = "";
  };

  const patchMessage = (id: string, content: string) => {
    const next = messagesRef.current.map((m) =>
      m.id === id ? { ...m, content, streaming: true } : m,
    );
    messagesRef.current = next;
    setMessages(next);
  };

  const finishMessage = (id: string, content: string, errored: boolean) => {
    const next = messagesRef.current.map((m) =>
      m.id === id ? { ...m, content, streaming: false } : m,
    );
    messagesRef.current = next;
    setMessages(next);
    if (errored) {
      toast.add({
        title: "The model couldn't reply. Check provisioning/auth and retry.",
        type: "error",
      });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    const key = JSON.stringify(toChatParams(config));

    if (keyRef.current !== key || !sessionRef.current) {
      try {
        const session = buildChatModel(toChatParams(config)).startChat();
        for (const m of messagesRef.current) {
          if (m.role === "user") await session.sendMessage(m.content);
        }
        sessionRef.current = session;
        keyRef.current = key;
      } catch (err) {
        console.error(err);
        setSending(false);
        toast.add({
          title:
            "AI service is not available. Run `npx firebase-tools init ailogic` in the project to enable it.",
          type: "error",
        });
        return;
      }
    }

    const session = sessionRef.current;
    const uid = `u-${Date.now()}`;
    const aid = `a-${Date.now()}`;
    messagesRef.current = [
      ...messagesRef.current,
      { id: uid, role: "user", content: text },
      { id: aid, role: "assistant", content: "", streaming: true },
    ];
    setMessages(messagesRef.current);

    try {
      const result = await session!.sendMessageStream(text);
      let acc = "";
      for await (const chunk of result.stream) {
        const delta = chunk.text;
        if (delta) {
          acc += delta;
          patchMessage(aid, acc);
        }
      }
      finishMessage(aid, acc, false);
    } catch (err) {
      console.error(err);
      finishMessage(aid, "Something went wrong. Please try again.", true);
    } finally {
      setSending(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <HugeiconsIcon icon={Robot01Icon} className="size-4 text-primary" />
          Test Playground
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={resetChat} disabled={sending || empty}>
          <HugeiconsIcon icon={RefreshIcon} />
          Reset conversation
        </Button>
      </CardHeader>
      <CardContent className="flex min-h-[24rem] flex-1 flex-col gap-4">
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {empty && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <HugeiconsIcon icon={Robot01Icon} className="size-8" />
              <p className="max-w-xs text-sm">
                Type a message to test the chatbot with the current configuration. This uses your
                unsaved edits as you tune them.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted",
              )}
            >
              {m.content || <span className="opacity-70">…</span>}
              {m.streaming && <span className="animate-pulse"> ▌</span>}
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Ask the companion something…"
            disabled={sending}
          />
          <Button onClick={send} disabled={sending || !input.trim()} aria-label="Send message">
            {sending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <HugeiconsIcon icon={ArrowUp01Icon} />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
