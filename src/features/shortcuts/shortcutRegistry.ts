import type { MarkdownEditorCommand } from '../editor/components/MarkdownEditor';

export type ShortcutPlatform = 'mac' | 'windowsLinux';

export type ShortcutCategory = 'File' | 'Edit' | 'View' | 'Editor' | 'Page Tree' | 'Help';

export type ShortcutScope = 'global' | 'nonEditable' | 'editor';

export type ShortcutActionId =
  | 'file.newPage'
  | 'file.importJson'
  | 'file.exportJson'
  | 'file.exportPagePdf'
  | 'file.exportWorkspacePdf'
  | 'edit.renamePage'
  | 'edit.deletePage'
  | 'edit.moveUp'
  | 'edit.moveDown'
  | 'edit.indent'
  | 'edit.outdent'
  | 'view.modeEdit'
  | 'view.modeLive'
  | 'view.modeSplit'
  | 'view.modePreview'
  | 'view.toggleMonospace'
  | 'view.toggleEditorToolbar'
  | 'view.expandAll'
  | 'view.collapseAll'
  | 'help.about'
  | 'help.keyboardShortcuts'
  | 'tree.createChild'
  | 'tree.selectPrevious'
  | 'tree.selectNext'
  | 'tree.expandSelected'
  | 'tree.collapseSelected'
  | 'editor.undo'
  | 'editor.redo'
  | 'editor.bold'
  | 'editor.italic'
  | 'editor.strikethrough'
  | 'editor.underline'
  | 'editor.inlineCode'
  | 'editor.heading1'
  | 'editor.heading2'
  | 'editor.bulletedList'
  | 'editor.numberedList'
  | 'editor.checklist'
  | 'editor.blockquote'
  | 'editor.codeBlock'
  | 'editor.horizontalRule'
  | 'editor.link'
  | 'editor.table'
  | 'editor.uploadImage';

export interface ShortcutBinding {
  code: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutDefinition {
  id: string;
  actionId: ShortcutActionId;
  category: ShortcutCategory;
  label: string;
  menuItemId?: string;
  scope: ShortcutScope;
  requiresSelectedPage?: boolean;
  note?: string;
  binding: ShortcutBinding;
  macLabel: string;
  windowsLinuxLabel: string;
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: 'file-new-page',
    actionId: 'file.newPage',
    category: 'File',
    label: 'New page',
    menuItemId: 'file-new-page',
    scope: 'nonEditable',
    binding: { code: 'KeyN', mod: true, alt: true },
    macLabel: 'Cmd+Opt+N',
    windowsLinuxLabel: 'Ctrl+Alt+N',
  },
  {
    id: 'file-import-json',
    actionId: 'file.importJson',
    category: 'File',
    label: 'Import JSON',
    menuItemId: 'file-import-json',
    scope: 'nonEditable',
    binding: { code: 'KeyI', mod: true, alt: true },
    macLabel: 'Cmd+Opt+I',
    windowsLinuxLabel: 'Ctrl+Alt+I',
  },
  {
    id: 'file-export-json',
    actionId: 'file.exportJson',
    category: 'File',
    label: 'Export JSON',
    menuItemId: 'file-export-json',
    scope: 'nonEditable',
    binding: { code: 'KeyJ', mod: true, alt: true },
    macLabel: 'Cmd+Opt+J',
    windowsLinuxLabel: 'Ctrl+Alt+J',
  },
  {
    id: 'file-export-page-pdf',
    actionId: 'file.exportPagePdf',
    category: 'File',
    label: 'Export page PDF',
    menuItemId: 'file-export-page-pdf',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'KeyP', mod: true, alt: true },
    macLabel: 'Cmd+Opt+P',
    windowsLinuxLabel: 'Ctrl+Alt+P',
  },
  {
    id: 'file-export-workspace-pdf',
    actionId: 'file.exportWorkspacePdf',
    category: 'File',
    label: 'Export workspace PDF',
    menuItemId: 'file-export-workspace-pdf',
    scope: 'nonEditable',
    binding: { code: 'KeyP', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+P',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+P',
  },
  {
    id: 'edit-rename-page',
    actionId: 'edit.renamePage',
    category: 'Edit',
    label: 'Rename page',
    menuItemId: 'edit-rename-page',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'KeyR', mod: true, alt: true },
    macLabel: 'Cmd+Opt+R',
    windowsLinuxLabel: 'Ctrl+Alt+R',
  },
  {
    id: 'edit-delete-page',
    actionId: 'edit.deletePage',
    category: 'Edit',
    label: 'Delete page',
    menuItemId: 'edit-delete-page',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'KeyD', mod: true, alt: true },
    macLabel: 'Cmd+Opt+D',
    windowsLinuxLabel: 'Ctrl+Alt+D',
  },
  {
    id: 'edit-move-up',
    actionId: 'edit.moveUp',
    category: 'Edit',
    label: 'Move page up',
    menuItemId: 'edit-move-up',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'ArrowUp', mod: true, alt: true },
    macLabel: 'Cmd+Opt+Up',
    windowsLinuxLabel: 'Ctrl+Alt+Up',
  },
  {
    id: 'edit-move-down',
    actionId: 'edit.moveDown',
    category: 'Edit',
    label: 'Move page down',
    menuItemId: 'edit-move-down',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'ArrowDown', mod: true, alt: true },
    macLabel: 'Cmd+Opt+Down',
    windowsLinuxLabel: 'Ctrl+Alt+Down',
  },
  {
    id: 'edit-indent',
    actionId: 'edit.indent',
    category: 'Edit',
    label: 'Indent page',
    menuItemId: 'edit-indent',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'ArrowRight', mod: true, alt: true },
    macLabel: 'Cmd+Opt+Right',
    windowsLinuxLabel: 'Ctrl+Alt+Right',
  },
  {
    id: 'edit-outdent',
    actionId: 'edit.outdent',
    category: 'Edit',
    label: 'Outdent page',
    menuItemId: 'edit-outdent',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'ArrowLeft', mod: true, alt: true },
    macLabel: 'Cmd+Opt+Left',
    windowsLinuxLabel: 'Ctrl+Alt+Left',
  },
  {
    id: 'view-edit',
    actionId: 'view.modeEdit',
    category: 'View',
    label: 'Switch to Edit view',
    menuItemId: 'view-edit',
    scope: 'nonEditable',
    binding: { code: 'Digit1', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+1',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+1',
  },
  {
    id: 'view-live',
    actionId: 'view.modeLive',
    category: 'View',
    label: 'Switch to Live view',
    menuItemId: 'view-live',
    scope: 'nonEditable',
    binding: { code: 'Digit2', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+2',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+2',
  },
  {
    id: 'view-split',
    actionId: 'view.modeSplit',
    category: 'View',
    label: 'Switch to Split view',
    menuItemId: 'view-split',
    scope: 'nonEditable',
    binding: { code: 'Digit3', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+3',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+3',
  },
  {
    id: 'view-preview',
    actionId: 'view.modePreview',
    category: 'View',
    label: 'Switch to Preview view',
    menuItemId: 'view-preview',
    scope: 'nonEditable',
    binding: { code: 'Digit4', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+4',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+4',
  },
  {
    id: 'view-monospace',
    actionId: 'view.toggleMonospace',
    category: 'View',
    label: 'Toggle monospace',
    menuItemId: 'view-monospace',
    scope: 'nonEditable',
    binding: { code: 'KeyM', mod: true, alt: true },
    macLabel: 'Cmd+Opt+M',
    windowsLinuxLabel: 'Ctrl+Alt+M',
  },
  {
    id: 'view-editor-toolbar',
    actionId: 'view.toggleEditorToolbar',
    category: 'View',
    label: 'Toggle editor toolbar',
    menuItemId: 'view-editor-toolbar',
    scope: 'nonEditable',
    binding: { code: 'KeyT', mod: true, alt: true },
    macLabel: 'Cmd+Opt+T',
    windowsLinuxLabel: 'Ctrl+Alt+T',
  },
  {
    id: 'view-expand-all',
    actionId: 'view.expandAll',
    category: 'View',
    label: 'Expand all pages',
    menuItemId: 'view-expand-all',
    scope: 'nonEditable',
    binding: { code: 'KeyE', mod: true, alt: true },
    macLabel: 'Cmd+Opt+E',
    windowsLinuxLabel: 'Ctrl+Alt+E',
  },
  {
    id: 'view-collapse-all',
    actionId: 'view.collapseAll',
    category: 'View',
    label: 'Collapse all pages',
    menuItemId: 'view-collapse-all',
    scope: 'nonEditable',
    binding: { code: 'KeyC', mod: true, alt: true },
    macLabel: 'Cmd+Opt+C',
    windowsLinuxLabel: 'Ctrl+Alt+C',
  },
  {
    id: 'help-about',
    actionId: 'help.about',
    category: 'Help',
    label: 'About',
    menuItemId: 'help-about',
    scope: 'global',
    binding: { code: 'KeyA', mod: true, alt: true },
    macLabel: 'Cmd+Opt+A',
    windowsLinuxLabel: 'Ctrl+Alt+A',
  },
  {
    id: 'help-keyboard-shortcuts',
    actionId: 'help.keyboardShortcuts',
    category: 'Help',
    label: 'Open keyboard shortcuts help',
    menuItemId: 'help-keyboard-shortcuts',
    scope: 'global',
    binding: { code: 'Slash', mod: true, alt: true },
    macLabel: 'Cmd+Opt+/',
    windowsLinuxLabel: 'Ctrl+Alt+/',
  },
  {
    id: 'tree-create-child',
    actionId: 'tree.createChild',
    category: 'Page Tree',
    label: 'Create child page',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'KeyN', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+N',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+N',
  },
  {
    id: 'tree-select-previous',
    actionId: 'tree.selectPrevious',
    category: 'Page Tree',
    label: 'Select previous visible page',
    scope: 'nonEditable',
    note: 'Works when focus is outside text fields.',
    binding: { code: 'ArrowUp', alt: true },
    macLabel: 'Opt+Up',
    windowsLinuxLabel: 'Alt+Up',
  },
  {
    id: 'tree-select-next',
    actionId: 'tree.selectNext',
    category: 'Page Tree',
    label: 'Select next visible page',
    scope: 'nonEditable',
    note: 'Works when focus is outside text fields.',
    binding: { code: 'ArrowDown', alt: true },
    macLabel: 'Opt+Down',
    windowsLinuxLabel: 'Alt+Down',
  },
  {
    id: 'tree-expand-selected',
    actionId: 'tree.expandSelected',
    category: 'Page Tree',
    label: 'Expand selected page',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'ArrowRight', alt: true },
    macLabel: 'Opt+Right',
    windowsLinuxLabel: 'Alt+Right',
  },
  {
    id: 'tree-collapse-selected',
    actionId: 'tree.collapseSelected',
    category: 'Page Tree',
    label: 'Collapse selected page',
    scope: 'nonEditable',
    requiresSelectedPage: true,
    note: 'Selected page required.',
    binding: { code: 'ArrowLeft', alt: true },
    macLabel: 'Opt+Left',
    windowsLinuxLabel: 'Alt+Left',
  },
  {
    id: 'editor-undo',
    actionId: 'editor.undo',
    category: 'Editor',
    label: 'Undo',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyZ', mod: true },
    macLabel: 'Cmd+Z',
    windowsLinuxLabel: 'Ctrl+Z',
  },
  {
    id: 'editor-redo',
    actionId: 'editor.redo',
    category: 'Editor',
    label: 'Redo',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyZ', mod: true, shift: true },
    macLabel: 'Cmd+Shift+Z',
    windowsLinuxLabel: 'Ctrl+Shift+Z',
  },
  {
    id: 'editor-bold',
    actionId: 'editor.bold',
    category: 'Editor',
    label: 'Bold',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyB', mod: true },
    macLabel: 'Cmd+B',
    windowsLinuxLabel: 'Ctrl+B',
  },
  {
    id: 'editor-italic',
    actionId: 'editor.italic',
    category: 'Editor',
    label: 'Italic',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyI', mod: true },
    macLabel: 'Cmd+I',
    windowsLinuxLabel: 'Ctrl+I',
  },
  {
    id: 'editor-strikethrough',
    actionId: 'editor.strikethrough',
    category: 'Editor',
    label: 'Strikethrough',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyX', mod: true, shift: true },
    macLabel: 'Cmd+Shift+X',
    windowsLinuxLabel: 'Ctrl+Shift+X',
  },
  {
    id: 'editor-underline',
    actionId: 'editor.underline',
    category: 'Editor',
    label: 'Underline',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyU', mod: true },
    macLabel: 'Cmd+U',
    windowsLinuxLabel: 'Ctrl+U',
  },
  {
    id: 'editor-inline-code',
    actionId: 'editor.inlineCode',
    category: 'Editor',
    label: 'Inline code',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyE', mod: true },
    macLabel: 'Cmd+E',
    windowsLinuxLabel: 'Ctrl+E',
  },
  {
    id: 'editor-heading-1',
    actionId: 'editor.heading1',
    category: 'Editor',
    label: 'Heading 1',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'Digit1', mod: true, alt: true },
    macLabel: 'Cmd+Opt+1',
    windowsLinuxLabel: 'Ctrl+Alt+1',
  },
  {
    id: 'editor-heading-2',
    actionId: 'editor.heading2',
    category: 'Editor',
    label: 'Heading 2',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'Digit2', mod: true, alt: true },
    macLabel: 'Cmd+Opt+2',
    windowsLinuxLabel: 'Ctrl+Alt+2',
  },
  {
    id: 'editor-bulleted-list',
    actionId: 'editor.bulletedList',
    category: 'Editor',
    label: 'Bulleted list',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'Digit8', mod: true, shift: true },
    macLabel: 'Cmd+Shift+8',
    windowsLinuxLabel: 'Ctrl+Shift+8',
  },
  {
    id: 'editor-numbered-list',
    actionId: 'editor.numberedList',
    category: 'Editor',
    label: 'Numbered list',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'Digit7', mod: true, shift: true },
    macLabel: 'Cmd+Shift+7',
    windowsLinuxLabel: 'Ctrl+Shift+7',
  },
  {
    id: 'editor-checklist',
    actionId: 'editor.checklist',
    category: 'Editor',
    label: 'Checklist',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyC', mod: true, shift: true },
    macLabel: 'Cmd+Shift+C',
    windowsLinuxLabel: 'Ctrl+Shift+C',
  },
  {
    id: 'editor-blockquote',
    actionId: 'editor.blockquote',
    category: 'Editor',
    label: 'Blockquote',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'Digit9', mod: true, shift: true },
    macLabel: 'Cmd+Shift+9',
    windowsLinuxLabel: 'Ctrl+Shift+9',
  },
  {
    id: 'editor-code-block',
    actionId: 'editor.codeBlock',
    category: 'Editor',
    label: 'Code block',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyC', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+C',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+C',
  },
  {
    id: 'editor-horizontal-rule',
    actionId: 'editor.horizontalRule',
    category: 'Editor',
    label: 'Horizontal rule',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'Digit6', mod: true, shift: true },
    macLabel: 'Cmd+Shift+6',
    windowsLinuxLabel: 'Ctrl+Shift+6',
  },
  {
    id: 'editor-link',
    actionId: 'editor.link',
    category: 'Editor',
    label: 'Insert link',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyK', mod: true },
    macLabel: 'Cmd+K',
    windowsLinuxLabel: 'Ctrl+K',
  },
  {
    id: 'editor-table',
    actionId: 'editor.table',
    category: 'Editor',
    label: 'Insert table',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyT', mod: true, alt: true, shift: true },
    macLabel: 'Cmd+Opt+Shift+T',
    windowsLinuxLabel: 'Ctrl+Alt+Shift+T',
  },
  {
    id: 'editor-upload-image',
    actionId: 'editor.uploadImage',
    category: 'Editor',
    label: 'Upload image',
    scope: 'editor',
    note: 'Editor focus required.',
    binding: { code: 'KeyU', mod: true, shift: true },
    macLabel: 'Cmd+Shift+U',
    windowsLinuxLabel: 'Ctrl+Shift+U',
  },
];

const ACTION_SHORTCUT_MAP = new Map<ShortcutActionId, ShortcutDefinition>();
const MENU_SHORTCUT_MAP = new Map<string, ShortcutDefinition>();

for (const shortcut of SHORTCUTS) {
  ACTION_SHORTCUT_MAP.set(shortcut.actionId, shortcut);
  if (shortcut.menuItemId) {
    MENU_SHORTCUT_MAP.set(shortcut.menuItemId, shortcut);
  }
}

export function getShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === 'undefined') {
    return 'mac';
  }

  return /mac|iphone|ipad|ipod/i.test(navigator.platform) ? 'mac' : 'windowsLinux';
}

export function getShortcutLabel(shortcut: ShortcutDefinition, platform: ShortcutPlatform): string {
  return platform === 'mac' ? shortcut.macLabel : shortcut.windowsLinuxLabel;
}

export function getShortcutLabelForAction(
  actionId: ShortcutActionId,
  platform = getShortcutPlatform(),
): string | null {
  const shortcut = ACTION_SHORTCUT_MAP.get(actionId);
  return shortcut ? getShortcutLabel(shortcut, platform) : null;
}

export function getMenuShortcutLabel(menuItemId: string, platform = getShortcutPlatform()): string | null {
  const shortcut = MENU_SHORTCUT_MAP.get(menuItemId);
  return shortcut ? getShortcutLabel(shortcut, platform) : null;
}

export function getShortcutByAction(actionId: ShortcutActionId): ShortcutDefinition | null {
  return ACTION_SHORTCUT_MAP.get(actionId) ?? null;
}

export function matchesShortcutEvent(
  event: KeyboardEvent,
  binding: ShortcutBinding,
  platform: ShortcutPlatform,
): boolean {
  if (event.code !== binding.code) {
    return false;
  }

  const modPressed = platform === 'mac' ? event.metaKey : event.ctrlKey;
  if (Boolean(binding.mod) !== modPressed) {
    return false;
  }

  if (Boolean(binding.shift) !== event.shiftKey) {
    return false;
  }

  if (Boolean(binding.alt) !== event.altKey) {
    return false;
  }

  if (platform === 'mac' && event.ctrlKey) {
    return false;
  }

  if (platform === 'windowsLinux' && event.metaKey) {
    return false;
  }

  return true;
}

export const EDITOR_SHORTCUT_COMMANDS: Readonly<Partial<Record<ShortcutActionId, MarkdownEditorCommand>>> = {
  'editor.undo': 'undo',
  'editor.redo': 'redo',
  'editor.bold': 'bold',
  'editor.italic': 'italic',
  'editor.strikethrough': 'strikethrough',
  'editor.underline': 'underline',
  'editor.inlineCode': 'inlineCode',
  'editor.heading1': 'heading1',
  'editor.heading2': 'heading2',
  'editor.bulletedList': 'bulletedList',
  'editor.numberedList': 'numberedList',
  'editor.checklist': 'checklist',
  'editor.blockquote': 'blockquote',
  'editor.codeBlock': 'codeBlock',
  'editor.horizontalRule': 'horizontalRule',
  'editor.link': 'link',
  'editor.table': 'table',
};
