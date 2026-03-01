import type { ReactNode } from 'react';

import type { MarkdownEditorCommand } from './MarkdownEditor';

interface MarkdownToolbarProps {
  disabled?: boolean;
  onCommand: (command: MarkdownEditorCommand) => void;
  onUploadImage: () => void;
}

interface CommandAction {
  id: string;
  title: string;
  command: MarkdownEditorCommand;
  icon: () => ReactNode;
}

interface UploadImageAction {
  id: string;
  title: string;
  action: 'uploadImage';
  icon: () => ReactNode;
}

type ToolbarAction = CommandAction | UploadImageAction;

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      className="markdown-toolbar-icon"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function UndoIcon() {
  return (
    <IconBase>
      <path d="M7 3.5 3.5 7 7 10.5" />
      <path d="M3.5 7h6a3 3 0 1 1 0 6H8" />
    </IconBase>
  );
}

function RedoIcon() {
  return (
    <IconBase>
      <path d="M9 3.5 12.5 7 9 10.5" />
      <path d="M12.5 7h-6a3 3 0 1 0 0 6H8" />
    </IconBase>
  );
}

function BoldIcon() {
  return (
    <IconBase>
      <path d="M5 3.5h3.8a2.3 2.3 0 0 1 0 4.6H5z" />
      <path d="M5 8.1h4.4a2.4 2.4 0 0 1 0 4.8H5z" />
    </IconBase>
  );
}

function ItalicIcon() {
  return (
    <IconBase>
      <path d="M10.5 3.5H6.5" />
      <path d="M9.5 3.5 6.5 12.5" />
      <path d="M9.5 12.5H5.5" />
    </IconBase>
  );
}

function StrikethroughIcon() {
  return (
    <IconBase>
      <path d="M12 3.5H8a2 2 0 0 0 0 4h2a2 2 0 1 1 0 4H6" />
      <path d="M3.5 8h9" />
    </IconBase>
  );
}

function InlineCodeIcon() {
  return (
    <IconBase>
      <path d="M6 4.5 3 8l3 3.5" />
      <path d="M10 4.5 13 8l-3 3.5" />
      <path d="M9 3.5 7 12.5" />
    </IconBase>
  );
}

function Heading1Icon() {
  return (
    <IconBase>
      <path d="M3.5 4v8" />
      <path d="M7 4v8" />
      <path d="M3.5 8h3.5" />
      <path d="M10.5 5h2v7" />
      <path d="M10 12h3" />
    </IconBase>
  );
}

function Heading2Icon() {
  return (
    <IconBase>
      <path d="M2.5 4v8" />
      <path d="M6 4v8" />
      <path d="M2.5 8H6" />
      <path d="M9.8 6a2 2 0 0 1 4 0c0 1-1 1.8-2 2.5L10 10h4" />
      <path d="M10 12h4" />
    </IconBase>
  );
}

function BulletListIcon() {
  return (
    <IconBase>
      <circle cx="3.5" cy="5" r="0.7" />
      <circle cx="3.5" cy="8" r="0.7" />
      <circle cx="3.5" cy="11" r="0.7" />
      <path d="M6 5h7" />
      <path d="M6 8h7" />
      <path d="M6 11h7" />
    </IconBase>
  );
}

function NumberListIcon() {
  return (
    <IconBase>
      <path d="M3.2 4.5h1.3v3.2" />
      <path d="M3 11h1.8l-1.8-2h1.8" />
      <path d="M6.5 5h6.5" />
      <path d="M6.5 8h6.5" />
      <path d="M6.5 11h6.5" />
    </IconBase>
  );
}

function ChecklistIcon() {
  return (
    <IconBase>
      <rect x="2.5" y="3.5" width="3.5" height="3.5" rx="0.6" />
      <path d="m3.3 5.2 0.8 0.9 1.5-1.6" />
      <rect x="2.5" y="9" width="3.5" height="3.5" rx="0.6" />
      <path d="M7.5 5.2h6" />
      <path d="M7.5 10.8h6" />
    </IconBase>
  );
}

function QuoteIcon() {
  return (
    <IconBase>
      <path d="M4 4v8" />
      <path d="M7 5h6" />
      <path d="M7 8h5" />
      <path d="M7 11h6" />
    </IconBase>
  );
}

function CodeBlockIcon() {
  return (
    <IconBase>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.2" />
      <path d="M6 6.5 4.8 8 6 9.5" />
      <path d="M10 6.5 11.2 8 10 9.5" />
    </IconBase>
  );
}

function HorizontalRuleIcon() {
  return (
    <IconBase>
      <path d="M2.5 8h11" />
      <path d="M5 6.2v3.6" />
      <path d="M11 6.2v3.6" />
    </IconBase>
  );
}

function LinkIcon() {
  return (
    <IconBase>
      <path d="M6.5 9.5 9.5 6.5" />
      <path d="M6 4.5H5a3 3 0 0 0 0 6h1" />
      <path d="M10 11.5h1a3 3 0 0 0 0-6h-1" />
    </IconBase>
  );
}

function TableIcon() {
  return (
    <IconBase>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.1" />
      <path d="M2.5 7h11" />
      <path d="M2.5 10h11" />
      <path d="M7 3.5v9" />
    </IconBase>
  );
}

function ImageIcon() {
  return (
    <IconBase>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.1" />
      <circle cx="6.1" cy="6.1" r="0.9" />
      <path d="m3.5 11 2.7-2.7 1.9 1.9 1.8-1.8 2.6 2.6" />
    </IconBase>
  );
}

const TOOLBAR_GROUPS: ToolbarAction[][] = [
  [
    { id: 'undo', title: 'Undo (Cmd/Ctrl+Z)', command: 'undo', icon: UndoIcon },
    { id: 'redo', title: 'Redo (Cmd/Ctrl+Shift+Z)', command: 'redo', icon: RedoIcon },
  ],
  [
    { id: 'bold', title: 'Bold (Cmd/Ctrl+B)', command: 'bold', icon: BoldIcon },
    { id: 'italic', title: 'Italic (Cmd/Ctrl+I)', command: 'italic', icon: ItalicIcon },
    { id: 'strike', title: 'Strikethrough (Cmd/Ctrl+Shift+X)', command: 'strikethrough', icon: StrikethroughIcon },
    { id: 'inline-code', title: 'Inline code (Cmd/Ctrl+E)', command: 'inlineCode', icon: InlineCodeIcon },
  ],
  [
    { id: 'heading-1', title: 'Heading 1 (Cmd/Ctrl+Opt/Alt+1)', command: 'heading1', icon: Heading1Icon },
    { id: 'heading-2', title: 'Heading 2 (Cmd/Ctrl+Opt/Alt+2)', command: 'heading2', icon: Heading2Icon },
    { id: 'bullet-list', title: 'Bulleted list (Cmd/Ctrl+Shift+8)', command: 'bulletedList', icon: BulletListIcon },
    { id: 'number-list', title: 'Numbered list (Cmd/Ctrl+Shift+7)', command: 'numberedList', icon: NumberListIcon },
    { id: 'checklist', title: 'Checklist (Cmd/Ctrl+Shift+C)', command: 'checklist', icon: ChecklistIcon },
    { id: 'blockquote', title: 'Blockquote (Cmd/Ctrl+Shift+9)', command: 'blockquote', icon: QuoteIcon },
  ],
  [
    { id: 'code-block', title: 'Code block (Cmd/Ctrl+Opt/Alt+Shift+C)', command: 'codeBlock', icon: CodeBlockIcon },
    {
      id: 'horizontal-rule',
      title: 'Horizontal rule (Cmd/Ctrl+Shift+6)',
      command: 'horizontalRule',
      icon: HorizontalRuleIcon,
    },
    { id: 'link', title: 'Insert link (Cmd/Ctrl+K)', command: 'link', icon: LinkIcon },
    { id: 'table', title: 'Insert table (Cmd/Ctrl+Opt/Alt+Shift+T)', command: 'table', icon: TableIcon },
    { id: 'image-upload', title: 'Upload image (Cmd/Ctrl+Shift+U)', action: 'uploadImage', icon: ImageIcon },
  ],
];

function isCommandAction(action: ToolbarAction): action is CommandAction {
  return 'command' in action;
}

export function MarkdownToolbar({ disabled = false, onCommand, onUploadImage }: MarkdownToolbarProps) {
  return (
    <div className="markdown-toolbar" role="toolbar" aria-label="Markdown formatting">
      {TOOLBAR_GROUPS.map((group, groupIndex) => (
        <div className="markdown-toolbar-group" key={`group-${groupIndex}`}>
          {group.map((action) => (
            <button
              key={action.id}
              type="button"
              className="markdown-toolbar-button"
              title={action.title}
              data-tooltip={action.title}
              aria-label={action.title}
              disabled={disabled}
              onClick={() => {
                if (isCommandAction(action)) {
                  onCommand(action.command);
                  return;
                }

                onUploadImage();
              }}
            >
              <action.icon />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
