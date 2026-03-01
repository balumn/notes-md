import { useMemo } from 'react';

import type { Page } from '../../../domain/models';
import { buildPageTree } from '../tree/treeSelectors';
import { PageTreeNode } from './PageTreeNode';

interface PageTreeProps {
  pages: Page[];
  selectedPageId: string | null;
  expandedPageIds: string[];
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

export function PageTree({
  pages,
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
}: PageTreeProps) {
  const pageTree = useMemo(() => buildPageTree(pages), [pages]);
  const expandedSet = useMemo(() => new Set(expandedPageIds), [expandedPageIds]);

  return (
    <section className="tree-panel">
      <header className="tree-header">
        <h2>Pages</h2>
      </header>

      {pageTree.length ? (
        <ul className="page-tree">
          {pageTree.map((node) => (
            <PageTreeNode
              key={node.page.id}
              node={node}
              selectedPageId={selectedPageId}
              expandedPageIds={expandedSet}
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
      ) : (
        <div className="tree-empty">
          <p>No pages yet.</p>
          <p>Use File - New page to create one.</p>
        </div>
      )}
    </section>
  );
}
