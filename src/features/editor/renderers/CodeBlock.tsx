import { useMemo, useState, type ReactNode } from 'react';

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}

function nodeToText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((part) => nodeToText(part)).join('');
  }

  if (node && typeof node === 'object' && 'props' in node) {
    const elementChildren = (node.props as { children?: ReactNode }).children;
    return nodeToText(elementChildren);
  }

  return '';
}

export function CodeBlock({ inline, className, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeText = useMemo(() => nodeToText(children).replace(/\n$/, ''), [children]);

  if (inline) {
    return <code className={className}>{children}</code>;
  }

  return (
    <span className="code-block-shell">
      <button
        type="button"
        className="code-copy-button"
        onClick={async () => {
          await navigator.clipboard.writeText(codeText);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <code className={className}>{children}</code>
    </span>
  );
}
