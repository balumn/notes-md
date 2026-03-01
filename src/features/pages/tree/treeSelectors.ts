import type { Page, PageTreeNode } from '../../../domain/models';

export function sortPagesByPosition(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function getSiblingPages(pages: Page[], parentId: string | null): Page[] {
  return sortPagesByPosition(pages.filter((page) => page.parentId === parentId));
}

function buildNode(page: Page, pages: Page[], depth: number): PageTreeNode {
  const children = getSiblingPages(pages, page.id).map((child) => buildNode(child, pages, depth + 1));
  return { page, children, depth };
}

export function buildPageTree(pages: Page[]): PageTreeNode[] {
  return getSiblingPages(pages, null).map((rootPage) => buildNode(rootPage, pages, 0));
}

export function flattenPageTree(nodes: PageTreeNode[]): PageTreeNode[] {
  const result: PageTreeNode[] = [];

  const traverse = (node: PageTreeNode) => {
    result.push(node);
    node.children.forEach((child) => traverse(child));
  };

  nodes.forEach((node) => traverse(node));
  return result;
}
