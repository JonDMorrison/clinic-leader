import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-brand to-accent text-white hover:shadow-lg hover:shadow-brand/30 hover:scale-105 active:scale-95",
        destructive: "bg-gradient-to-r from-danger to-danger/80 text-destructive-foreground hover:shadow-lg hover:shadow-danger/30 hover:scale-105 active:scale-95",
        outline: "border-2 border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 backdrop-blur-md hover:shadow-md",
        secondary: "bg-white/50 text-secondary-foreground hover:bg-white/70 hover:shadow-md backdrop-blur-sm",
        ghost: "hover:bg-white/20 hover:text-foreground backdrop-blur-sm",
        link: "text-brand underline-offset-4 hover:underline hover:text-accent",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
