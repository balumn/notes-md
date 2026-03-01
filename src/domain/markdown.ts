import { LOCAL_IMAGE_SCHEME } from './constants';

const LOCAL_IMAGE_REFERENCE_REGEX = /!\[[^\]]*\]\(local-image:\/\/([^)]+)\)/g;
const FENCED_CODE_BLOCK_DELIMITER_REGEX = /^(\s*)(`{3,}|~{3,})/;
const CHECKLIST_ITEM_CONTENT_REGEX = /^-\s+\[([ xX])\]\s*(.*)$/;
const ORDERED_LIST_ITEM_CONTENT_REGEX = /^\d+\.\s*(.*)$/;
const BULLET_LIST_ITEM_CONTENT_REGEX = /^[-+*]\s+(.*)$/;

type ParsedListLine =
  | {
      kind: 'ordered';
      indentation: string;
      content: string;
    }
  | {
      kind: 'bullet';
      indentation: string;
      content: string;
    }
  | {
      kind: 'checklist';
      indentation: string;
      checkedState: ' ' | 'x' | 'X';
      content: string;
    };

function getIndentWidth(indentation: string): number {
  return Array.from(indentation).reduce((width, character) => width + (character === '\t' ? 4 : 1), 0);
}

function parseListLine(line: string): ParsedListLine | null {
  const lineMatch = /^(\s*)(.*)$/.exec(line);
  if (!lineMatch) {
    return null;
  }

  const [, indentation, content] = lineMatch;

  const checklistMatch = CHECKLIST_ITEM_CONTENT_REGEX.exec(content);
  if (checklistMatch) {
    const checkedState = checklistMatch[1] === 'x' || checklistMatch[1] === 'X' ? checklistMatch[1] : ' ';
    return {
      kind: 'checklist',
      indentation,
      checkedState,
      content: checklistMatch[2],
    };
  }

  const orderedMatch = ORDERED_LIST_ITEM_CONTENT_REGEX.exec(content);
  if (orderedMatch) {
    return {
      kind: 'ordered',
      indentation,
      content: orderedMatch[1],
    };
  }

  const bulletMatch = BULLET_LIST_ITEM_CONTENT_REGEX.exec(content);
  if (bulletMatch) {
    return {
      kind: 'bullet',
      indentation,
      content: bulletMatch[1],
    };
  }

  return null;
}

function getListLineIndentationWidth(line: string): number | null {
  const parsedLine = parseListLine(line);
  if (!parsedLine) {
    return null;
  }

  return getIndentWidth(parsedLine.indentation);
}

const LIST_INDENT_UNIT = 4;

function inferIndentUnit(_lines: string[]): number {
  return LIST_INDENT_UNIT;
}

function toIndentLevel(indentationWidth: number, indentUnit: number): number {
  if (indentationWidth <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(indentationWidth / Math.max(indentUnit, 1)));
}

export function extractLocalImageIds(contentMd: string): string[] {
  const imageIds = new Set<string>();

  for (const match of contentMd.matchAll(LOCAL_IMAGE_REFERENCE_REGEX)) {
    const imageId = match[1]?.trim();
    if (imageId) {
      imageIds.add(imageId);
    }
  }

  return [...imageIds];
}

export function buildLocalImageMarkdown(imageId: string, alt = 'image'): string {
  return `![${alt}](${LOCAL_IMAGE_SCHEME}${imageId})`;
}

export function isLocalImageSource(src: string): boolean {
  return src.startsWith(LOCAL_IMAGE_SCHEME);
}

export function getLocalImageIdFromSource(src: string): string | null {
  if (!isLocalImageSource(src)) {
    return null;
  }

  return src.slice(LOCAL_IMAGE_SCHEME.length).trim() || null;
}

export function replaceLocalImageSources(
  contentMd: string,
  imageDataUrls: Map<string, string>,
): string {
  let result = contentMd;

  for (const [imageId, dataUrl] of imageDataUrls.entries()) {
    result = result.replaceAll(`${LOCAL_IMAGE_SCHEME}${imageId}`, dataUrl);
  }

  return result;
}

export function normalizeMarkdownListIndentation(contentMd: string): string {
  const lines = contentMd.split('\n');
  const indentUnit = inferIndentUnit(lines);
  let inFencedCodeBlock = false;
  const orderedCountersByDepth = new Map<number, number>();

  return lines
    .map((line) => {
      if (FENCED_CODE_BLOCK_DELIMITER_REGEX.test(line)) {
        inFencedCodeBlock = !inFencedCodeBlock;
        return line;
      }

      if (inFencedCodeBlock) {
        return line;
      }

      const parsedLine = parseListLine(line);
      if (!parsedLine) {
        if (line.trim()) {
          orderedCountersByDepth.clear();
        }
        return line;
      }

      const indentLevel = toIndentLevel(getIndentWidth(parsedLine.indentation), indentUnit);
      for (const existingDepth of [...orderedCountersByDepth.keys()]) {
        if (existingDepth > indentLevel) {
          orderedCountersByDepth.delete(existingDepth);
        }
      }

      const normalizedIndentation = ' '.repeat(indentLevel * 4);
      if (parsedLine.kind === 'ordered') {
        const nextValue = (orderedCountersByDepth.get(indentLevel) ?? 0) + 1;
        orderedCountersByDepth.set(indentLevel, nextValue);
        return `${normalizedIndentation}${nextValue}. ${parsedLine.content}`;
      }

      orderedCountersByDepth.delete(indentLevel);
      if (parsedLine.kind === 'checklist') {
        return `${normalizedIndentation}- [${parsedLine.checkedState}] ${parsedLine.content}`;
      }

      return `${normalizedIndentation}- ${parsedLine.content}`;
    })
    .join('\n');
}
