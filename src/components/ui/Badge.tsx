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
        outline: "text-foreground",
        // Custom variants for the design system
        success: "bg-gradient-to-r from-success/20 to-success/10 text-success border border-success/30 shadow-sm shadow-success/10",
        warning: "bg-gradient-to-r from-warning/20 to-warning/10 text-warning border border-warning/30 shadow-sm shadow-warning/10",
        danger: "bg-gradient-to-r from-danger/20 to-danger/10 text-danger border border-danger/30 shadow-sm shadow-danger/10",
        muted: "bg-white/30 text-muted-foreground border border-white/40",
        brand: "bg-gradient-to-r from-brand/20 to-accent/10 text-brand border border-brand/30 shadow-sm shadow-brand/10",
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
