import { nanoid } from 'nanoid';

import { DEFAULT_PAGE_TITLE } from '../../../domain/constants';
import { extractLocalImageIds } from '../../../domain/markdown';
import type { Page } from '../../../domain/models';
import { db } from '../schema';

export interface CreatePageInput {
  parentId: string | null;
  title?: string;
}

const nowIso = () => new Date().toISOString();

function sortByPosition(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

function getSiblingsByParentId(allPages: Page[], parentId: string | null): Page[] {
  return sortByPosition(allPages.filter((page) => page.parentId === parentId));
}

function collectSubtreeIds(allPages: Page[], rootPageId: string): string[] {
  const childrenByParentId = new Map<string, string[]>();
  allPages.forEach((page) => {
    if (!page.parentId) {
      return;
    }

    const children = childrenByParentId.get(page.parentId) ?? [];
    children.push(page.id);
    childrenByParentId.set(page.parentId, children);
  });

  const subtreeIds: string[] = [];
  const queue: string[] = [rootPageId];

  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    subtreeIds.push(currentId);
    const children = childrenByParentId.get(currentId) ?? [];
    children.forEach((childId) => queue.push(childId));
  }

  return subtreeIds;
}

function normalizeSiblingPositions(allPages: Page[]): Page[] {
  const parentIds = new Set<string | null>();
  allPages.forEach((page) => parentIds.add(page.parentId));
  parentIds.add(null);

  const updates: Page[] = [];
  parentIds.forEach((parentId) => {
    const siblings = getSiblingsByParentId(allPages, parentId);
    siblings.forEach((sibling, index) => {
      if (sibling.position !== index) {
        updates.push({
          ...sibling,
          position: index,
        });
      }
    });
  });

  return updates;
}

function assertNoCycle(allPages: Page[], pageId: string, targetParentId: string | null): void {
  if (!targetParentId) {
    return;
  }

  if (targetParentId === pageId) {
    throw new Error('A page cannot be moved into itself.');
  }

  const subtreeIds = new Set(collectSubtreeIds(allPages, pageId));
  if (subtreeIds.has(targetParentId)) {
    throw new Error('A page cannot be moved into one of its descendants.');
  }
}

function upsertMovedSiblings(
  siblings: Page[],
  movedPage: Page,
  targetPosition: number,
  updatedAt: string,
): Page[] {
  const withoutMoved = siblings.filter((sibling) => sibling.id !== movedPage.id);
  const clampedPosition = Math.max(0, Math.min(targetPosition, withoutMoved.length));
  withoutMoved.splice(clampedPosition, 0, movedPage);

  return withoutMoved.map((page, index) => {
    if (page.id === movedPage.id) {
      return {
        ...page,
        position: index,
        updatedAt,
      };
    }

    return {
      ...page,
      position: index,
    };
  });
}

export const pageRepository = {
  async listAllPages(): Promise<Page[]> {
    return db.pages.toArray();
  },

  async getPageById(id: string): Promise<Page | undefined> {
    return db.pages.get(id);
  },

  async ensureRootPage(): Promise<Page | null> {
    const count = await db.pages.count();
    if (count > 0) {
      return null;
    }

    return pageRepository.createPage({ parentId: null, title: 'Welcome' });
  },

  async createPage(input: CreatePageInput): Promise<Page> {
    const { parentId, title = DEFAULT_PAGE_TITLE } = input;

    return db.transaction('rw', db.pages, async () => {
      const siblings =
        parentId === null
          ? await db.pages.filter((page) => page.parentId === null).toArray()
          : await db.pages.where('parentId').equals(parentId).toArray();
      const position = siblings.length;
      const timestamp = nowIso();

      const page: Page = {
        id: nanoid(),
        parentId,
        title: title.trim() || DEFAULT_PAGE_TITLE,
        contentMd: '',
        position,
        imageIds: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await db.pages.add(page);
      return page;
    });
  },

  async renamePage(pageId: string, nextTitle: string): Promise<void> {
    const sanitizedTitle = nextTitle.trim() || DEFAULT_PAGE_TITLE;
    await db.pages.update(pageId, { title: sanitizedTitle, updatedAt: nowIso() });
  },

  async updatePageContent(pageId: string, contentMd: string): Promise<void> {
    const imageIds = extractLocalImageIds(contentMd);
    await db.pages.update(pageId, { contentMd, imageIds, updatedAt: nowIso() });
  },

  async movePage(pageId: string, targetParentId: string | null, targetPosition: number): Promise<void> {
    await db.transaction('rw', db.pages, async () => {
      const allPages = await db.pages.toArray();
      const page = allPages.find((item) => item.id === pageId);

      if (!page) {
        return;
      }

      assertNoCycle(allPages, page.id, targetParentId);
      const updatedAt = nowIso();

      if (page.parentId === targetParentId) {
        const siblings = getSiblingsByParentId(allPages, page.parentId);
        const reorderedSiblings = upsertMovedSiblings(
          siblings,
          { ...page, parentId: targetParentId },
          targetPosition,
          updatedAt,
        );
        await db.pages.bulkPut(reorderedSiblings);
        return;
      }

      const sourceSiblings = getSiblingsByParentId(allPages, page.parentId).filter(
        (sibling) => sibling.id !== pageId,
      );
      const normalizedSource = sourceSiblings.map((sibling, index) => ({
        ...sibling,
        position: index,
      }));

      const targetSiblings = getSiblingsByParentId(allPages, targetParentId);
      const reorderedTarget = upsertMovedSiblings(
        targetSiblings,
        { ...page, parentId: targetParentId },
        targetPosition,
        updatedAt,
      );

      const updatesById = new Map<string, Page>();
      [...normalizedSource, ...reorderedTarget].forEach((nextPage) => {
        updatesById.set(nextPage.id, nextPage);
      });

      await db.pages.bulkPut([...updatesById.values()]);
    });
  },

  async reorderSibling(pageId: string, targetPosition: number): Promise<void> {
    const page = await db.pages.get(pageId);
    if (!page) {
      return;
    }

    await pageRepository.movePage(pageId, page.parentId, targetPosition);
  },

  async deletePageSubtree(pageId: string): Promise<void> {
    await db.transaction('rw', db.pages, db.images, async () => {
      const allPages = await db.pages.toArray();
      const subtreeIds = new Set(collectSubtreeIds(allPages, pageId));
      if (!subtreeIds.size) {
        return;
      }

      const deletedPages = allPages.filter((page) => subtreeIds.has(page.id));
      const remainingPages = allPages.filter((page) => !subtreeIds.has(page.id));

      const deletedImageIds = new Set(deletedPages.flatMap((page) => page.imageIds));
      const remainingImageIds = new Set(remainingPages.flatMap((page) => page.imageIds));
      const orphanImageIds = [...deletedImageIds].filter((imageId) => !remainingImageIds.has(imageId));

      await db.pages.bulkDelete([...subtreeIds]);
      if (orphanImageIds.length) {
        await db.images.bulkDelete(orphanImageIds);
      }

      const normalizedUpdates = normalizeSiblingPositions(remainingPages);
      if (normalizedUpdates.length) {
        await db.pages.bulkPut(normalizedUpdates);
      }
    });
  },
};
