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
import type { LexicalEditor } from 'lexical';
import {
  $createRangeSelection,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $setSelection,
} from 'lexical';
import { useCallback, useEffect, useRef, useState } from 'react';

const EDGE_THRESHOLD = 24;

interface TableHoverState {
  table: HTMLTableElement;
  rect: DOMRect;
  cellNodeKey: string | null;
  columnIndex: number;
  rowIndex: number;
}

function getCellNodeKey(
  editor: LexicalEditor,
  target: Node,
): { cellNodeKey: string; columnIndex: number; rowIndex: number } | null {
  let outCellKey: string | null = null;
  let outCol = 0;
  let outRow = 0;

  editor.getEditorState().read(() => {
    const nearestNode = $getNearestNodeFromDOMNode(target);
    let cellNode = nearestNode ? $findCellNode(nearestNode) : null;

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
            outCol = domCell.x;
            outRow = domCell.y;
          }
        }
      }
    }

    if (cellNode) {
      try {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
        const table = $getElementForTableNode(editor, tableNode);
        const cords = tableNode.getCordsFromCellNode(cellNode, table);
        outCol = cords.x;
        outRow = cords.y;
        outCellKey = cellNode.getKey();
      } catch {
        // ignore
      }
    }
  });

  if (!outCellKey) return null;
  return { cellNodeKey: outCellKey, columnIndex: outCol, rowIndex: outRow };
}

function runTableAction(
  editor: LexicalEditor,
  cellNodeKey: string,
  action: () => void,
) {
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
      // Ignore errors
    }
  });
}

export function TableHoverButtonsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [hoverState, setHoverState] = useState<TableHoverState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const updateHoverState = useCallback(
    (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;

      const table = (target as Element).closest('table');
      if (!table) {
        if (hoverState) setHoverState(null);
        return;
      }

      const rect = table.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      const nearRight = x > width - EDGE_THRESHOLD;
      const nearBottom = y > height - EDGE_THRESHOLD;
      const nearLeft = x < EDGE_THRESHOLD;
      const nearTop = y < EDGE_THRESHOLD;

      if (!nearRight && !nearBottom && !nearLeft && !nearTop) {
        if (hoverState) setHoverState(null);
        return;
      }

      let cellInfo = getCellNodeKey(editor, target as Node);
      if (!cellInfo) {
        const cellElement = (target as Element).closest('td, th');
        if (cellElement) {
          cellInfo = getCellNodeKey(editor, cellElement as Node);
        }
      }
      if (!cellInfo) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setHoverState({
          table: table as HTMLTableElement,
          rect,
          cellNodeKey: cellInfo?.cellNodeKey ?? null,
          columnIndex: cellInfo?.columnIndex ?? 0,
          rowIndex: cellInfo?.rowIndex ?? 0,
        });
      });
    },
    [editor, hoverState],
  );

  useEffect(() => {
    if (!editor) return;
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseRef.current = { clientX: e.clientX, clientY: e.clientY };
      updateHoverState(e);
    };

    const handleMouseLeave = () => {
      setHoverState(null);
    };

    rootElement.addEventListener('mousemove', handleMouseMove);
    rootElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      rootElement.removeEventListener('mousemove', handleMouseMove);
      rootElement.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editor, updateHoverState]);

  useEffect(() => {
    if (!editor) return;
    const handleScroll = () => {
      if (hoverState && lastMouseRef.current) {
        const e = new MouseEvent('mousemove', {
          clientX: lastMouseRef.current.clientX,
          clientY: lastMouseRef.current.clientY,
        });
        updateHoverState(e);
      }
    };

    const scrollParent = editor.getRootElement()?.closest('.live-editor-content') ?? document;
    scrollParent.addEventListener('scroll', handleScroll, true);
    return () => scrollParent.removeEventListener('scroll', handleScroll, true);
  }, [editor, hoverState, updateHoverState]);

  if (!editor || !hoverState) return null;

  const { rect, cellNodeKey } = hoverState;
  const hasCell = cellNodeKey !== null;

  let canDeleteRow = false;
  let canDeleteColumn = false;
  if (hasCell && cellNodeKey) {
    editor.getEditorState().read(() => {
      const cellNode = $getNodeByKey(cellNodeKey);
      if (cellNode && $findCellNode(cellNode)) {
        try {
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(cellNode);
          canDeleteRow = tableNode.getChildrenSize() > 1;
          canDeleteColumn = tableNode.getColumnCount() > 1;
        } catch {
          // ignore
        }
      }
    });
  }

  return (
    <div
      className="table-hover-buttons"
      style={{
        position: 'fixed',
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div
        className="table-hover-button table-hover-add-col"
        style={{
          right: -12,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <button
          type="button"
          className="table-hover-btn"
          title="Add column"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (cellNodeKey) {
              runTableAction(editor, cellNodeKey, () => $insertTableColumnAtSelection(true));
            }
          }}
          style={{ pointerEvents: 'auto' }}
        >
          +
        </button>
      </div>
      <div
        className="table-hover-button table-hover-add-row"
        style={{
          left: '50%',
          bottom: -12,
          transform: 'translateX(-50%)',
        }}
      >
        <button
          type="button"
          className="table-hover-btn"
          title="Add row"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (cellNodeKey) {
              runTableAction(editor, cellNodeKey, () => $insertTableRowAtSelection(true));
            }
          }}
          style={{ pointerEvents: 'auto' }}
        >
          +
        </button>
      </div>
      {hasCell && (
        <>
          <div
            className="table-hover-button table-hover-delete-col"
            style={{
              left: -12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <button
              type="button"
              className="table-hover-btn table-hover-btn-delete"
              title="Delete column"
              disabled={!canDeleteColumn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (cellNodeKey && canDeleteColumn) {
                  runTableAction(editor, cellNodeKey, $deleteTableColumnAtSelection);
                }
              }}
              style={{ pointerEvents: 'auto' }}
            >
              −
            </button>
          </div>
          <div
            className="table-hover-button table-hover-delete-row"
            style={{
              left: '50%',
              top: -12,
              transform: 'translateX(-50%)',
            }}
          >
            <button
              type="button"
              className="table-hover-btn table-hover-btn-delete"
              title="Delete row"
              disabled={!canDeleteRow}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (cellNodeKey && canDeleteRow) {
                  runTableAction(editor, cellNodeKey, $deleteTableRowAtSelection);
                }
              }}
              style={{ pointerEvents: 'auto' }}
            >
              −
            </button>
          </div>
        </>
      )}
    </div>
  );
}
