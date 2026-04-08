import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findCellNode,
  $getElementForTableNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  getDOMCellFromTarget,
  getTableObserverFromTableElement,
} from '@lexical/table';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { NodeKey } from 'lexical';
import {
  $createRangeSelection,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $setSelection,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';

interface MenuState {
  x: number;
  y: number;
  cellNodeKey: NodeKey;
}

export function TableContextMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !(target instanceof Node)) return;

      const targetElement = target as Element;
      if (!targetElement.closest?.('td, th') && !targetElement.closest?.('table')) return;

      editor.getEditorState().read(() => {
        let cellNode: ReturnType<typeof $findCellNode> = null;

        const nearestNode = $getNearestNodeFromDOMNode(target);
        if (nearestNode) {
          cellNode = $findCellNode(nearestNode);
        }

        if (!cellNode) {
          const domCell = getDOMCellFromTarget(target);
          if (domCell) {
            const tableElement = (domCell.elem as Element).closest('table');
            if (tableElement) {
              const tableObserver = getTableObserverFromTableElement(
                tableElement as unknown as Parameters<typeof getTableObserverFromTableElement>[0],
              );
              if (tableObserver) {
                const { tableNode } = tableObserver.$lookup();
                const table = $getElementForTableNode(editor, tableNode);
                cellNode = tableNode.getCellNodeFromCords(domCell.x, domCell.y, table);
              }
            }
          }
        }

        if (!cellNode) return;

        event.preventDefault();
        event.stopPropagation();
        setMenuState({ x: event.clientX, y: event.clientY, cellNodeKey: cellNode.getKey() });
      });
    },
    [editor],
  );

  const runTableAction = useCallback(
    (action: () => void) => {
      if (!menuState) return;

      const cellNodeKey = menuState.cellNodeKey;
      editor.update(() => {
        const cellNode = $getNodeByKey(cellNodeKey);
        if (!cellNode || !$findCellNode(cellNode)) return;

        const rangeSelection = $createRangeSelection();
        rangeSelection.anchor.set(cellNodeKey, 0, 'element');
        rangeSelection.focus.set(cellNodeKey, 0, 'element');
        $setSelection(rangeSelection);

        try {
          action();
        } catch {
          // Ignore errors (e.g. cannot delete last row/column)
        }
      });
      closeMenu();
    },
    [editor, menuState, closeMenu],
  );

  const canDeleteRow = useCallback(() => {
    if (!menuState) return false;
    let result = false;
    editor.getEditorState().read(() => {
      const cellNode = $getNodeByKey(menuState.cellNodeKey);
      if (!cellNode || !$findCellNode(cellNode)) return;
      try {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
        result = tableNode.getChildrenSize() > 1;
      } catch {
        result = false;
      }
    });
    return result;
  }, [editor, menuState]);

  const canDeleteColumn = useCallback(() => {
    if (!menuState) return false;
    let result = false;
    editor.getEditorState().read(() => {
      const cellNode = $getNodeByKey(menuState.cellNodeKey);
      if (!cellNode || !$findCellNode(cellNode)) return;
      try {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
        result = tableNode.getColumnCount() > 1;
      } catch {
        result = false;
      }
    });
    return result;
  }, [editor, menuState]);

  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    rootElement.addEventListener('contextmenu', handleContextMenu);
    return () => rootElement.removeEventListener('contextmenu', handleContextMenu);
  }, [editor, handleContextMenu]);

  useEffect(() => {
    if (!menuState) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState, closeMenu]);

  if (!menuState) return null;

  const deleteRowDisabled = !canDeleteRow();
  const deleteColumnDisabled = !canDeleteColumn();

  return (
    <div
      ref={menuRef}
      className="table-context-menu"
      style={{
        position: 'fixed',
        left: menuState.x,
        top: menuState.y,
        zIndex: 1000,
      }}
      role="menu"
    >
      <button
        type="button"
        className="table-context-menu-item"
        onClick={() => runTableAction(() => $insertTableRowAtSelection(false))}
        role="menuitem"
      >
        Add row above
      </button>
      <button
        type="button"
        className="table-context-menu-item"
        onClick={() => runTableAction(() => $insertTableRowAtSelection(true))}
        role="menuitem"
      >
        Add row below
      </button>
      <button
        type="button"
        className="table-context-menu-item"
        onClick={() => runTableAction($deleteTableRowAtSelection)}
        disabled={deleteRowDisabled}
        role="menuitem"
      >
        Delete row
      </button>
      <div className="table-context-menu-separator" />
      <button
        type="button"
        className="table-context-menu-item"
        onClick={() => runTableAction(() => $insertTableColumnAtSelection(false))}
        role="menuitem"
      >
        Add column left
      </button>
      <button
        type="button"
        className="table-context-menu-item"
        onClick={() => runTableAction(() => $insertTableColumnAtSelection(true))}
        role="menuitem"
      >
        Add column right
      </button>
      <button
        type="button"
        className="table-context-menu-item"
        onClick={() => runTableAction($deleteTableColumnAtSelection)}
        disabled={deleteColumnDisabled}
        role="menuitem"
      >
        Delete column
      </button>
    </div>
  );
}
