import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 backdrop-blur-sm",
  {
    variants: {
      variant: {
        success: "bg-gradient-to-r from-success/20 to-success/10 text-success border border-success/30 shadow-sm shadow-success/10",
        warning: "bg-gradient-to-r from-warning/20 to-warning/10 text-warning border border-warning/30 shadow-sm shadow-warning/10",
        danger: "bg-gradient-to-r from-danger/20 to-danger/10 text-danger border border-danger/30 shadow-sm shadow-danger/10",
        muted: "bg-white/30 text-muted-foreground border border-white/40",
        brand: "bg-gradient-to-r from-brand/20 to-accent/10 text-brand border border-brand/30 shadow-sm shadow-brand/10",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
};
