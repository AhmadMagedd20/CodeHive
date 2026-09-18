import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status pill system. Semantic variants pull from the palette's soft/strong
 * pairs (all AA-contrast): success=grass, warning=sunny, danger/destructive=berry,
 * info=lilac, highlight=sunny. Use the semantic name that matches the MEANING.
 * Every variant carries the brutal outline — solid ink border, no tinted/transparent
 * borders — per the neo-brutalist system.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border-brutal border-ink px-2.5 py-0.5 text-xs font-semibold leading-5 transition-colors [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Kit: "A badge never uses flame — flame is reserved for things you can
        // click." The neutral badge is therefore an ink fill, not the primary.
        default: "bg-ink text-white",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        destructive: "bg-danger-soft text-danger-strong",
        danger: "bg-danger-soft text-danger-strong",
        info: "bg-info-soft text-info-strong",
        highlight: "bg-highlight-soft text-highlight-strong",
        outline: "bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
