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
} from '@lexical/markdown';
import { TOGGLE_LINK_COMMAND, AutoLinkNode, LinkNode } from '@lexical/link';
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
import {
  collapseBlankLinesBetweenListItems,
  convertStandaloneCheckboxesForDisplay,
  normalizeMarkdownListIndentation,
} from '../../../domain/markdown';

const MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
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
      return insertMarkdownSnippet(editor, '\n---\n');
    case 'link':
      return editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://example.com');
    case 'table':
      return insertMarkdownSnippet(
        editor,
        '\n| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |\n',
      );
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
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode, AutoLinkNode],
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
          <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
          <OnChangePlugin ignoreSelectionChange onChange={handleChange} />
        </LexicalComposer>
      </div>
    );
  },
);

LiveMarkdownEditor.displayName = 'LiveMarkdownEditor';
