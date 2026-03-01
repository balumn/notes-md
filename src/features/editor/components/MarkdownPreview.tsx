import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import {
  convertStandaloneCheckboxesForDisplay,
  getLocalImageIdFromSource,
  isLocalImageSource,
  normalizeMarkdownListIndentation,
} from '../../../domain/markdown';
import { imageRepository } from '../../../lib/db/repositories/imageRepository';
import { CodeBlock } from '../renderers/CodeBlock';

interface MarkdownPreviewProps {
  markdown: string;
  onCheckboxToggle?: (itemIndex: number, checked: boolean) => void;
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

export function MarkdownPreview({ markdown, onCheckboxToggle }: MarkdownPreviewProps) {
  const displayMarkdown = useMemo(
    () => convertStandaloneCheckboxesForDisplay(normalizeMarkdownListIndentation(markdown)),
    [markdown],
  );
  const taskListIndexRef = useRef(0);
  taskListIndexRef.current = 0;

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
      input: (props) => {
        const isTaskCheckbox =
          props.type === 'checkbox' &&
          String(props.className ?? '').includes('task-list-item-checkbox');

        if (isTaskCheckbox && onCheckboxToggle) {
          const index = taskListIndexRef.current++;
          const checked = props.checked ?? false;
          return (
            <input
              {...props}
              disabled={false}
              checked={checked}
              onChange={() => onCheckboxToggle(index, !checked)}
            />
          );
        }

        return <input {...props} />;
      },
    }),
    [onCheckboxToggle],
  );

  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={components}
      >
        {displayMarkdown}
      </ReactMarkdown>
    </div>
  );
}
