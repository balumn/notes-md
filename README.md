# Notes MD

A local-first markdown notes app with a hierarchical page tree. Write, organize, and export your notes—all stored in your browser.

## Features

### Markdown Editor
- **Multiple view modes**: Edit (raw markdown), Preview (rendered), Split (side-by-side), and Live (WYSIWYG with Lexical)
- **Rich formatting toolbar**: Bold, italic, strikethrough, underline, headings, lists, blockquotes, code blocks, links, tables
- **Monospace toggle**: Switch between proportional and monospace fonts in edit mode
- **Code blocks**: Syntax highlighting (highlight.js) with copy-to-clipboard
- **GFM support**: GitHub Flavored Markdown including tables, task lists, and strikethrough

### Images
- **Paste & drop**: Paste images from clipboard or drag-and-drop into the editor
- **Upload**: Insert images via toolbar button or keyboard shortcut
- **Local storage**: Images stored in IndexedDB alongside your notes

### Page Tree
- **Hierarchical organization**: Create nested pages with parent-child relationships
- **Inline editing**: Rename pages directly in the tree
- **Reordering**: Move pages up/down, indent (nest), and outdent
- **Expand/collapse**: Navigate large trees with expand-all and collapse-all
- **Context menu actions**: Create child, rename, delete, move from the tree

### Import & Export
- **JSON backup**: Export full workspace (pages + images) as a single JSON file
- **Import**: Restore from a previously exported JSON backup
- **PDF export**: Export current page or entire workspace to PDF

### Keyboard Shortcuts
- **File**: New page, import, export, PDF (Cmd/Ctrl+Opt+N, I, J, P)
- **Edit**: Rename, delete, move, indent, outdent
- **View**: Switch modes (Edit/Live/Split/Preview), monospace, toolbar toggle, expand/collapse
- **Page tree**: Select previous/next page, expand/collapse selected, create child
- **Editor**: Standard formatting (bold, italic, undo, redo, etc.)
- **Help modal**: View all shortcuts (Cmd/Ctrl+Opt+/)

### Technical
- **Offline-first**: Data stored in IndexedDB via Dexie
- **PWA-ready**: Built with Vite PWA plugin for installable app support
- **No backend**: Everything runs in the browser

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## Tech Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Lexical** – rich text / live markdown editing
- **CodeMirror** – raw markdown editing
- **Dexie** – IndexedDB wrapper
- **Zustand** – state management
- **react-markdown** + **remark-gfm** + **rehype-highlight** – markdown rendering
- **html2pdf.js** – PDF export

## Project Structure

```
src/
├── app/              # App shell, layout, menu bar
├── domain/           # Models, constants, markdown utilities
├── features/
│   ├── editor/       # Markdown editor, toolbar, preview, live editor
│   ├── help/         # Keyboard shortcuts modal
│   ├── import-export/# JSON and PDF export/import
│   ├── pages/        # Page tree components
│   ├── pdf/          # PDF export service
│   └── shortcuts/    # Global shortcut handling
├── lib/db/           # Dexie schema, repositories
└── store/            # Zustand stores (notes, UI)
```
