import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import {
  getLocalImageIdFromSource,
  isLocalImageSource,
  normalizeMarkdownListIndentation,
} from '../../../domain/markdown';
import { imageRepository } from '../../../lib/db/repositories/imageRepository';
import { CodeBlock } from '../renderers/CodeBlock';

interface MarkdownPreviewProps {
  markdown: string;
}

interface LocalImageProps {
  src?: string;
  alt?: string;
}

function LocalImage({ src, alt }: LocalImageProps) {
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const localImageId = src && isLocalImageSource(src) ? getLocalImageIdFromSource(src) : null;

  useEffect(() => {
    if (!localImageId) {
      return;
    }

    let isCancelled = false;
    void imageRepository.getObjectUrl(localImageId).then((objectUrl) => {
      if (!isCancelled) {
        setLocalObjectUrl(objectUrl);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [localImageId]);

  const resolvedSrc = localImageId ? localObjectUrl : (src ?? null);

  if (!resolvedSrc) {
    return <span className="image-placeholder">[image unavailable]</span>;
  }

  return <img src={resolvedSrc} alt={alt ?? ''} loading="lazy" />;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const normalizedMarkdown = useMemo(() => normalizeMarkdownListIndentation(markdown), [markdown]);

  const components = useMemo<Components>(
    () => ({
      code: ({ className, children }) => {
        const codeContent = Array.isArray(children)
          ? children.map((child) => String(child)).join('')
          : String(children ?? '');
        const isInline = !className?.includes('language-') && !codeContent.includes('\n');

        return (
          <CodeBlock className={className} inline={isInline}>
            {children}
          </CodeBlock>
        );
      },
      img: ({ src, alt }) => <LocalImage key={src} src={src} alt={alt} />,
      pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      ),
    }),
    [],
  );

  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={components}
      >
        {normalizedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
