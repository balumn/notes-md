import { useEffect, useMemo } from 'react';

import {
  SHORTCUTS,
  getShortcutPlatform,
  matchesShortcutEvent,
  type ShortcutActionId,
  type ShortcutDefinition,
} from './shortcutRegistry';

interface UseGlobalShortcutsOptions {
  onAction: (actionId: ShortcutActionId) => boolean;
  isActionEnabled?: (shortcut: ShortcutDefinition) => boolean;
  shortcuts?: readonly ShortcutDefinition[];
}

function getTargetElement(event: KeyboardEvent): Element | null {
  return event.target instanceof Element ? event.target : null;
}

function isEditableTarget(target: Element | null): boolean {
  if (!target) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}

function isEditorTarget(target: Element | null): boolean {
  if (!target) {
    return false;
  }

  return Boolean(
    target.closest('.cm-editor, .editor-host, .live-editor-shell, .live-editor-content, .editor-pane, .live-pane'),
  );
}

export function useGlobalShortcuts({
  onAction,
  isActionEnabled,
  shortcuts = SHORTCUTS,
}: UseGlobalShortcutsOptions): void {
  const platform = useMemo(() => getShortcutPlatform(), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) {
        return;
      }

      const target = getTargetElement(event);
      const editableTarget = isEditableTarget(target);
      const editorTarget = isEditorTarget(target);

      for (const shortcut of shortcuts) {
        if (!matchesShortcutEvent(event, shortcut.binding, platform)) {
          continue;
        }

        if (shortcut.scope === 'editor' && !editorTarget) {
          continue;
        }

        if (shortcut.scope === 'nonEditable' && editableTarget) {
          continue;
        }

        if (isActionEnabled && !isActionEnabled(shortcut)) {
          continue;
        }

        const handled = onAction(shortcut.actionId);
        if (!handled) {
          continue;
        }

        event.preventDefault();
        event.stopPropagation();
        break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActionEnabled, onAction, platform, shortcuts]);
}
