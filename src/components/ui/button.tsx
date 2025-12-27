import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold font-display tracking-wide transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/50 hover:scale-105",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 hover:bg-destructive/90",
        outline:
          "border-2 border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary hover:shadow-lg hover:shadow-primary/20",
        secondary:
          "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30 hover:bg-secondary/80 hover:scale-105",
        ghost: 
          "text-foreground hover:bg-muted hover:text-foreground",
        link: 
          "text-primary underline-offset-4 hover:underline",
        neon:
          "relative bg-transparent border-2 border-primary text-primary before:absolute before:inset-0 before:bg-primary/10 before:rounded-lg hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] active:scale-95",
        neonCyan:
          "relative bg-transparent border-2 border-secondary text-secondary before:absolute before:inset-0 before:bg-secondary/10 before:rounded-lg hover:bg-secondary hover:text-secondary-foreground hover:shadow-[0_0_30px_hsl(var(--secondary)/0.5)] active:scale-95",
        neonAccent:
          "relative bg-transparent border-2 border-accent text-accent before:absolute before:inset-0 before:bg-accent/10 before:rounded-lg hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_30px_hsl(var(--accent)/0.5)] active:scale-95",
        hero:
          "relative overflow-hidden bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold shadow-lg shadow-primary/40 hover:shadow-xl hover:shadow-primary/60 hover:scale-105 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        glass:
          "bg-card/50 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/70 hover:border-primary/30 shadow-lg",
        menu:
          "w-full justify-start gap-4 bg-transparent border border-border/30 text-foreground/80 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-md px-4",
        lg: "h-14 rounded-xl px-10 text-lg",
        xl: "h-16 rounded-xl px-12 text-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
