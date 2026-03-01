import { redo, undo } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { type EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';

import { useImagePasteDrop } from '../hooks/useImagePasteDrop';
import { normalizeMarkdownListIndentation } from '../../../domain/markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageFiles: (files: File[]) => Promise<string[]>;
  monospaceMode: boolean;
}

export type MarkdownEditorCommand =
  | 'undo'
  | 'redo'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'underline'
  | 'heading1'
  | 'heading2'
  | 'bulletedList'
  | 'numberedList'
  | 'blockquote'
  | 'checklist'
  | 'inlineCode'
  | 'codeBlock'
  | 'horizontalRule'
  | 'link'
  | 'table'
  | 'imageTemplate';

export interface MarkdownEditorHandle {
  runCommand: (command: MarkdownEditorCommand) => boolean;
  insertMarkdown: (markdownText: string) => boolean;
  focus: () => void;
}

function replaceSelection(
  view: EditorView,
  insertText: string,
  selectionAnchorOffset = insertText.length,
): boolean {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: insertText },
    selection: { anchor: from + selectionAnchorOffset },
  });
  view.focus();
  return true;
}

function wrapSelection(view: EditorView, prefix: string, suffix = prefix): boolean {
  const { from, to } = view.state.selection.main;
  const selectedText = view.state.sliceDoc(from, to) || 'text';
  const wrapped = `${prefix}${selectedText}${suffix}`;
  const anchorOffset = prefix.length + selectedText.length;
  return replaceSelection(view, wrapped, anchorOffset);
}

function wrapSelectionWithPlaceholder(
  view: EditorView,
  prefix: string,
  suffix: string,
  placeholder: string,
): boolean {
  const { from, to } = view.state.selection.main;
  const selectedText = view.state.sliceDoc(from, to) || placeholder;
  const wrapped = `${prefix}${selectedText}${suffix}`;
  const anchorOffset = prefix.length + selectedText.length;
  return replaceSelection(view, wrapped, anchorOffset);
}

function prefixSelectedLines(view: EditorView, prefix: string): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const transformed = selected
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  return replaceSelection(view, transformed, transformed.length);
}

function getIndentWidth(indentation: string): number {
  return Array.from(indentation).reduce((width, character) => width + (character === '\t' ? 4 : 1), 0);
}

const LIST_INDENT_UNIT = 4;

function inferIndentUnit(_markdown: string): number {
  return LIST_INDENT_UNIT;
}

function toIndentLevel(indentation: string, indentUnit: number): number {
  const indentationWidth = getIndentWidth(indentation);
  if (indentationWidth <= 0) {
    return 0;
  }

  return Math.max(1, Math.round(indentationWidth / Math.max(indentUnit, 1)));
}

function stripLeadingListMarker(content: string): string {
  return content.replace(/^(?:-\s+\[[ xX]\]\s+|\d+\.\s+|[-+*]\s+)/, '');
}

function renumberOrderedListLines(markdown: string): string {
  const indentUnit = inferIndentUnit(markdown);
  const countersByDepth = new Map<number, number>();

  return markdown
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return line;
      }

      const lineMatch = /^(\s*)(.*)$/.exec(line);
      if (!lineMatch) {
        return line;
      }

      const [, indentation, contentWithMarker] = lineMatch;
      const depth = toIndentLevel(indentation, indentUnit);

      for (const existingDepth of [...countersByDepth.keys()]) {
        if (existingDepth > depth) {
          countersByDepth.delete(existingDepth);
        }
      }

      const nextValue = (countersByDepth.get(depth) ?? 0) + 1;
      countersByDepth.set(depth, nextValue);

      return `${' '.repeat(depth * 4)}${nextValue}. ${stripLeadingListMarker(contentWithMarker)}`;
    })
    .join('\n');
}

function applyBulletedList(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (!selected.length) {
    return replaceSelection(view, '- ', 2);
  }

  const indentUnit = inferIndentUnit(selected);
  const transformed = selected
    .split('\n')
    .map((line) => {
      if (!line.trim()) {
        return line;
      }

      const lineMatch = /^(\s*)(.*)$/.exec(line);
      if (!lineMatch) {
        return line;
      }

      const [, indentation, contentWithMarker] = lineMatch;
      const depth = toIndentLevel(indentation, indentUnit);
      return `${' '.repeat(depth * 4)}- ${stripLeadingListMarker(contentWithMarker)}`;
    })
    .join('\n');

  return replaceSelection(view, transformed, transformed.length);
}

function applyNumberedList(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (!selected.length) {
    return replaceSelection(view, '1. ', 3);
  }

  const transformed = normalizeMarkdownListIndentation(renumberOrderedListLines(selected));
  return replaceSelection(view, transformed, transformed.length);
}

function insertCodeBlock(view: EditorView): boolean {
  return wrapSelectionWithPlaceholder(view, '\n```\n', '\n```\n', 'code');
}

function insertLink(view: EditorView): boolean {
  return wrapSelectionWithPlaceholder(view, '[', '](https://example.com)', 'link text');
}

function insertImageTemplate(view: EditorView): boolean {
  return replaceSelection(view, '![alt text](https://example.com/image.png)', 10);
}

function insertTable(view: EditorView): boolean {
  return replaceSelection(
    view,
    '\n| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |\n',
    11,
  );
}

function runMarkdownCommand(view: EditorView, command: MarkdownEditorCommand): boolean {
  switch (command) {
    case 'undo':
      return undo(view);
    case 'redo':
      return redo(view);
    case 'bold':
      return wrapSelection(view, '**');
    case 'italic':
      return wrapSelection(view, '*');
    case 'strikethrough':
      return wrapSelection(view, '~~');
    case 'underline':
      return wrapSelection(view, '<u>', '</u>');
    case 'heading1':
      return prefixSelectedLines(view, '# ');
    case 'heading2':
      return prefixSelectedLines(view, '## ');
    case 'bulletedList':
      return applyBulletedList(view);
    case 'numberedList':
      return applyNumberedList(view);
    case 'blockquote':
      return prefixSelectedLines(view, '> ');
    case 'checklist':
      return prefixSelectedLines(view, '- [ ] ');
    case 'inlineCode':
      return wrapSelection(view, '`');
    case 'codeBlock':
      return insertCodeBlock(view);
    case 'horizontalRule':
      return replaceSelection(view, '\n---\n', 5);
    case 'link':
      return insertLink(view);
    case 'table':
      return insertTable(view);
    case 'imageTemplate':
      return insertImageTemplate(view);
    default:
      return false;
  }
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor(
  { value, onChange, onImageFiles, monospaceMode },
  ref,
) {
  const editorViewRef = useRef<EditorView | null>(null);

  const runCommand = useCallback((command: MarkdownEditorCommand): boolean => {
    const view = editorViewRef.current;
    if (!view) {
      return false;
    }

    return runMarkdownCommand(view, command);
  }, []);

  const insertMarkdownAtCursor = useCallback((markdownText: string): boolean => {
    const view = editorViewRef.current;
    if (!view) {
      return false;
    }

    return replaceSelection(view, markdownText, markdownText.length);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      runCommand,
      insertMarkdown: insertMarkdownAtCursor,
      focus: () => {
        editorViewRef.current?.focus();
      },
    }),
    [insertMarkdownAtCursor, runCommand],
  );

  const imagePasteDropHandlers = useImagePasteDrop({
    onImageFiles,
    onInsertMarkdown: insertMarkdownAtCursor,
  });

  const displayValue = useMemo(() => normalizeMarkdownListIndentation(value), [value]);

  const handleCodeMirrorChange = useCallback(
    (nextValue: string) => {
      onChange(normalizeMarkdownListIndentation(nextValue));
    },
    [onChange],
  );

  const extensions = useMemo(() => [markdown()], []);

  return (
    <div
      className={`editor-host ${monospaceMode ? 'editor-host-monospace' : ''}`}
      onPaste={imagePasteDropHandlers.onPaste}
      onDrop={imagePasteDropHandlers.onDrop}
      onDragOver={imagePasteDropHandlers.onDragOver}
    >
      <CodeMirror
        value={displayValue}
        extensions={extensions}
        onCreateEditor={(editorView) => {
          editorViewRef.current = editorView;
        }}
        onChange={handleCodeMirrorChange}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLineGutter: false,
          highlightActiveLine: false,
        }}
      />
    </div>
  );
});

MarkdownEditor.displayName = 'MarkdownEditor';
