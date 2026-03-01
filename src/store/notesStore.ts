import { create } from 'zustand';

import { buildLocalImageMarkdown, extractLocalImageIds } from '../domain/markdown';
import type { MoveOperation, Page } from '../domain/models';
import {
  getIndentOperation,
  getMoveDownOperation,
  getMoveUpOperation,
  getOutdentOperation,
} from '../features/pages/tree/treeMutations';
import { imageRepository } from '../lib/db/repositories/imageRepository';
import { pageRepository } from '../lib/db/repositories/pageRepository';
import { workspaceRepository } from '../lib/db/repositories/workspaceRepository';
import { useUiStore } from './uiStore';

interface NotesState {
  pages: Page[];
  isLoading: boolean;
  isMutating: boolean;
  errorMessage: string | null;
  initializeWorkspace: () => Promise<void>;
  refreshPages: () => Promise<void>;
  createPage: (parentId: string | null) => Promise<void>;
  renamePage: (pageId: string, title: string) => Promise<void>;
  deletePage: (pageId: string) => Promise<void>;
  movePageTo: (pageId: string, targetParentId: string | null, targetPosition: number) => Promise<void>;
  movePageUp: (pageId: string) => Promise<void>;
  movePageDown: (pageId: string) => Promise<void>;
  indentPage: (pageId: string) => Promise<void>;
  outdentPage: (pageId: string) => Promise<void>;
  updatePageContent: (pageId: string, contentMd: string) => Promise<void>;
  storeImageFiles: (files: File[]) => Promise<string[]>;
  exportWorkspaceJson: () => Promise<void>;
  importWorkspaceJson: (file: File) => Promise<void>;
  exportSelectedPagePdf: (pageId: string, contentMdOverride?: string) => Promise<void>;
  exportWorkspacePdf: () => Promise<void>;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error.';
}

function sortPages(pages: Page[]): Page[] {
  return [...pages].sort((a, b) => {
    if (a.parentId === b.parentId) {
      return a.position - b.position;
    }

    if (a.parentId === null) {
      return -1;
    }

    if (b.parentId === null) {
      return 1;
    }

    return a.parentId.localeCompare(b.parentId);
  });
}

function getFallbackSelectedPageId(pages: Page[]): string | null {
  if (!pages.length) {
    return null;
  }

  const rootPages = pages
    .filter((page) => page.parentId === null)
    .sort((left, right) => left.position - right.position);

  return rootPages[0]?.id ?? pages[0].id;
}

async function moveUsingOperation(
  pageId: string,
  operation: MoveOperation | null,
  refreshPages: () => Promise<void>,
): Promise<void> {
  if (!operation) {
    return;
  }

  await pageRepository.movePage(pageId, operation.targetParentId, operation.targetPosition);
  await refreshPages();

  if (operation.targetParentId) {
    useUiStore.getState().ensureExpanded(operation.targetParentId);
  }
}

export const useNotesStore = create<NotesState>((set, get) => ({
  pages: [],
  isLoading: false,
  isMutating: false,
  errorMessage: null,

  initializeWorkspace: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const { createdNow } = await workspaceRepository.ensureMetaWithStatus();
      const firstPage = await pageRepository.ensureRootPage();
      const pages = sortPages(await pageRepository.listAllPages());
      await workspaceRepository.syncRootOrderFromPages(pages);

      set({ pages, isLoading: false });

      const uiStore = useUiStore.getState();
      uiStore.bootstrapViewMode(createdNow ? 'live' : 'split');
      if (!uiStore.selectedPageId) {
        uiStore.selectPage(getFallbackSelectedPageId(pages));
      }

      if (firstPage) {
        uiStore.ensureExpanded(firstPage.id);
      }

      const referencedImageIds = new Set(pages.flatMap((page) => page.imageIds));
      imageRepository.syncObjectUrlCache(referencedImageIds);
    } catch (error) {
      set({ isLoading: false, errorMessage: toErrorMessage(error) });
    }
  },

  refreshPages: async () => {
    const pages = sortPages(await pageRepository.listAllPages());
    set({ pages });

    await workspaceRepository.syncRootOrderFromPages(pages);

    const uiStore = useUiStore.getState();
    const hasSelectedPage = pages.some((page) => page.id === uiStore.selectedPageId);
    if (!hasSelectedPage) {
      uiStore.selectPage(getFallbackSelectedPageId(pages));
    }

    const referencedImageIds = new Set(pages.flatMap((page) => page.imageIds));
    imageRepository.syncObjectUrlCache(referencedImageIds);
  },

  createPage: async (parentId) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const newPage = await pageRepository.createPage({ parentId });
      await get().refreshPages();

      const uiStore = useUiStore.getState();
      uiStore.selectPage(newPage.id);
      if (parentId) {
        uiStore.ensureExpanded(parentId);
      }
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  renamePage: async (pageId, title) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await pageRepository.renamePage(pageId, title);
      await get().refreshPages();
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  deletePage: async (pageId) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await pageRepository.deletePageSubtree(pageId);

      const remainingPages = await pageRepository.listAllPages();
      if (!remainingPages.length) {
        await pageRepository.ensureRootPage();
      }

      await get().refreshPages();
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  movePageTo: async (pageId, targetParentId, targetPosition) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await pageRepository.movePage(pageId, targetParentId, targetPosition);
      await get().refreshPages();
      if (targetParentId) {
        useUiStore.getState().ensureExpanded(targetParentId);
      }
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  movePageUp: async (pageId) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await moveUsingOperation(pageId, getMoveUpOperation(get().pages, pageId), get().refreshPages);
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  movePageDown: async (pageId) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await moveUsingOperation(pageId, getMoveDownOperation(get().pages, pageId), get().refreshPages);
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  indentPage: async (pageId) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await moveUsingOperation(pageId, getIndentOperation(get().pages, pageId), get().refreshPages);
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  outdentPage: async (pageId) => {
    set({ isMutating: true, errorMessage: null });
    try {
      await moveUsingOperation(pageId, getOutdentOperation(get().pages, pageId), get().refreshPages);
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  updatePageContent: async (pageId, contentMd) => {
    const updatedAt = new Date().toISOString();
    const imageIds = extractLocalImageIds(contentMd);

    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              contentMd,
              imageIds,
              updatedAt,
            }
          : page,
      ),
    }));

    try {
      await pageRepository.updatePageContent(pageId, contentMd);
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
      await get().refreshPages();
    }
  },

  storeImageFiles: async (files) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (!imageFiles.length) {
      return [];
    }

    const markdownEntries: string[] = [];
    for (const [index, imageFile] of imageFiles.entries()) {
      const image = await imageRepository.saveImageBlob(imageFile);
      const fallbackAlt = `image-${index + 1}`;
      const fileNameWithoutExtension = imageFile.name.replace(/\.[^.]+$/, '').trim();
      const altText = fileNameWithoutExtension || fallbackAlt;
      markdownEntries.push(buildLocalImageMarkdown(image.id, altText));
    }

    return markdownEntries;
  },

  exportWorkspaceJson: async () => {
    set({ errorMessage: null });
    try {
      const { exportWorkspaceAsJsonFile } = await import(
        '../features/import-export/importExportService'
      );
      await exportWorkspaceAsJsonFile();
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    }
  },

  importWorkspaceJson: async (file) => {
    set({ isMutating: true, errorMessage: null });
    try {
      const { importWorkspaceFromJsonFile } = await import(
        '../features/import-export/importExportService'
      );
      await importWorkspaceFromJsonFile(file);
      await get().refreshPages();
      useUiStore.getState().selectPage(getFallbackSelectedPageId(get().pages));
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    } finally {
      set({ isMutating: false });
    }
  },

  exportSelectedPagePdf: async (pageId, contentMdOverride) => {
    set({ errorMessage: null });
    try {
      const page = get().pages.find((item) => item.id === pageId);
      if (!page) {
        return;
      }

      const { exportPageAsPdf } = await import('../features/pdf/pdfExportService');
      await exportPageAsPdf({
        ...page,
        contentMd: contentMdOverride ?? page.contentMd,
      });
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    }
  },

  exportWorkspacePdf: async () => {
    set({ errorMessage: null });
    try {
      const { exportWorkspaceAsPdf } = await import('../features/pdf/pdfExportService');
      await exportWorkspaceAsPdf(get().pages);
    } catch (error) {
      set({ errorMessage: toErrorMessage(error) });
    }
  },
}));
