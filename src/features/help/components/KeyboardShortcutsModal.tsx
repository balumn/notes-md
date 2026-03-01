import { useEffect, useMemo } from 'react';

import { SHORTCUTS, type ShortcutCategory, type ShortcutDefinition } from '../../shortcuts/shortcutRegistry';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER: ShortcutCategory[] = ['File', 'Edit', 'View', 'Page Tree', 'Editor', 'Help'];

function getWhenLabel(shortcut: ShortcutDefinition): string {
  if (shortcut.note) {
    return shortcut.note;
  }

  if (shortcut.scope === 'editor') {
    return 'Editor focus required.';
  }

  if (shortcut.requiresSelectedPage) {
    return 'Selected page required.';
  }

  if (shortcut.scope === 'nonEditable') {
    return 'Works outside text fields.';
  }

  return 'Available globally.';
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const groupedShortcuts = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        shortcuts: SHORTCUTS.filter((shortcut) => shortcut.category === category),
      })).filter((group) => group.shortcuts.length > 0),
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="shortcut-modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="shortcut-modal" role="dialog" aria-modal="true" aria-labelledby="keyboard-shortcuts-title">
        <header className="shortcut-modal-header">
          <div>
            <h2 id="keyboard-shortcuts-title">Keyboard Shortcuts</h2>
            <p>Complete shortcuts reference for app actions and editor commands.</p>
          </div>
          <button type="button" className="shortcut-modal-close" onClick={onClose} aria-label="Close shortcuts">
            Close
          </button>
        </header>

        <div className="shortcut-modal-content">
          {groupedShortcuts.map((group) => (
            <section key={group.category} className="shortcut-category">
              <h3>{group.category}</h3>
              <div className="shortcut-table" role="table" aria-label={`${group.category} shortcuts`}>
                <div className="shortcut-table-row header" role="row">
                  <span role="columnheader">Action</span>
                  <span role="columnheader">macOS</span>
                  <span role="columnheader">Windows/Linux</span>
                  <span role="columnheader">When</span>
                </div>
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.id} className="shortcut-table-row" role="row">
                    <span role="cell">{shortcut.label}</span>
                    <span role="cell">{shortcut.macLabel}</span>
                    <span role="cell">{shortcut.windowsLinuxLabel}</span>
                    <span role="cell">{getWhenLabel(shortcut)}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="shortcut-modal-footer">
          <p>Notes:</p>
          <ul>
            <li>Page actions marked as selected page required are disabled until a page is selected.</li>
            <li>Non-editor shortcuts do not run while typing in text inputs or editable fields.</li>
            <li>Some browser-reserved key combinations are intentionally not used.</li>
          </ul>
        </footer>
      </section>
    </div>
  );
}
