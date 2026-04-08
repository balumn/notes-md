import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CHECK_LIST,
  HEADING,
  MULTILINE_ELEMENT_TRANSFORMERS,
  ORDERED_LIST,
  QUOTE,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  UNORDERED_LIST,
  type ElementTransformer,
} from '@lexical/markdown';
import { TOGGLE_LINK_COMMAND, AutoLinkNode, LinkNode } from '@lexical/link';
import { INSERT_TABLE_COMMAND, TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import {
  $createListNode,
  $isListItemNode,
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import { $createCodeNode, CodeNode } from '@lexical/code';
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import {
  COMMAND_PRIORITY_EDITOR,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  KEY_TAB_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type EditorState,
  type LexicalNode,
  type LexicalEditor,
} from 'lexical';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import type { MarkdownEditorCommand, MarkdownEditorHandle } from './MarkdownEditor';

// #region agent log
function logNestedChecklistStyles() {
  const root = document.querySelector('.live-editor-content');
  if (!root) return;
  const nestedUls = root.querySelectorAll('ul ul');
  nestedUls.forEach((ul) => {
    const hasCheckbox = ul.querySelector('li[role="checkbox"]');
    if (!hasCheckbox) return;
    const s = getComputedStyle(ul);
    const parentLi = ul.closest('li');
    const parentLiStyles = parentLi ? getComputedStyle(parentLi) : null;
    const firstNestedLi = ul.querySelector('li[role="checkbox"]');
    const firstLiStyles = firstNestedLi ? getComputedStyle(firstNestedLi) : null;
    const parentUl = ul.parentElement?.closest('ul');
    const parentUlStyles = parentUl ? getComputedStyle(parentUl) : null;
    const rootRect = (root as HTMLElement).getBoundingClientRect();
    const nestedRect = (ul as HTMLElement).getBoundingClientRect();
    const topLevelLi = root.querySelector('ul > li[role="checkbox"]');
    const topLevelRect = topLevelLi?.getBoundingClientRect();
    const indentFromRoot = nestedRect.left - rootRect.left;
    const topLevelIndent = topLevelRect ? topLevelRect.left - rootRect.left : null;
    const payload = {
      hypothesisId: 'A',
      indentFromRootPx: Math.round(indentFromRoot),
      topLevelIndentPx: topLevelIndent != null ? Math.round(topLevelIndent) : null,
      nestedUl: {
        marginLeft: s.marginLeft,
        marginTop: s.marginTop,
        paddingLeft: s.paddingLeft,
        display: s.display,
        offsetLeft: (ul as HTMLElement).offsetLeft,
        offsetParentTag: (ul as HTMLElement).offsetParent?.tagName,
      },
      parentUl: parentUlStyles
        ? { paddingLeft: parentUlStyles.paddingLeft, marginLeft: parentUlStyles.marginLeft }
        : null,
      parentLi: parentLi
        ? {
            display: parentLiStyles?.display,
            flexDirection: parentLiStyles?.flexDirection,
            gap: parentLiStyles?.gap,
            paddingLeft: parentLiStyles?.paddingLeft,
          }
        : null,
      firstNestedLi: firstLiStyles
        ? { marginTop: firstLiStyles.marginTop, marginBottom: firstLiStyles.marginBottom }
        : null,
    };
    fetch('http://127.0.0.1:7915/ingest/a6c5168c-344b-4a88-b312-581586ee6bac', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '12b1c7' },
      body: JSON.stringify({
        sessionId: '12b1c7',
        location: 'LiveMarkdownEditor.tsx:logNestedChecklistStyles',
        message: 'Nested checklist computed styles',
        data: payload,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  });
}
// #endregion

function NestedChecklistDebugPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(() => {
      requestAnimationFrame(() => {
        setTimeout(logNestedChecklistStyles, 50);
      });
    });
  }, [editor]);
  return null;
}

import { TABLE } from '../transformers/tableMarkdownTransformer';
import { TableContextMenuPlugin } from '../plugins/TableContextMenuPlugin';
import { TableHoverButtonsPlugin } from '../plugins/TableHoverButtonsPlugin';
import {
  collapseBlankLinesBetweenListItems,
  convertStandaloneCheckboxesForDisplay,
  normalizeMarkdownListIndentation,
} from '../../../domain/markdown';

/** In live mode, triple dash creates a new line (paragraph) instead of a horizontal rule. */
const TRIPLE_DASH_AS_NEWLINE: ElementTransformer = {
  dependencies: [],
  export: () => null,
  regExp: /^---\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const paragraph = $createParagraphNode();
    parentNode.replace(paragraph);
    if (!isImport) {
      paragraph.select(0, 0);
    }
  },
  type: 'element',
};

const MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  TRIPLE_DASH_AS_NEWLINE,
  TABLE,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  ...MULTILINE_ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];

interface LiveMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function Placeholder() {
  return <div className="live-editor-placeholder">Write with live markdown formatting...</div>;
}

function applyBlockType(editor: LexicalEditor, createBlockNode: () => HeadingNode | QuoteNode | CodeNode): boolean {
  let didApply = false;
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    $setBlocksType(selection, createBlockNode);
    didApply = true;
  });

  return didApply;
}

function insertMarkdownSnippet(editor: LexicalEditor, markdownText: string): boolean {
  let didInsert = false;
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.insertText(markdownText);
      didInsert = true;
      return;
    }

    const paragraphNode = $createParagraphNode();
    paragraphNode.append($createTextNode(markdownText));
    $getRoot().append(paragraphNode);
    paragraphNode.selectEnd();
    didInsert = true;
  });

  return didInsert;
}

function getClosestListItemNode(node: LexicalNode): ListItemNode | null {
  let currentNode: LexicalNode | null = node;
  while (currentNode) {
    if ($isListItemNode(currentNode)) {
      return currentNode;
    }
    currentNode = currentNode.getParent();
  }

  return null;
}

function getNestedListNode(listItemNode: ListItemNode): ListNode | null {
  for (const child of listItemNode.getChildren()) {
    if ($isListNode(child)) {
      return child;
    }
  }

  return null;
}

function indentListItemUnderPreviousSibling(listItemNode: ListItemNode): boolean {
  const parentList = listItemNode.getParent();
  const previousSibling = listItemNode.getPreviousSibling();

  if (!$isListNode(parentList) || !$isListItemNode(previousSibling)) {
    return false;
  }

  let nestedList = getNestedListNode(previousSibling);
  if (!nestedList) {
    nestedList = $createListNode(parentList.getListType());
    previousSibling.append(nestedList);
  }

  if (nestedList.getListType() === 'number' && nestedList.getStart() !== 1) {
    nestedList.setStart(1);
  }

  nestedList.append(listItemNode);
  return true;
}

function OrderedNestedListStartPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerNodeTransform(ListNode, (listNode) => {
      if (listNode.getListType() !== 'number') {
        return;
      }

      if (!$isListItemNode(listNode.getParent())) {
        return;
      }

      if (listNode.getStart() !== 1) {
        listNode.setStart(1);
      }
    });
  }, [editor]);

  return null;
}

function ListTabBehaviorPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }

        const listItemNode = getClosestListItemNode(selection.anchor.getNode());
        if (!listItemNode) {
          return false;
        }

        event.preventDefault();

        if (event.shiftKey) {
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        } else {
          editor.update(() => {
            const liveSelection = $getSelection();
            if (!$isRangeSelection(liveSelection)) {
              return;
            }

            const focusedListItemNode = getClosestListItemNode(liveSelection.anchor.getNode());
            if (!focusedListItemNode) {
              return;
            }

            indentListItemUnderPreviousSibling(focusedListItemNode);
          });
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}

function runLiveMarkdownCommand(editor: LexicalEditor, command: MarkdownEditorCommand): boolean {
  switch (command) {
    case 'undo':
      return editor.dispatchCommand(UNDO_COMMAND, undefined);
    case 'redo':
      return editor.dispatchCommand(REDO_COMMAND, undefined);
    case 'bold':
      return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
    case 'italic':
      return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
    case 'strikethrough':
      return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
    case 'underline':
      return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
    case 'heading1':
      return applyBlockType(editor, () => $createHeadingNode('h1'));
    case 'heading2':
      return applyBlockType(editor, () => $createHeadingNode('h2'));
    case 'bulletedList':
      return editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    case 'numberedList':
      return editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    case 'blockquote':
      return applyBlockType(editor, () => $createQuoteNode());
    case 'checklist':
      return editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    case 'inlineCode':
      return editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
    case 'codeBlock':
      return applyBlockType(editor, () => $createCodeNode());
    case 'horizontalRule':
      return insertMarkdownSnippet(editor, '\n\n');
    case 'link':
      return editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://example.com');
    case 'table':
      return editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: '2',
        rows: '3',
        includeHeaders: true,
      });
    case 'imageTemplate':
      return insertMarkdownSnippet(editor, '![alt text](https://example.com/image.png)');
    default:
      return false;
  }
}

export const LiveMarkdownEditor = forwardRef<MarkdownEditorHandle, LiveMarkdownEditorProps>(
  function LiveMarkdownEditor({ value, onChange }: LiveMarkdownEditorProps, ref) {
    const lexicalEditorRef = useRef<LexicalEditor | null>(null);
    const normalizedInitialValue = useMemo(
      () =>
        collapseBlankLinesBetweenListItems(
          convertStandaloneCheckboxesForDisplay(normalizeMarkdownListIndentation(value)),
        ),
      [value],
    );

    const runCommand = useCallback((command: MarkdownEditorCommand): boolean => {
      const editor = lexicalEditorRef.current;
      if (!editor) {
        return false;
      }

      editor.focus();
      return runLiveMarkdownCommand(editor, command);
    }, []);

    const insertMarkdown = useCallback((markdownText: string): boolean => {
      const editor = lexicalEditorRef.current;
      if (!editor) {
        return false;
      }

      editor.focus();
      return insertMarkdownSnippet(editor, markdownText);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        runCommand,
        insertMarkdown,
        focus: () => {
          lexicalEditorRef.current?.focus();
        },
      }),
      [insertMarkdown, runCommand],
    );

    const initialConfig = useMemo(
      () => ({
        namespace: 'notes-md-live-editor',
        editorState: () => {
          $convertFromMarkdownString(normalizedInitialValue, MARKDOWN_TRANSFORMERS);
        },
        nodes: [
          HeadingNode,
          QuoteNode,
          ListNode,
          ListItemNode,
          CodeNode,
          LinkNode,
          AutoLinkNode,
          TableNode,
          TableRowNode,
          TableCellNode,
        ],
        onError: (error: Error) => {
          throw error;
        },
      }),
      [normalizedInitialValue],
    );

    const handleChange = useCallback(
      (editorState: EditorState) => {
        editorState.read(() => {
          const nextMarkdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
          onChange(normalizeMarkdownListIndentation(nextMarkdown));
        });
      },
      [onChange],
    );

    return (
      <div className="live-editor-shell">
        <LexicalComposer initialConfig={initialConfig}>
          <EditorRefPlugin editorRef={lexicalEditorRef} />
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="live-editor-content" aria-label="Live markdown editor" />
            }
            placeholder={<Placeholder />}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <OrderedNestedListStartPlugin />
          <ListTabBehaviorPlugin />
          <LinkPlugin />
          <TablePlugin />
          <TableContextMenuPlugin />
          <TableHoverButtonsPlugin />
          <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
          <NestedChecklistDebugPlugin />
          <OnChangePlugin ignoreSelectionChange onChange={handleChange} />
        </LexicalComposer>
      </div>
    );
  },
);

LiveMarkdownEditor.displayName = 'LiveMarkdownEditor';
