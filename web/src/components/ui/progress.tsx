import React from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  indicatorClassName?: string;
}

export function ProgressBar({
  value,
  className,
  indicatorClassName,
  ...props
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-all duration-500 ease-out",
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface VatSegmentedBarProps extends React.HTMLAttributes<HTMLDivElement> {
  deductiblePercentage: number; // % que representa el IVA soportado respecto al total
  className?: string;
}

export function VatSegmentedBar({
  deductiblePercentage,
  className,
  ...props
}: VatSegmentedBarProps) {
  const deductibleClamped = Math.min(100, Math.max(0, deductiblePercentage));

  return (
    <div
      className={cn("flex h-3 w-full overflow-hidden rounded-full bg-muted p-0.5 gap-0.5", className)}
      {...props}
    >
      <div
        className="h-full rounded-l-full bg-primary transition-all duration-500"
        style={{ width: `${deductibleClamped}%` }}
        title={`IVA Soportado: ${deductibleClamped.toFixed(1)}%`}
      />
      <div
        className="h-full flex-1 rounded-r-full bg-warning transition-all duration-500"
        title="IVA a Ingresar a Hacienda"
      />
    </div>
  );
}
