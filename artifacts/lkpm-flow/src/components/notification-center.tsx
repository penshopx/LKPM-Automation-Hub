import React from "react";
import { Link } from "wouter";
import {
  useListNotifications,
  getListNotificationsQueryKey,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AlertCircle, Clock, CheckCheck } from "lucide-react";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

export function NotificationCenter() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const queryKey = getListNotificationsQueryKey();

  const { data } = useListNotifications({
    query: {
      queryKey,
      // Segarkan berkala agar pengingat tenggat muncul tanpa memuat ulang.
      refetchInterval: 5 * 60 * 1000,
    },
  });

  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey });

  const handleMarkAll = () => {
    if (unread === 0) return;
    markAll.mutate(undefined, { onSuccess: invalidate });
  };

  const handleItemClick = (id: number, read: boolean) => {
    if (!read) markRead.mutate({ id }, { onSuccess: invalidate });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifikasi</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleMarkAll}
            disabled={unread === 0 || markAll.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tandai semua
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-muted-foreground">
            <Bell className="h-8 w-8 opacity-40" />
            <p className="text-sm">Belum ada notifikasi.</p>
            <p className="text-xs">
              Pengingat tenggat LKPM akan muncul di sini.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <ul className="divide-y">
              {items.map((n) => {
                const overdue = n.type === "deadline_overdue";
                const Icon = overdue ? AlertCircle : Clock;
                return (
                  <li key={n.id}>
                    <Link
                      href={n.reportId ? `/reports/${n.reportId}` : "/calendar"}
                      onClick={() => {
                        handleItemClick(n.id, n.read);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-muted ${
                        n.read ? "" : "bg-primary/5"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          overdue
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug text-foreground">
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {timeAgo(
                            typeof n.createdAt === "string"
                              ? n.createdAt
                              : new Date(n.createdAt).toISOString(),
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        <div className="border-t px-4 py-2 text-center">
          <Link
            href="/pengaturan"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Kelola preferensi notifikasi
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
