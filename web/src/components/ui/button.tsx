import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "warning";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantStyles: Record<string, string> = {
      default:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
      primary:
        "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-muted border border-border/40",
      outline:
        "border border-border bg-transparent hover:bg-muted/60 text-foreground",
      ghost: "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
      destructive:
        "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
      warning:
        "bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25",
    };

    const sizeStyles: Record<string, string> = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-11 rounded-xl px-8 text-base",
      icon: "size-8 p-1.5",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
