"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown del agente. react-markdown no interpreta HTML crudo, así que lo que escriba el modelo no puede inyectar marcado. */
export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prosa ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children: c, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
