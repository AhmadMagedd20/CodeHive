import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Status pill system. Semantic variants pull from the palette's soft/strong
 * pairs (all AA-contrast): success=fern, warning=clay, danger/destructive=rust,
 * info=mist, highlight=amber. Use the semantic name that matches the MEANING.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 transition-colors [&_svg]:h-3 [&_svg]:w-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-bark/10 bg-secondary text-secondary-foreground",
        success: "border-success-strong/15 bg-success-soft text-success-strong",
        warning: "border-warning-strong/15 bg-warning-soft text-warning-strong",
        destructive: "border-danger-strong/15 bg-danger-soft text-danger-strong",
        danger: "border-danger-strong/15 bg-danger-soft text-danger-strong",
        info: "border-info-strong/15 bg-info-soft text-info-strong",
        highlight: "border-highlight-strong/15 bg-highlight-soft text-highlight-strong",
        outline: "border-bark/15 text-foreground",
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
