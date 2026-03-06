import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap border-0 bg-transparent px-0 text-sm font-medium uppercase tracking-[0.12em] text-foreground transition-[transform,color,opacity] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-center after:scale-x-[0.72] after:bg-current after:opacity-40 after:transition-[transform,opacity] after:duration-200 hover:after:scale-x-100 hover:after:opacity-90 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-0 active:translate-y-[1px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground",
        destructive:
          "text-white",
        outline:
          "text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "text-secondary-foreground",
        ghost:
          "text-foreground dark:hover:bg-accent/50",
        link: "p-0 text-primary underline-offset-4 hover:underline after:hidden",
      },
      size: {
        default: "min-h-10 has-[>svg]:px-0",
        sm: "min-h-9 gap-1.5 has-[>svg]:px-0",
        lg: "min-h-11 has-[>svg]:px-0",
        icon: "size-10 p-0 after:hidden",
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
