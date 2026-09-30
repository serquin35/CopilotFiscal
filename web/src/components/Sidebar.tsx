"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard (303)", href: "/", icon: LayoutDashboard },
  { label: "Documentos", href: "/documents", icon: FileText, badge: "3" },
  { label: "Gastos & Deducción", href: "/expenses", icon: Receipt },
  { label: "Anomalías AEAT", href: "/alerts", icon: AlertTriangle, badge: "2", alert: true },
  { label: "Copiloto IA", href: "/copilot", icon: BotMessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

      {/* Main Sidebar Desktop + Drawer Mobile */}
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
                <span>Modelo 303</span>
                <span className="size-1 rounded-full bg-border" />
                <span className="text-primary font-mono text-[10px]">3T 2026</span>
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
            {NAV_ITEMS.map((item) => {
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

        {/* Footer info & Sandbox status */}
        <div className="p-4 border-t border-border flex flex-col gap-3">
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
