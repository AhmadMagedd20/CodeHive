import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teaches tailwind-merge about our custom `border-brutal` width (tailwind.config.ts
// borderWidth.brutal) — without this it doesn't recognize the class and silently
// drops it whenever it's combined with a border-color utility like `border-ink`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "border-w": ["border-brutal"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
