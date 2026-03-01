import type { MoveOperation, Page } from '../../../domain/models';
import { getSiblingPages } from './treeSelectors';

function getPageById(pages: Page[], pageId: string): Page | undefined {
  return pages.find((page) => page.id === pageId);
}

export function getMoveUpOperation(pages: Page[], pageId: string): MoveOperation | null {
  const page = getPageById(pages, pageId);
  if (!page) {
    return null;
  }

  const siblings = getSiblingPages(pages, page.parentId);
  const currentIndex = siblings.findIndex((sibling) => sibling.id === pageId);
  if (currentIndex <= 0) {
    return null;
  }

  return {
    targetParentId: page.parentId,
    targetPosition: currentIndex - 1,
  };
}

export function getMoveDownOperation(pages: Page[], pageId: string): MoveOperation | null {
  const page = getPageById(pages, pageId);
  if (!page) {
    return null;
  }

  const siblings = getSiblingPages(pages, page.parentId);
  const currentIndex = siblings.findIndex((sibling) => sibling.id === pageId);
  if (currentIndex === -1 || currentIndex >= siblings.length - 1) {
    return null;
  }

  return {
    targetParentId: page.parentId,
    targetPosition: currentIndex + 1,
  };
}

export function getIndentOperation(pages: Page[], pageId: string): MoveOperation | null {
  const page = getPageById(pages, pageId);
  if (!page) {
    return null;
  }

  const siblings = getSiblingPages(pages, page.parentId);
  const currentIndex = siblings.findIndex((sibling) => sibling.id === pageId);
  if (currentIndex <= 0) {
    return null;
  }

  const previousSibling = siblings[currentIndex - 1];
  const childPages = getSiblingPages(pages, previousSibling.id);
  return {
    targetParentId: previousSibling.id,
    targetPosition: childPages.length,
  };
}

export function getOutdentOperation(pages: Page[], pageId: string): MoveOperation | null {
  const page = getPageById(pages, pageId);
  if (!page?.parentId) {
    return null;
  }

  const parentPage = getPageById(pages, page.parentId);
  if (!parentPage) {
    return null;
  }

  const grandParentId = parentPage.parentId;
  const grandParentSiblings = getSiblingPages(pages, grandParentId);
  const parentIndex = grandParentSiblings.findIndex((sibling) => sibling.id === parentPage.id);

  if (parentIndex === -1) {
    return null;
  }

  return {
    targetParentId: grandParentId,
    targetPosition: parentIndex + 1,
  };
}
