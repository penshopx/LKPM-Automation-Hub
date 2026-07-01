import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, FileText, Calendar as CalendarIcon, ShieldAlert, ClipboardList, FileSpreadsheet, BookOpen, MessageSquareText, Printer, Workflow, Map, Database, BookMarked, Clapperboard, Scale, Sparkles, GraduationCap, Headset, CreditCard, LogOut, ChevronDown } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import { useRole } from "@/lib/role";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ConsultantFooter() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Konsultan";
  const email = user?.primaryEmailAddress?.emailAddress;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="border-t p-3 print:hidden">
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          {email && email !== displayName && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut({ redirectUrl: basePath || "/" })}
        className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </div>
  );
}

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const role = useRole();

  const navGroups: NavGroup[] = [
    {
      label: "Utama",
      items: [
        { href: "/", label: "Dasbor", icon: LayoutDashboard },
        {
          href: "/companies",
          label: role === "perusahaan" ? "Perusahaan Saya" : "Perusahaan",
          icon: Building2,
        },
        { href: "/reports", label: "Laporan LKPM", icon: FileText },
        { href: "/calendar", label: "Kalender", icon: CalendarIcon },
        { href: "/data-quality", label: "Kualitas Data", icon: ShieldAlert },
      ],
    },
    {
      label: "Dokumen & Asisten",
      items: [
        { href: "/asisten", label: "Asisten Penyusun", icon: Sparkles },
        { href: "/template-intake", label: "Template Intake", icon: ClipboardList },
        { href: "/narrative-templates", label: "Template Narasi", icon: MessageSquareText },
        { href: "/print-checklist", label: "Checklist Cetak", icon: Printer },
        { href: "/index-map", label: "Peta Dokumen", icon: Map },
      ],
    },
    {
      label: "Bantuan & Edukasi",
      items: [
        { href: "/konsultan-online", label: "Konsultan Online", icon: Headset },
        { href: "/mentor", label: "Mentor LKPM", icon: GraduationCap },
        { href: "/oss-field-guide", label: "Panduan Field OSS", icon: FileSpreadsheet },
        { href: "/glossary-faq", label: "Glosarium & FAQ", icon: BookOpen },
        { href: "/regulation", label: "Regulasi & Sanksi", icon: Scale },
        { href: "/case-studies", label: "Studi Kasus", icon: Clapperboard },
      ],
    },
    {
      label: "Referensi & Operasional",
      items: [
        { href: "/sop-data", label: "SOP Data", icon: Database },
        { href: "/agent-playbook", label: "Playbook Agen", icon: BookMarked },
        { href: "/blueprint", label: "Blueprint & Arsitektur", icon: Workflow },
      ],
    },
    {
      label: "Akun",
      items: [
        { href: "/langganan", label: "Langganan & Kredit", icon: CreditCard },
      ],
    },
  ];

  const isItemActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const activeGroupLabel = navGroups.find((g) => g.items.some((i) => isItemActive(i.href)))?.label;

  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of navGroups) {
      initial[g.label] = g.label === "Utama" || g.label === activeGroupLabel;
    }
    return initial;
  });

  React.useEffect(() => {
    if (activeGroupLabel) {
      setOpenGroups((prev) => (prev[activeGroupLabel] ? prev : { ...prev, [activeGroupLabel]: true }));
    }
  }, [activeGroupLabel]);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 border-r bg-card flex flex-col hidden md:flex print:hidden">
        <div className="p-4 border-b h-14 flex items-center">
          <h1 className="font-semibold text-lg flex items-center gap-2 text-primary">
            <ShieldAlert className="h-5 w-5" />
            LKPM-Flow
          </h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navGroups.map((group) => {
            const isOpen = openGroups[group.label] ?? false;
            return (
              <div key={group.label} className="pb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-expanded={isOpen}
                >
                  {group.label}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => {
                      const isActive = isItemActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <ConsultantFooter />
      </aside>
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-4 md:hidden print:hidden">
          <h1 className="font-semibold text-lg flex items-center gap-2 text-primary">
            <ShieldAlert className="h-5 w-5" />
            LKPM-Flow
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
