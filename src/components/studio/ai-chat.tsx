"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAiEdit } from "@/hooks/use-queries";
import { useEditorStore } from "@/stores/editor";
import type { TimelineDoc } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Make the intro stronger",
  "Add suspense",
  "Use a female narrator",
  "Shorten to 20 seconds",
];

/** AI Chat Panel — natural-language edits applied directly to the project. */
export function AiChatPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const aiEdit = useAiEdit(projectId);
  const { setDoc } = useEditorStore();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || aiEdit.isPending) return;
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: "user", text: trimmed }]);
    setInput("");
    aiEdit.mutate(trimmed, {
      onSuccess: (data) => {
        setMessages((m) => [
          ...m,
          {
            id: `a_${Date.now()}`,
            role: "assistant",
            text:
              data.summary +
              (data.regenerated.length > 0
                ? ` Scene${data.regenerated.length > 1 ? "s" : ""} ${data.regenerated
                    .map((i) => i + 1)
                    .join(", ")} regenerating in the background.`
                : ""),
          },
        ]);
        // The server already persisted the new timeline — sync the editor.
        setDoc(data.timeline as TimelineDoc, { dirty: false });
        qc.invalidateQueries({ queryKey: ["project-bundle", projectId] });
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
        );
      },
      onError: (err) => {
        setMessages((m) => [
          ...m,
          { id: `e_${Date.now()}`, role: "assistant", text: `I couldn't apply that: ${err.message}` },
        ]);
      },
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="pt-2 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/12">
              <Sparkles className="size-5 text-primary" />
            </div>
            <p className="mt-3 text-[13px] font-medium">Direct the edit in plain English</p>
            <p className="mx-auto mt-1 max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
              The AI editor changes the timeline directly — pacing, voice, music, captions, even
              regenerating scenes.
            </p>
            <div className="mt-4 flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  “{s}”
                </button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                  m.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-card",
                )}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {aiEdit.isPending && (
          <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            Editing the timeline…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-background/60 p-1.5 focus-within:border-ring/60">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Tell the editor what to change…"
            rows={1}
            className="max-h-24 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="submit"
            disabled={!input.trim() || aiEdit.isPending}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
