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
  LogOut,
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
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Documentos", href: "/documents", icon: FileText },
  { label: "Gastos", href: "/expenses", icon: Receipt },
  { label: "Anomalías", href: "/alerts", icon: AlertTriangle, alert: true },
  { label: "Copiloto IA", href: "/copilot", icon: BotMessageSquare },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, business, signOut } = useAuth();
  const [docCount, setDocCount] = useState<number | null>(null);
  const [alertCount, setAlertCount] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const updateCounts = () => {
      try {
        const customAlerts = localStorage.getItem("copiloto_fiscal_active_alerts_count");
        if (customAlerts !== null) {
          setAlertCount(Number(customAlerts));
        }

        const saved = localStorage.getItem("copiloto_fiscal_documents_v1");
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
      } catch {}
    };

    updateCounts();
    window.addEventListener("storage", updateCounts);
    window.addEventListener("fiscal_docs_updated", updateCounts);
    return () => {
      window.removeEventListener("storage", updateCounts);
      window.removeEventListener("fiscal_docs_updated", updateCounts);
    };
  }, []);

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

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Usuario";
  const businessName = business?.name || "Mi Negocio";
  const initials = displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary group-hover:bg-primary/20 transition-all">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-foreground text-sm flex items-center gap-1.5">
                Copiloto Fiscal
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-primary/15 text-primary font-medium">
                  4T 2026
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {businessName} · Control AEAT &amp; Modelo 303
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-card border border-border/80 p-1">
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
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all relative",
                  isActive
                    ? "bg-secondary text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("size-3.5", isActive ? "text-primary" : "")} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "size-4 rounded-full flex items-center justify-center text-[10px] font-mono",
                      item.alert
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-warning/20 text-warning border border-warning/30"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: sandbox status + user avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center rounded-lg bg-card border border-border px-2.5 py-1 text-xs text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-primary mr-2 animate-pulse" />
            <span>Sandbox AEAT: <strong className="text-foreground font-mono">Activo</strong></span>
          </div>
          <Link
            href="/documents"
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
          >
            <span>+ Subir Factura</span>
          </Link>
          {/* User avatar + logout */}
          {user && (
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Cerrar sesión"
                className="size-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-all disabled:opacity-50"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden overflow-x-auto border-t border-border/40 px-3 py-2 gap-1 bg-card/60">
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
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs whitespace-nowrap",
                isActive
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="size-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
