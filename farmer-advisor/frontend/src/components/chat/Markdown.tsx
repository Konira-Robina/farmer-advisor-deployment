import ReactMarkdown, { type Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  h1: ({ children }) => <p className="mb-2 font-display text-lg font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-2 font-display text-lg font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-2 font-bold">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-leaf underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-leaf-soft px-1.5 py-0.5 text-[0.95em]">{children}</code>,
  blockquote: ({ children }) => <blockquote className="mb-3 border-l-4 border-maize pl-4">{children}</blockquote>,
};

export function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
}
