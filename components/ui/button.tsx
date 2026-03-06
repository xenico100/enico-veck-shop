import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.92rem] border border-white/10 bg-[linear-gradient(180deg,rgba(32,46,79,0.16),rgba(7,15,31,0.82))] text-sm font-medium tracking-[0.06em] text-foreground shadow-[inset_0_1px_0_rgba(245,248,255,0.08),0_12px_28px_rgba(1,4,12,0.22)] transition-[transform,border-color,background-color,box-shadow,color] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] active:translate-y-[1px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-[linear-gradient(180deg,rgba(97,124,221,0.32),rgba(16,28,56,0.92))] text-primary-foreground hover:border-primary/45 hover:bg-[linear-gradient(180deg,rgba(108,135,234,0.4),rgba(20,34,64,0.94))]",
        destructive:
          "border-destructive/25 bg-[linear-gradient(180deg,rgba(244,63,94,0.18),rgba(43,10,18,0.86))] text-white hover:border-destructive/40 hover:bg-[linear-gradient(180deg,rgba(244,63,94,0.28),rgba(55,13,22,0.88))] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-white/14 bg-[linear-gradient(180deg,rgba(18,28,51,0.14),rgba(7,14,28,0.8))] text-foreground hover:border-primary/30 hover:bg-[linear-gradient(180deg,rgba(34,48,82,0.18),rgba(8,16,31,0.86))] hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "border-white/12 bg-[linear-gradient(180deg,rgba(31,43,76,0.14),rgba(8,17,33,0.82))] text-secondary-foreground hover:border-primary/24 hover:bg-[linear-gradient(180deg,rgba(45,61,103,0.2),rgba(10,20,38,0.88))]",
        ghost:
          "border-transparent bg-transparent shadow-none hover:border-primary/20 hover:bg-[linear-gradient(180deg,rgba(34,48,82,0.16),rgba(8,15,29,0.78))] hover:text-foreground dark:hover:bg-accent/50",
        link: "border-transparent bg-transparent p-0 shadow-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "min-h-9 rounded-[0.82rem] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "min-h-11 rounded-[1rem] px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-[0.82rem] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
