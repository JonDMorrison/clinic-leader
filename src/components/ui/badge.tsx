import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        // Custom variants with improved contrast
        success: "bg-success/25 text-success border border-success/40 shadow-sm",
        warning: "bg-warning/25 text-warning border border-warning/40 shadow-sm",
        danger: "bg-danger/25 text-danger border border-danger/40 shadow-sm",
        muted: "bg-muted/60 text-muted-foreground border border-border/50",
        brand: "bg-brand/20 text-brand border border-brand/40 shadow-sm",
        accent: "bg-accent/20 text-accent-foreground border border-accent/40 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
