import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";
import { cn } from "@/lib/utils";
import { Pre } from "./code-block";

/**
 * Renders lesson Markdown with clean typography + fenced code blocks. Syntax
 * highlighting + a per-block copy button are layered on in Section 2 (Content
 * Rendering); this is the base reading experience.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "space-y-4 leading-relaxed text-foreground",
        "[&_h1]:mt-6 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-semibold",
        "[&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold",
        "[&_h3]:mt-4 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6",
        "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-sm",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-ink [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_pre_code]:font-mono",
        "[&_img]:rounded-lg",
        // `min-w-full` rather than `w-full`: inside the scroll container below,
        // a wide table needs to be allowed to exceed the container, not squeeze
        // into it. Lecture notes routinely carry 7- and 8-column trace tables
        // that are unreadable when crushed to phone width.
        "[&_table]:min-w-full [&_table]:text-sm [&_table]:border-collapse",
        "[&_th]:whitespace-nowrap [&_th]:border-b [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold",
        "[&_td]:border-b [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top",
        "[&_hr]:my-8 [&_hr]:border-border",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: Pre,
          /*
           * Tables get their own scroll container so a wide one scrolls
           * sideways instead of pushing the whole page wide. Without this a
           * single 8-column table makes every other paragraph on the lesson
           * scroll horizontally too, which is the usual way long-form notes
           * break on a phone.
           */
          table: ({ node: _node, ...props }) => (
            <div className="-mx-1 overflow-x-auto px-1">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
