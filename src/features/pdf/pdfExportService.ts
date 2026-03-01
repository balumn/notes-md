import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import {
  extractLocalImageIds,
  normalizeMarkdownListIndentation,
  replaceLocalImageSources,
} from '../../domain/markdown';
import type { Page, PageTreeNode } from '../../domain/models';
import { imageRepository } from '../../lib/db/repositories/imageRepository';
import { buildPageTree } from '../pages/tree/treeSelectors';

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildPdfFilename(title: string): string {
  const dateStamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const slug = toSlug(title) || 'notes';
  return `${slug}-${dateStamp}.pdf`;
}

async function markdownToHtml(markdown: string): Promise<string> {
  const normalizedMarkdown = normalizeMarkdownListIndentation(markdown);

  const rendered = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(normalizedMarkdown);

  return String(rendered);
}

async function resolveMarkdownImages(markdown: string): Promise<string> {
  const imageIds = extractLocalImageIds(markdown);
  if (!imageIds.length) {
    return markdown;
  }

  const imageDataUrls = new Map<string, string>();
  await Promise.all(
    imageIds.map(async (imageId) => {
      const dataUrl = await imageRepository.getDataUrl(imageId);
      if (dataUrl) {
        imageDataUrls.set(imageId, dataUrl);
      }
    }),
  );

  return replaceLocalImageSources(markdown, imageDataUrls);
}

function buildPdfDocumentHtml(contentHtml: string): string {
  return `
    <style>
      .pdf-document {
        background: #fff;
        color: #111;
        padding: 18mm;
        font-family: Inter, Arial, sans-serif;
        font-size: 12px;
        line-height: 1.5;
      }
      .pdf-document h1,.pdf-document h2,.pdf-document h3,.pdf-document h4,.pdf-document h5,.pdf-document h6 { margin: 0 0 8px; }
      .pdf-document p { margin: 0 0 8px; }
      .pdf-document table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      .pdf-document th,.pdf-document td { border: 1px solid #d1d5db; padding: 6px; }
      .pdf-document pre { background: #f6f8fa; padding: 10px; border-radius: 6px; overflow: hidden; }
      .pdf-document blockquote { border-left: 3px solid #d1d5db; margin: 10px 0; padding-left: 10px; color: #4b5563; }
      .pdf-page-section { page-break-inside: avoid; margin-bottom: 18px; }
      .pdf-page-title { margin-bottom: 8px; }
    </style>
    <article class="pdf-document">${contentHtml}</article>
  `;
}

async function saveHtmlAsPdf(contentHtml: string, filename: string): Promise<void> {
  const html2pdfModule = await import('html2pdf.js');
  const html2pdfInstance = (html2pdfModule.default ?? html2pdfModule) as unknown as (
    source?: string,
    options?: unknown,
  ) => {
    set: (options: unknown) => {
      from: (source: string, type: 'string') => { save: () => Promise<void> };
    };
  };

  await html2pdfInstance()
    .set({
      filename,
      margin: [6, 6, 6, 6],
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .from(contentHtml, 'string')
    .save();
}

async function renderPageSection(page: Page, depth: number): Promise<string> {
  const markdownWithInlineImages = await resolveMarkdownImages(page.contentMd);
  const bodyHtml = await markdownToHtml(markdownWithInlineImages);
  const headingTag = `h${Math.min(depth + 1, 6)}`;

  return `
    <section class="pdf-page-section" style="margin-left:${depth * 10}px">
      <${headingTag} class="pdf-page-title">${page.title}</${headingTag}>
      ${bodyHtml}
    </section>
  `;
}

async function renderTreeNode(node: PageTreeNode): Promise<string> {
  const sectionHtml = await renderPageSection(node.page, node.depth);
  const childrenSections = await Promise.all(node.children.map((child) => renderTreeNode(child)));
  return `${sectionHtml}${childrenSections.join('')}`;
}

export async function exportPageAsPdf(page: Page): Promise<void> {
  const sectionHtml = await renderPageSection(page, 0);
  const documentHtml = buildPdfDocumentHtml(sectionHtml);
  await saveHtmlAsPdf(documentHtml, buildPdfFilename(page.title));
}

export async function exportWorkspaceAsPdf(pages: Page[]): Promise<void> {
  const tree = buildPageTree(pages);
  const sections = await Promise.all(tree.map((node) => renderTreeNode(node)));
  const documentHtml = buildPdfDocumentHtml(sections.join(''));
  await saveHtmlAsPdf(documentHtml, buildPdfFilename('workspace'));
}
