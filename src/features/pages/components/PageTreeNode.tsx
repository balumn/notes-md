import { memo, useEffect, useRef, useState } from 'react';

import type { PageTreeNode as PageTreeNodeModel } from '../../../domain/models';

interface PageTreeNodeProps {
  node: PageTreeNodeModel;
  selectedPageId: string | null;
  expandedPageIds: Set<string>;
  onSelect: (pageId: string) => void;
  onToggleExpand: (pageId: string) => void;
  onCreateChild: (parentId: string) => void;
  onRename: (pageId: string, title: string) => void;
  onDelete: (pageId: string) => void;
  onMoveUp: (pageId: string) => void;
  onMoveDown: (pageId: string) => void;
  onIndent: (pageId: string) => void;
  onOutdent: (pageId: string) => void;
}

const MENU_MARGIN = 8;
const MENU_WIDTH = 220;
const MENU_HEIGHT = 240;

function PageTreeNodeBase({
  node,
  selectedPageId,
  expandedPageIds,
  onSelect,
  onToggleExpand,
  onCreateChild,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
}: PageTreeNodeProps) {
  const isSelected = node.page.id === selectedPageId;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedPageIds.has(node.page.id);
  const paddingLeft = `${node.depth * 14 + 8}px`;
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const closeContextMenu = () => {
    setContextMenuPosition(null);
  };

  useEffect(() => {
    if (!contextMenuPosition) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (contextMenuRef.current && event.target instanceof Node && contextMenuRef.current.contains(event.target)) {
        return;
      }

      closeContextMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    const handleViewportChange = () => {
      closeContextMenu();
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [contextMenuPosition]);

  const openContextMenu = (clientX: number, clientY: number) => {
    const maxX = Math.max(MENU_MARGIN, window.innerWidth - MENU_WIDTH - MENU_MARGIN);
    const maxY = Math.max(MENU_MARGIN, window.innerHeight - MENU_HEIGHT - MENU_MARGIN);

    setContextMenuPosition({
      x: Math.min(Math.max(clientX, MENU_MARGIN), maxX),
      y: Math.min(Math.max(clientY, MENU_MARGIN), maxY),
    });
  };

  const runContextAction = (action: () => void) => {
    closeContextMenu();
    action();
  };

  return (
    <li className="page-tree-node">
      <div
        className={`page-tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft }}
        onClick={() => {
          closeContextMenu();
          onSelect(node.page.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onSelect(node.page.id);
          openContextMenu(event.clientX, event.clientY);
        }}
      >
        <button
          type="button"
          className="tree-toggle"
          aria-label={isExpanded ? 'Collapse page' : 'Expand page'}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) {
              onToggleExpand(node.page.id);
            }
          }}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : '·'}
        </button>
        <span className="tree-title">{node.page.title}</span>
        <div className="tree-actions">
          <button
            type="button"
            title="Add child page"
            onClick={(event) => {
              event.stopPropagation();
              onCreateChild(node.page.id);
            }}
          >
            +
          </button>
        </div>
      </div>
      {contextMenuPosition ? (
        <div
          ref={contextMenuRef}
          className="tree-context-menu"
          role="menu"
          aria-label="Page actions"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => onCreateChild(node.page.id));
            }}
          >
            Add child page
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => {
                const nextTitle = window.prompt('Rename page', node.page.title);
                if (nextTitle !== null) {
                  onRename(node.page.id, nextTitle);
                }
              });
            }}
          >
            Rename
          </button>
          <div className="tree-context-menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => onMoveUp(node.page.id));
            }}
          >
            Move up
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => onMoveDown(node.page.id));
            }}
          >
            Move down
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => onIndent(node.page.id));
            }}
          >
            Indent
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => onOutdent(node.page.id));
            }}
          >
            Outdent
          </button>
          <div className="tree-context-menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={(event) => {
              event.stopPropagation();
              runContextAction(() => onDelete(node.page.id));
            }}
          >
            Delete
          </button>
        </div>
      ) : null}

      {hasChildren && isExpanded ? (
        <ul className="page-tree-children">
          {node.children.map((child) => (
            <PageTreeNodeBase
              key={child.page.id}
              node={child}
              selectedPageId={selectedPageId}
              expandedPageIds={expandedPageIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onDelete={onDelete}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onIndent={onIndent}
              onOutdent={onOutdent}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export const PageTreeNode = memo(PageTreeNodeBase);
