'use client';

import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Only in-app links are clickable; anything else renders as plain text. */
const components: Components = {
  a: ({ href, children }) =>
    href?.startsWith('/') && !href.startsWith('//') ? (
      <Link href={href} className="text-brand font-medium hover:underline">
        {children}
      </Link>
    ) : (
      <span>{children}</span>
    ),
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
  h1: ({ children }) => <p className="mt-2 mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mt-2 mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mt-2 mb-1 font-semibold">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="bg-app rounded px-1 text-[12px]">{children}</code>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-line bg-app border px-2 py-1 text-left font-semibold whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="border-line border px-2 py-1 align-top">{children}</td>,
  img: () => null,
};

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
      {text}
    </ReactMarkdown>
  );
}
