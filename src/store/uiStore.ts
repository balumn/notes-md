import { create } from 'zustand';

import type { ViewMode } from '../domain/models';

const VIEW_MODE_STORAGE_KEY = 'notes-md:view-mode';
const SIDEBAR_OPEN_STORAGE_KEY = 'notes-md:sidebar-open';
const VALID_VIEW_MODES: ViewMode[] = ['edit', 'preview', 'split', 'live'];

function readPersistedViewMode(): ViewMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (!storedValue) {
      return null;
    }

    return VALID_VIEW_MODES.includes(storedValue as ViewMode) ? (storedValue as ViewMode) : null;
  } catch {
    return null;
  }
}

function persistViewMode(viewMode: ViewMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  } catch {
    // Ignore storage failures and keep using in-memory state.
  }
}

const persistedViewMode = readPersistedViewMode();

function readPersistedSidebarOpen(): boolean | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (stored === null) return null;
    return stored === 'true';
  } catch {
    return null;
  }
}

function persistSidebarOpen(open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(open));
  } catch {
    /* ignore */
  }
}

const persistedSidebarOpen = readPersistedSidebarOpen();

interface UIState {
  selectedPageId: string | null;
  expandedPageIds: string[];
  viewMode: ViewMode;
  monospaceMode: boolean;
  editorToolbarVisible: boolean;
  sidebarOpen: boolean;
  hasBootstrappedViewMode: boolean;
  selectPage: (pageId: string | null) => void;
  toggleExpanded: (pageId: string) => void;
  ensureExpanded: (pageId: string) => void;
  setExpandedPageIds: (pageIds: string[]) => void;
  setViewMode: (mode: ViewMode) => void;
  bootstrapViewMode: (defaultMode: ViewMode) => void;
  toggleMonospaceMode: () => void;
  toggleEditorToolbar: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UIState>((set) => ({
  selectedPageId: null,
  expandedPageIds: [],
  viewMode: persistedViewMode ?? 'split',
  monospaceMode: true,
  editorToolbarVisible: true,
  sidebarOpen: persistedSidebarOpen ?? true,
  hasBootstrappedViewMode: false,
  selectPage: (pageId) => set({ selectedPageId: pageId }),
  toggleExpanded: (pageId) =>
    set((state) => {
      const isExpanded = state.expandedPageIds.includes(pageId);
      return {
        expandedPageIds: isExpanded
          ? state.expandedPageIds.filter((id) => id !== pageId)
          : [...state.expandedPageIds, pageId],
      };
    }),
  ensureExpanded: (pageId) =>
    set((state) => {
      if (state.expandedPageIds.includes(pageId)) {
        return state;
      }

      return { expandedPageIds: [...state.expandedPageIds, pageId] };
    }),
  setExpandedPageIds: (pageIds) => set({ expandedPageIds: pageIds }),
  setViewMode: (mode) => {
    persistViewMode(mode);
    set({ viewMode: mode, hasBootstrappedViewMode: true });
  },
  bootstrapViewMode: (defaultMode) =>
    set((state) => {
      if (state.hasBootstrappedViewMode) {
        return state;
      }

      const nextViewMode = persistedViewMode ?? defaultMode;
      if (!persistedViewMode) {
        persistViewMode(nextViewMode);
      }

      return {
        viewMode: nextViewMode,
        hasBootstrappedViewMode: true,
      };
    }),
  toggleMonospaceMode: () => set((state) => ({ monospaceMode: !state.monospaceMode })),
  toggleEditorToolbar: () => set((state) => ({ editorToolbarVisible: !state.editorToolbarVisible })),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen;
      persistSidebarOpen(next);
      return { sidebarOpen: next };
    }),
  setSidebarOpen: (open) => {
    persistSidebarOpen(open);
    set({ sidebarOpen: open });
  },
}));
