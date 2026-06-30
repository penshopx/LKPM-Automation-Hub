import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { getHelpdeskChatUrl } from "@workspace/api-client-react";

type Role = "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  "Apa itu LKPM dan siapa yang wajib melapor?",
  "Kapan tenggat pelaporan LKPM?",
  "Apa beda NIB, OSS, dan KBLI?",
  "Bagaimana cara membuat laporan di aplikasi ini?",
];

const GREETING =
  "Halo, saya Helpdesk LKPM-Flow. Tanyakan cara memakai aplikasi ini atau hal seputar LKPM, OSS, NIB, dan KBLI.";

// Lets other parts of the app (mis. halaman Konsultan Online) membuka chat ini.
export const OPEN_HELPDESK_EVENT = "lkpm:open-helpdesk";
export function openHelpdesk() {
  window.dispatchEvent(new Event(OPEN_HELPDESK_EVENT));
}

export function HelpdeskWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_HELPDESK_EVENT, handler);
    return () => window.removeEventListener(OPEN_HELPDESK_EVENT, handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(getHelpdeskChatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("stream error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data:")) continue;
          let payload: { content?: string; done?: boolean; error?: string };
          try {
            payload = JSON.parse(trimmedLine.slice(5).trim());
          } catch {
            continue;
          }
          if (payload.error) throw new Error(payload.error);
          if (payload.content) {
            answer += payload.content;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: "assistant", content: answer };
              return next;
            });
          }
        }
      }

      if (!answer) {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content:
              "Maaf, jawaban tidak dapat dihasilkan. Silakan coba lagi.",
          };
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content:
            "Maaf, terjadi gangguan saat menjawab. Periksa koneksi atau kuota layanan AI, lalu coba lagi.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="print:hidden">
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[32rem] max-h-[calc(100dvh-7rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div className="leading-tight">
                <p className="text-sm font-semibold">Helpdesk LKPM-Flow</p>
                <p className="text-[11px] opacity-80">
                  Bantuan aplikasi & LKPM/OSS/NIB/KBLI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup helpdesk"
              className="rounded-md p-1 transition-colors hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              {GREETING}
            </div>

            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">Contoh pertanyaan:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content ||
                    (streaming && i === messages.length - 1 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      ""
                    ))}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan Anda..."
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="Kirim"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup helpdesk" : "Buka helpdesk"}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
