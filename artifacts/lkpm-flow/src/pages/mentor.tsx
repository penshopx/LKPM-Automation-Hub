import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useDeleteAnthropicConversation,
  getAnthropicConversation,
  getSendAnthropicMessageUrl,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Plus, Trash2, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Mentor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: conversations, refetch: refetchConversations } =
    useListAnthropicConversations();
  const createConversation = useCreateAnthropicConversation();
  const deleteConversation = useDeleteAnthropicConversation();

  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const loadConversation = React.useCallback(
    async (id: number) => {
      setActiveId(id);
      try {
        const conv = await getAnthropicConversation(id);
        setMessages(
          conv.messages.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        );
      } catch {
        toast({
          title: "Gagal memuat sesi",
          description: "Coba pilih sesi kembali.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const onNewConversation = () => {
    const title = `Sesi ${new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    createConversation.mutate(
      { data: { title } },
      {
        onSuccess: (conv) => {
          refetchConversations();
          setActiveId(conv.id);
          setMessages([]);
        },
      },
    );
  };

  const onDelete = (id: number) => {
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          refetchConversations();
          if (activeId === id) {
            setActiveId(null);
            setMessages([]);
          }
        },
      },
    );
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    let conversationId = activeId;
    if (conversationId === null) {
      try {
        const conv = await createConversation.mutateAsync({
          data: {
            title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
          },
        });
        conversationId = conv.id;
        setActiveId(conv.id);
        refetchConversations();
      } catch {
        toast({
          title: "Gagal memulai sesi",
          description: "Coba lagi sebentar.",
          variant: "destructive",
        });
        return;
      }
    }

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);

    try {
      const res = await fetch(getSendAnthropicMessageUrl(conversationId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok || !res.body) throw new Error("stream error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          let payload: { content?: string; error?: string; done?: boolean };
          try {
            payload = JSON.parse(trimmed.slice(5).trim());
          } catch {
            continue;
          }
          if (payload.content) {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: next[next.length - 1].content + payload.content,
              };
              return next;
            });
          } else if (payload.error) {
            throw new Error(payload.error);
          }
        }
      }
      queryClient.invalidateQueries();
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === "assistant") next.pop();
        return next;
      });
      toast({
        title: "Gagal menghasilkan jawaban",
        description: "Periksa koneksi atau kuota layanan AI Anda, lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Mentor LKPM
        </h1>
        <p className="text-muted-foreground">
          Belajar LKPM lewat dialog Socrates. Mentor memandu Anda dengan
          pertanyaan, bukan sekadar memberi jawaban.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        <Card className="h-fit">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sesi</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={onNewConversation}
              disabled={createConversation.isPending}
            >
              <Plus className="h-4 w-4" />
              Baru
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {(conversations ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada sesi.</p>
            )}
            {(conversations ?? []).map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer ${
                  activeId === c.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => loadConversation(c.id)}
              >
                <span className="truncate">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Hapus sesi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[calc(100vh-16rem)]">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground h-full flex items-center justify-center text-center px-6">
                Mulai dengan pertanyaan seperti: "Apa saja yang wajib dilaporkan
                dalam LKPM?" atau "Kapan tenggat pelaporan saya?"
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
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
          </CardContent>
          <div className="border-t p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tulis pertanyaan Anda..."
              rows={1}
              className="resize-none"
            />
            <Button onClick={sendMessage} disabled={streaming || !input.trim()}>
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
