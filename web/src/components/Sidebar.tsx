"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  AlertTriangle,
  BotMessageSquare,
  ShieldCheck,
  PlusCircle,
  Menu,
  X,
  FileCheck2,
  LogOut,
  Building2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  alert?: boolean;
}

const BASE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard (303)", href: "/", icon: LayoutDashboard },
  { label: "Documentos", href: "/documents", icon: FileText },
  { label: "Gastos & Deducción", href: "/expenses", icon: Receipt },
  { label: "Anomalías AEAT", href: "/alerts", icon: AlertTriangle, alert: true },
  { label: "Copiloto IA", href: "/copilot", icon: BotMessageSquare },
  { label: "Configuración", href: "/settings", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, business, signOut } = useAuth();
  const businessId = business?.id ?? null;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const updateCounts = () => {
      try {
        // Use business-scoped key to match multi-tenant pattern in documents/page.tsx
        const docsKey = businessId
          ? `copiloto_fiscal_documents_${businessId}`
          : null;
        const alertsKey = businessId
          ? `copiloto_fiscal_active_alerts_count_${businessId}`
          : "copiloto_fiscal_active_alerts_count";

        const customAlerts = localStorage.getItem(alertsKey);
        if (customAlerts !== null) {
          setAlertCount(Number(customAlerts));
        }

        if (docsKey) {
          const saved = localStorage.getItem(docsKey);
          if (saved) {
            const list = JSON.parse(saved) as Record<string, unknown>[];
            if (Array.isArray(list)) {
              const realList = list.filter((d) => typeof d.id === "string" && !d.id.startsWith("doc-"));
              setDocCount(realList.length);
              if (customAlerts === null) {
                const anoms = realList.flatMap((d) => (Array.isArray(d.anomalies) ? (d.anomalies as Record<string, unknown>[]) : [])).filter((a) => !a.resolved);
                setAlertCount(anoms.length);
              }
              return;
            }
          }
        }

        // No docs found for this business → reset counts
        setDocCount(0);
        if (customAlerts === null) setAlertCount(0);
      } catch {}
    };

    updateCounts();
    window.addEventListener("storage", updateCounts);
    window.addEventListener("fiscal_docs_updated", updateCounts);
    return () => {
      window.removeEventListener("storage", updateCounts);
      window.removeEventListener("fiscal_docs_updated", updateCounts);
    };
  }, [businessId]);

  const navItems = BASE_NAV_ITEMS.map((item) => {
    if (item.href === "/documents") {
      return { ...item, badge: docCount !== null && docCount > 0 ? String(docCount) : undefined };
    }
    if (item.href === "/alerts") {
      return { ...item, badge: alertCount !== null && alertCount > 0 ? String(alertCount) : undefined };
    }
    return item;
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push("/login");
  };

  // Display info — prefer profile/business data, fallback to demo labels
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Usuario";
  const businessName = business?.name || "Mi Negocio";
  const isDemo = business?.is_demo ?? false;
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden flex h-14 w-full items-center justify-between border-b border-border bg-sidebar px-4 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/25 text-primary">
            <ShieldCheck className="size-4" />
          </div>
          <span className="font-semibold text-sm text-foreground">Copiloto Fiscal</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="size-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col justify-between border-r border-border bg-sidebar transition-transform duration-200 md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col gap-6 p-4">
          {/* Logo / Brand Header */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 p-1 group"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary group-hover:bg-primary/20 transition-all">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-foreground text-sm flex items-center gap-1.5">
                Copiloto Fiscal
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span className="font-medium text-foreground/90 truncate max-w-[110px]" title={businessName}>
                  {businessName}
                </span>
                <span className="size-1 rounded-full bg-border" />
                <span className="text-primary font-mono text-[10px]">4T 2026</span>
                {isDemo && (
                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-semibold">
                    DEMO
                  </span>
                )}
              </span>
            </div>
          </Link>

          {/* Quick Action Button */}
          <Link
            href="/documents"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
          >
            <PlusCircle className="size-4" />
            <span>Subir Factura / Ticket</span>
          </Link>

          {/* Nav List */}
          <nav className="flex flex-col gap-1">
            <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
              Navegación
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all",
                    isActive
                      ? "bg-secondary text-foreground font-semibold shadow-xs border border-border/40"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "size-4 rounded-full flex items-center justify-center text-[10px] font-mono",
                        item.alert
                          ? "bg-destructive/20 text-destructive border border-destructive/30 font-semibold"
                          : "bg-warning/20 text-warning border border-warning/30 font-semibold"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer: user card + logout */}
        <div className="p-4 border-t border-border flex flex-col gap-3">
          {/* AEAT Sandbox status */}
          <div className="rounded-xl border border-border/60 bg-card p-3 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground font-medium">Entorno AEAT</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-semibold">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                SANDBOX
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Validación legal automática sin impacto en censo real.
            </p>
          </div>

          {/* User card */}
          {user && (
            <div className="rounded-xl border border-border/60 bg-card/50 p-3">
              <div className="flex items-center gap-2.5 mb-2">
                {/* Avatar */}
                <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2.5">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{businessName}</span>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-transparent hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground py-1.5 text-[11px] font-medium transition-all duration-200 disabled:opacity-50"
              >
                <LogOut className="size-3" />
                {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileCheck2 className="size-3 text-primary" />
              <span>v1.0 Next.js 14</span>
            </span>
            <span className="font-mono text-[10px]">Contabo + Dokploy</span>
          </div>
        </div>
      </aside>
    </>
  );
}
