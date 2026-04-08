import { type ChangeEvent, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TopMenuBar, type TopMenuDefinition } from './components/TopMenuBar';
import { AppShell } from './layout/AppShell';
import type { Page, PageTreeNode as PageTreeNodeModel, ViewMode } from '../domain/models';
import { toggleTaskListItem } from '../domain/markdown';
import {
  MarkdownEditor,
  type MarkdownEditorCommand,
  type MarkdownEditorHandle,
} from '../features/editor/components/MarkdownEditor';
import { KeyboardShortcutsModal } from '../features/help/components/KeyboardShortcutsModal';
import { MarkdownToolbar } from '../features/editor/components/MarkdownToolbar';
import { MarkdownPreview } from '../features/editor/components/MarkdownPreview';
import { LiveMarkdownEditor } from '../features/editor/components/LiveMarkdownEditor';
import { PageTree } from '../features/pages/components/PageTree';
import { buildPageTree } from '../features/pages/tree/treeSelectors';
import {
  EDITOR_SHORTCUT_COMMANDS,
  SHORTCUTS,
  getMenuShortcutLabel,
  getShortcutPlatform,
  type ShortcutActionId,
  type ShortcutDefinition,
} from '../features/shortcuts/shortcutRegistry';
import { useGlobalShortcuts } from '../features/shortcuts/useGlobalShortcuts';
import { useNotesStore } from '../store/notesStore';
import { useUiStore } from '../store/uiStore';

interface SelectedPageEditorProps {
  page: Page;
  viewMode: ViewMode;
  monospaceMode: boolean;
  editorToolbarVisible: boolean;
  editorHandleRef: MutableRefObject<MarkdownEditorHandle | null>;
  imageUploadTriggerRef: MutableRefObject<(() => void) | null>;
  onRenamePage: (pageId: string, title: string) => Promise<void>;
  onUpdatePageContent: (pageId: string, contentMd: string) => Promise<void>;
  onStoreImageFiles: (files: File[]) => Promise<string[]>;
  onDraftContentChange: (contentMd: string) => void;
}

function SelectedPageEditor({
  page,
  viewMode,
  monospaceMode,
  editorToolbarVisible,
  editorHandleRef,
  imageUploadTriggerRef,
  onRenamePage,
  onUpdatePageContent,
  onStoreImageFiles,
  onDraftContentChange,
}: SelectedPageEditorProps) {
  const [draftTitle, setDraftTitle] = useState(page.title);
  const [draftContent, setDraftContent] = useState(page.contentMd);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleToolbarCommand = useCallback((command: MarkdownEditorCommand) => {
    editorHandleRef.current?.runCommand(command);
  }, [editorHandleRef]);

  const handleCheckboxToggle = useCallback(
    (itemIndex: number, _checked: boolean) => {
      const updated = toggleTaskListItem(draftContent, itemIndex);
      if (updated !== null) {
        setDraftContent(updated);
      }
    },
    [draftContent],
  );

  const openImageUploadPicker = useCallback(() => {
    imageUploadInputRef.current?.click();
  }, []);

  useEffect(() => {
    imageUploadTriggerRef.current = openImageUploadPicker;
    return () => {
      if (imageUploadTriggerRef.current === openImageUploadPicker) {
        imageUploadTriggerRef.current = null;
      }
    };
  }, [imageUploadTriggerRef, openImageUploadPicker]);

  const handleToolbarImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files ? Array.from(event.target.files) : [];
      if (!selectedFiles.length) {
        event.target.value = '';
        return;
      }

      const markdownEntries = await onStoreImageFiles(selectedFiles);
      if (markdownEntries.length) {
        editorHandleRef.current?.insertMarkdown(`\n${markdownEntries.join('\n')}\n`);
      }

      event.target.value = '';
    },
    [editorHandleRef, onStoreImageFiles],
  );

  useEffect(() => {
    if (draftContent === page.contentMd) {
      return;
    }

    const debounceHandle = window.setTimeout(() => {
      void onUpdatePageContent(page.id, draftContent);
    }, 250);

    return () => {
      window.clearTimeout(debounceHandle);
    };
  }, [draftContent, onUpdatePageContent, page.contentMd, page.id]);

  useEffect(() => {
    onDraftContentChange(draftContent);
  }, [draftContent, onDraftContentChange]);

  return (
    <>
      <div className="editor-header">
        <input
          value={draftTitle}
          className="page-title-input"
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={() => {
            if (draftTitle !== page.title) {
              void onRenamePage(page.id, draftTitle);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              (event.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
        <span className="timestamp">Updated {new Date(page.updatedAt).toLocaleString()}</span>
      </div>
      <input
        ref={imageUploadInputRef}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={(event) => {
          void handleToolbarImageUpload(event);
        }}
      />
      <div className={`editor-body mode-${viewMode}`}>
        {viewMode === 'edit' || viewMode === 'split' ? (
          <div className="editor-pane">
            {editorToolbarVisible ? (
              <div className="editor-pane-toolbar">
                <MarkdownToolbar onCommand={handleToolbarCommand} onUploadImage={openImageUploadPicker} />
              </div>
            ) : null}
            <MarkdownEditor
              ref={editorHandleRef}
              value={draftContent}
              onChange={setDraftContent}
              onImageFiles={onStoreImageFiles}
              monospaceMode={monospaceMode}
            />
          </div>
        ) : null}
        {viewMode === 'live' ? (
          <div className="live-pane">
            {editorToolbarVisible ? (
              <div className="editor-pane-toolbar">
                <MarkdownToolbar onCommand={handleToolbarCommand} onUploadImage={openImageUploadPicker} />
              </div>
            ) : null}
            <LiveMarkdownEditor ref={editorHandleRef} value={draftContent} onChange={setDraftContent} />
          </div>
        ) : null}
        {viewMode === 'preview' || viewMode === 'split' ? (
          <div className="preview-pane">
            <MarkdownPreview markdown={draftContent} onCheckboxToggle={handleCheckboxToggle} />
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function App() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const activeEditorRef = useRef<MarkdownEditorHandle | null>(null);
  const imageUploadShortcutTriggerRef = useRef<(() => void) | null>(null);
  const [isKeyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);
  const [selectedPageDraftContent, setSelectedPageDraftContent] = useState<string | null>(null);

  const {
    pages,
    isLoading,
    errorMessage,
    initializeWorkspace,
    createPage,
    renamePage,
    deletePage,
    movePageUp,
    movePageDown,
    indentPage,
    outdentPage,
    updatePageContent,
    storeImageFiles,
    exportWorkspaceJson,
    importWorkspaceJson,
    exportSelectedPagePdf,
    exportWorkspacePdf,
  } = useNotesStore();

  const selectedPageId = useUiStore((state) => state.selectedPageId);
  const selectPage = useUiStore((state) => state.selectPage);
  const expandedPageIds = useUiStore((state) => state.expandedPageIds);
  const setExpandedPageIds = useUiStore((state) => state.setExpandedPageIds);
  const toggleExpanded = useUiStore((state) => state.toggleExpanded);
  const ensureExpanded = useUiStore((state) => state.ensureExpanded);
  const viewMode = useUiStore((state) => state.viewMode);
  const setViewMode = useUiStore((state) => state.setViewMode);
  const monospaceMode = useUiStore((state) => state.monospaceMode);
  const toggleMonospaceMode = useUiStore((state) => state.toggleMonospaceMode);
  const editorToolbarVisible = useUiStore((state) => state.editorToolbarVisible);
  const toggleEditorToolbar = useUiStore((state) => state.toggleEditorToolbar);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );

  useEffect(() => {
    setSelectedPageDraftContent(selectedPage?.contentMd ?? null);
  }, [selectedPage]);

  const shortcutPlatform = useMemo(() => getShortcutPlatform(), []);

  const getMenuShortcut = useCallback(
    (menuItemId: string) => getMenuShortcutLabel(menuItemId, shortcutPlatform) ?? undefined,
    [shortcutPlatform],
  );

  const visiblePageIds = useMemo(() => {
    const expandedSet = new Set(expandedPageIds);
    const pageTree = buildPageTree(pages);
    const flattenedIds: string[] = [];

    const appendVisibleNode = (node: PageTreeNodeModel) => {
      flattenedIds.push(node.page.id);
      if (expandedSet.has(node.page.id)) {
        node.children.forEach((child) => appendVisibleNode(child));
      }
    };

    pageTree.forEach((node) => appendVisibleNode(node));
    return flattenedIds;
  }, [expandedPageIds, pages]);

  useEffect(() => {
    void initializeWorkspace();
  }, [initializeWorkspace]);

  const deletePageWithConfirmation = useCallback((pageId: string) => {
    if (window.confirm('Delete this page and all nested pages?')) {
      void deletePage(pageId);
    }
  }, [deletePage]);

  const handleCreateRootPage = useCallback(() => {
    void createPage(null);
  }, [createPage]);

  const handleCreateChildForSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    void createPage(selectedPage.id);
    return true;
  }, [createPage, selectedPage]);

  const handleRequestImportJson = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void importWorkspaceJson(file);
      }

      event.target.value = '';
    },
    [importWorkspaceJson],
  );

  const handleExportJson = useCallback(() => {
    void exportWorkspaceJson();
  }, [exportWorkspaceJson]);

  const handleExportSelectedPagePdf = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    const contentToExport = selectedPageDraftContent ?? selectedPage.contentMd;
    void exportSelectedPagePdf(selectedPage.id, contentToExport);
    return true;
  }, [exportSelectedPagePdf, selectedPage, selectedPageDraftContent]);

  const handleExportWorkspacePdf = useCallback(() => {
    void exportWorkspacePdf();
  }, [exportWorkspacePdf]);

  const handleRenameSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    const nextTitle = window.prompt('Rename page', selectedPage.title);
    if (nextTitle !== null) {
      void renamePage(selectedPage.id, nextTitle);
    }

    return true;
  }, [renamePage, selectedPage]);

  const handleDeleteSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    deletePageWithConfirmation(selectedPage.id);
    return true;
  }, [deletePageWithConfirmation, selectedPage]);

  const handleMoveSelectedPageUp = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    void movePageUp(selectedPage.id);
    return true;
  }, [movePageUp, selectedPage]);

  const handleMoveSelectedPageDown = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    void movePageDown(selectedPage.id);
    return true;
  }, [movePageDown, selectedPage]);

  const handleIndentSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    void indentPage(selectedPage.id);
    return true;
  }, [indentPage, selectedPage]);

  const handleOutdentSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    void outdentPage(selectedPage.id);
    return true;
  }, [outdentPage, selectedPage]);

  const handleSelectPreviousVisiblePage = useCallback((): boolean => {
    if (!visiblePageIds.length) {
      return false;
    }

    if (!selectedPageId) {
      selectPage(visiblePageIds[0]);
      return true;
    }

    const currentIndex = visiblePageIds.indexOf(selectedPageId);
    if (currentIndex <= 0) {
      selectPage(visiblePageIds[0]);
      return true;
    }

    selectPage(visiblePageIds[currentIndex - 1]);
    return true;
  }, [selectedPageId, selectPage, visiblePageIds]);

  const handleSelectNextVisiblePage = useCallback((): boolean => {
    if (!visiblePageIds.length) {
      return false;
    }

    if (!selectedPageId) {
      selectPage(visiblePageIds[0]);
      return true;
    }

    const currentIndex = visiblePageIds.indexOf(selectedPageId);
    if (currentIndex === -1 || currentIndex >= visiblePageIds.length - 1) {
      selectPage(visiblePageIds[visiblePageIds.length - 1]);
      return true;
    }

    selectPage(visiblePageIds[currentIndex + 1]);
    return true;
  }, [selectedPageId, selectPage, visiblePageIds]);

  const handleExpandSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    ensureExpanded(selectedPage.id);
    return true;
  }, [ensureExpanded, selectedPage]);

  const handleCollapseSelectedPage = useCallback((): boolean => {
    if (!selectedPage) {
      return false;
    }

    setExpandedPageIds(expandedPageIds.filter((id) => id !== selectedPage.id));
    return true;
  }, [expandedPageIds, selectedPage, setExpandedPageIds]);

  const handleSwitchToEditView = useCallback(() => {
    setViewMode('edit');
  }, [setViewMode]);

  const handleSwitchToLiveView = useCallback(() => {
    setViewMode('live');
  }, [setViewMode]);

  const handleSwitchToSplitView = useCallback(() => {
    setViewMode('split');
  }, [setViewMode]);

  const handleSwitchToPreviewView = useCallback(() => {
    setViewMode('preview');
  }, [setViewMode]);

  const handleToggleMonospaceMode = useCallback(() => {
    toggleMonospaceMode();
  }, [toggleMonospaceMode]);

  const handleToggleEditorToolbar = useCallback(() => {
    toggleEditorToolbar();
  }, [toggleEditorToolbar]);

  const handleExpandAllPages = useCallback(() => {
    setExpandedPageIds(pages.map((page) => page.id));
  }, [pages, setExpandedPageIds]);

  const handleCollapseAllPages = useCallback(() => {
    setExpandedPageIds([]);
  }, [setExpandedPageIds]);

  const handleShowAbout = useCallback((): boolean => {
    window.alert('Notes \nUse File, Edit, and View menus for actions.');
    return true;
  }, []);

  const handleOpenKeyboardShortcuts = useCallback((): boolean => {
    setKeyboardShortcutsOpen(true);
    return true;
  }, []);

  const handleSelectPage = useCallback(
    (pageId: string) => {
      selectPage(pageId);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
    [selectPage, setSidebarOpen],
  );

  const handleCloseKeyboardShortcuts = useCallback(() => {
    setKeyboardShortcutsOpen(false);
  }, []);

  const runEditorCommand = useCallback(
    (command: MarkdownEditorCommand): boolean => activeEditorRef.current?.runCommand(command) ?? false,
    [],
  );

  const handleShortcutImageUpload = useCallback((): boolean => {
    if (!activeEditorRef.current || !imageUploadShortcutTriggerRef.current) {
      return false;
    }

    imageUploadShortcutTriggerRef.current();
    return true;
  }, []);

  const executeShortcutAction = useCallback(
    (actionId: ShortcutActionId): boolean => {
      const editorCommand = EDITOR_SHORTCUT_COMMANDS[actionId];
      if (editorCommand) {
        return runEditorCommand(editorCommand);
      }

      switch (actionId) {
        case 'file.newPage':
          handleCreateRootPage();
          return true;
        case 'file.importJson':
          handleRequestImportJson();
          return true;
        case 'file.exportJson':
          handleExportJson();
          return true;
        case 'file.exportPagePdf':
          return handleExportSelectedPagePdf();
        case 'file.exportWorkspacePdf':
          handleExportWorkspacePdf();
          return true;
        case 'edit.renamePage':
          return handleRenameSelectedPage();
        case 'edit.deletePage':
          return handleDeleteSelectedPage();
        case 'edit.moveUp':
          return handleMoveSelectedPageUp();
        case 'edit.moveDown':
          return handleMoveSelectedPageDown();
        case 'edit.indent':
          return handleIndentSelectedPage();
        case 'edit.outdent':
          return handleOutdentSelectedPage();
        case 'view.modeEdit':
          handleSwitchToEditView();
          return true;
        case 'view.modeLive':
          handleSwitchToLiveView();
          return true;
        case 'view.modeSplit':
          handleSwitchToSplitView();
          return true;
        case 'view.modePreview':
          handleSwitchToPreviewView();
          return true;
        case 'view.toggleMonospace':
          handleToggleMonospaceMode();
          return true;
        case 'view.toggleEditorToolbar':
          handleToggleEditorToolbar();
          return true;
        case 'view.expandAll':
          handleExpandAllPages();
          return true;
        case 'view.collapseAll':
          handleCollapseAllPages();
          return true;
        case 'help.about':
          return handleShowAbout();
        case 'help.keyboardShortcuts':
          return handleOpenKeyboardShortcuts();
        case 'tree.createChild':
          return handleCreateChildForSelectedPage();
        case 'tree.selectPrevious':
          return handleSelectPreviousVisiblePage();
        case 'tree.selectNext':
          return handleSelectNextVisiblePage();
        case 'tree.expandSelected':
          return handleExpandSelectedPage();
        case 'tree.collapseSelected':
          return handleCollapseSelectedPage();
        case 'editor.uploadImage':
          return handleShortcutImageUpload();
        default:
          return false;
      }
    },
    [
      handleCollapseAllPages,
      handleCollapseSelectedPage,
      handleCreateChildForSelectedPage,
      handleCreateRootPage,
      handleDeleteSelectedPage,
      handleExpandAllPages,
      handleExpandSelectedPage,
      handleExportJson,
      handleExportSelectedPagePdf,
      handleExportWorkspacePdf,
      handleIndentSelectedPage,
      handleMoveSelectedPageDown,
      handleMoveSelectedPageUp,
      handleOpenKeyboardShortcuts,
      handleOutdentSelectedPage,
      handleRenameSelectedPage,
      handleRequestImportJson,
      handleSelectNextVisiblePage,
      handleSelectPreviousVisiblePage,
      handleShortcutImageUpload,
      handleShowAbout,
      handleSwitchToEditView,
      handleSwitchToLiveView,
      handleSwitchToPreviewView,
      handleSwitchToSplitView,
      handleToggleEditorToolbar,
      handleToggleMonospaceMode,
      runEditorCommand,
    ],
  );

  const isShortcutEnabled = useCallback(
    (shortcut: ShortcutDefinition): boolean => {
      if (shortcut.requiresSelectedPage && !selectedPage) {
        return false;
      }

      if (shortcut.actionId === 'editor.uploadImage') {
        return Boolean(activeEditorRef.current && imageUploadShortcutTriggerRef.current);
      }

      if (shortcut.scope === 'editor') {
        return Boolean(activeEditorRef.current);
      }

      return true;
    },
    [selectedPage],
  );

  useGlobalShortcuts({
    shortcuts: SHORTCUTS,
    onAction: executeShortcutAction,
    isActionEnabled: isShortcutEnabled,
  });

  const menus: TopMenuDefinition[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          id: 'file-new-page',
          kind: 'action',
          label: 'New page',
          shortcut: getMenuShortcut('file-new-page'),
          onSelect: handleCreateRootPage,
        },
        {
          id: 'file-import-json',
          kind: 'action',
          label: 'Import JSON',
          shortcut: getMenuShortcut('file-import-json'),
          onSelect: handleRequestImportJson,
        },
        {
          id: 'file-export-json',
          kind: 'action',
          label: 'Export JSON',
          shortcut: getMenuShortcut('file-export-json'),
          onSelect: handleExportJson,
        },
        { id: 'file-separator-1', kind: 'separator' },
        {
          id: 'file-export-page-pdf',
          kind: 'action',
          label: 'Export page PDF',
          shortcut: getMenuShortcut('file-export-page-pdf'),
          disabled: !selectedPage,
          onSelect: () => {
            handleExportSelectedPagePdf();
          },
        },
        {
          id: 'file-export-workspace-pdf',
          kind: 'action',
          label: 'Export workspace PDF',
          shortcut: getMenuShortcut('file-export-workspace-pdf'),
          onSelect: handleExportWorkspacePdf,
        },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      items: [
        {
          id: 'edit-rename-page',
          kind: 'action',
          label: 'Rename page',
          shortcut: getMenuShortcut('edit-rename-page'),
          disabled: !selectedPage,
          onSelect: () => {
            handleRenameSelectedPage();
          },
        },
        {
          id: 'edit-delete-page',
          kind: 'action',
          label: 'Delete page',
          shortcut: getMenuShortcut('edit-delete-page'),
          disabled: !selectedPage,
          onSelect: () => {
            handleDeleteSelectedPage();
          },
        },
        { id: 'edit-separator-1', kind: 'separator' },
        {
          id: 'edit-move-up',
          kind: 'action',
          label: 'Move up',
          shortcut: getMenuShortcut('edit-move-up'),
          disabled: !selectedPage,
          onSelect: () => {
            handleMoveSelectedPageUp();
          },
        },
        {
          id: 'edit-move-down',
          kind: 'action',
          label: 'Move down',
          shortcut: getMenuShortcut('edit-move-down'),
          disabled: !selectedPage,
          onSelect: () => {
            handleMoveSelectedPageDown();
          },
        },
        {
          id: 'edit-indent',
          kind: 'action',
          label: 'Indent',
          shortcut: getMenuShortcut('edit-indent'),
          disabled: !selectedPage,
          onSelect: () => {
            handleIndentSelectedPage();
          },
        },
        {
          id: 'edit-outdent',
          kind: 'action',
          label: 'Outdent',
          shortcut: getMenuShortcut('edit-outdent'),
          disabled: !selectedPage,
          onSelect: () => {
            handleOutdentSelectedPage();
          },
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          id: 'view-edit',
          kind: 'action',
          label: 'Edit',
          shortcut: getMenuShortcut('view-edit'),
          checked: viewMode === 'edit',
          onSelect: handleSwitchToEditView,
        },
        {
          id: 'view-live',
          kind: 'action',
          label: 'Live',
          shortcut: getMenuShortcut('view-live'),
          checked: viewMode === 'live',
          onSelect: handleSwitchToLiveView,
        },
        {
          id: 'view-split',
          kind: 'action',
          label: 'Split',
          shortcut: getMenuShortcut('view-split'),
          checked: viewMode === 'split',
          onSelect: handleSwitchToSplitView,
        },
        {
          id: 'view-preview',
          kind: 'action',
          label: 'Preview',
          shortcut: getMenuShortcut('view-preview'),
          checked: viewMode === 'preview',
          onSelect: handleSwitchToPreviewView,
        },
        {
          id: 'view-monospace',
          kind: 'action',
          label: 'Monospace',
          shortcut: getMenuShortcut('view-monospace'),
          checked: monospaceMode,
          onSelect: handleToggleMonospaceMode,
        },
        {
          id: 'view-editor-toolbar',
          kind: 'action',
          label: 'Editor toolbar',
          shortcut: getMenuShortcut('view-editor-toolbar'),
          checked: editorToolbarVisible,
          onSelect: handleToggleEditorToolbar,
        },
        { id: 'view-separator-1', kind: 'separator' },
        {
          id: 'view-expand-all',
          kind: 'action',
          label: 'Expand all',
          shortcut: getMenuShortcut('view-expand-all'),
          onSelect: handleExpandAllPages,
        },
        {
          id: 'view-collapse-all',
          kind: 'action',
          label: 'Collapse all',
          shortcut: getMenuShortcut('view-collapse-all'),
          onSelect: handleCollapseAllPages,
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          id: 'help-about',
          kind: 'action',
          label: 'About',
          shortcut: getMenuShortcut('help-about'),
          onSelect: () => {
            handleShowAbout();
          },
        },
        {
          id: 'help-keyboard-shortcuts',
          kind: 'action',
          label: 'Keyboard shortcuts',
          shortcut: getMenuShortcut('help-keyboard-shortcuts'),
          onSelect: () => {
            handleOpenKeyboardShortcuts();
          },
        },
      ],
    },
  ];

  const sidebar = (
    <PageTree
      pages={pages}
      selectedPageId={selectedPageId}
      expandedPageIds={expandedPageIds}
      onSelect={handleSelectPage}
      onToggleExpand={toggleExpanded}
      onCreateChild={(parentId) => {
        void createPage(parentId);
      }}
      onRename={(pageId, title) => {
        void renamePage(pageId, title);
      }}
      onDelete={deletePageWithConfirmation}
      onMoveUp={(pageId) => {
        void movePageUp(pageId);
      }}
      onMoveDown={(pageId) => {
        void movePageDown(pageId);
      }}
      onIndent={(pageId) => {
        void indentPage(pageId);
      }}
      onOutdent={(pageId) => {
        void outdentPage(pageId);
      }}
    />
  );

  const toolbar = (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Toggle sidebar"
        aria-expanded={sidebarOpen}
        onClick={toggleSidebar}
      >
        <svg
          className="sidebar-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <TopMenuBar title="Notes" menus={menus} />
      <input
        ref={importInputRef}
        type="file"
        hidden
        accept="application/json"
        onChange={handleImportInputChange}
      />
    </>
  );

  const content = (
    <section className="editor-panel">
      {isLoading ? (
        <p className="status-message">Loading workspace...</p>
      ) : null}
      {errorMessage ? <p className="status-message error">{errorMessage}</p> : null}
      {!selectedPage ? (
        <p className="status-message">Select or create a page to start writing.</p>
      ) : (
        <SelectedPageEditor
          key={selectedPage.id}
          page={selectedPage}
          viewMode={viewMode}
          monospaceMode={monospaceMode}
          editorToolbarVisible={editorToolbarVisible}
          editorHandleRef={activeEditorRef}
          imageUploadTriggerRef={imageUploadShortcutTriggerRef}
          onRenamePage={renamePage}
          onUpdatePageContent={updatePageContent}
          onStoreImageFiles={storeImageFiles}
          onDraftContentChange={setSelectedPageDraftContent}
        />
      )}
    </section>
  );

  return (
    <>
      <AppShell
        sidebar={sidebar}
        toolbar={toolbar}
        content={content}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      <KeyboardShortcutsModal isOpen={isKeyboardShortcutsOpen} onClose={handleCloseKeyboardShortcuts} />
    </>
  );
}
