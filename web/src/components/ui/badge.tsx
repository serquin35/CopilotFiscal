import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "warning"
  | "destructive"
  | "muted"
  | "success";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-muted text-muted-foreground border-border/40",
    primary: "bg-primary/15 text-primary border-primary/20",
    warning: "bg-warning/15 text-warning border-warning/20",
    destructive: "bg-destructive/15 text-destructive border-destructive/20",
    muted: "bg-muted/80 text-muted-foreground border-border/40",
    success: "bg-primary/15 text-primary border-primary/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "REVIEWED":
    case "APPROVED":
    case "CONFIRMED":
      return <Badge variant="success">Aprobada</Badge>;
    case "PENDING_REVIEW":
    case "PENDING":
      return <Badge variant="warning">Pendiente revisión</Badge>;
    case "EXTRACTING":
      return <Badge variant="muted">Extrayendo datos...</Badge>;
    case "EXTRACTED":
      return <Badge variant="primary">Extraído por IA</Badge>;
    case "UPLOADED":
      return <Badge variant="muted">Subido</Badge>;
    case "DUPLICATE":
      return <Badge variant="destructive">Duplicada</Badge>;
    case "INVALID_IVA":
      return <Badge variant="destructive">IVA incorrecto</Badge>;
    case "MISSING_NIF":
      return <Badge variant="warning">Sin NIF</Badge>;
    case "REJECTED":
      return <Badge variant="destructive">Rechazada</Badge>;
    case "DRAFT":
      return <Badge variant="warning">Borrador</Badge>;
    default:
      return <Badge variant="muted">{status}</Badge>;
  }
}
