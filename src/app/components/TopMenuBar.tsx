import { useEffect, useRef, useState } from 'react';

export interface TopMenuActionItem {
  id: string;
  kind: 'action';
  label: string;
  shortcut?: string;
  onSelect: () => void;
  disabled?: boolean;
  checked?: boolean;
}

export interface TopMenuSeparatorItem {
  id: string;
  kind: 'separator';
}

export type TopMenuItem = TopMenuActionItem | TopMenuSeparatorItem;

export interface TopMenuDefinition {
  id: string;
  label: string;
  items: TopMenuItem[];
}

interface TopMenuBarProps {
  title: string;
  menus: TopMenuDefinition[];
}

export function TopMenuBar({ title, menus }: TopMenuBarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuId) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  return (
    <div className="top-menu-bar" ref={menuRef}>
      <h1 className="top-menu-title">{title}</h1>
      <nav className="top-menu-strip" aria-label="Main menu">
        {menus.map((menu) => {
          const isOpen = menu.id === openMenuId;

          return (
            <div
              key={menu.id}
              className="top-menu-entry"
              onMouseEnter={() => {
                if (openMenuId && openMenuId !== menu.id) {
                  setOpenMenuId(menu.id);
                }
              }}
            >
              <button
                type="button"
                className={`top-menu-trigger ${isOpen ? 'open' : ''}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpenMenuId(isOpen ? null : menu.id)}
              >
                {menu.label}
              </button>
              {isOpen ? (
                <div className="top-menu-dropdown" role="menu" aria-label={menu.label}>
                  {menu.items.map((item) =>
                    item.kind === 'separator' ? (
                      <div key={item.id} className="top-menu-separator" role="separator" />
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className="top-menu-action"
                        disabled={item.disabled}
                        onClick={() => {
                          if (item.disabled) {
                            return;
                          }

                          item.onSelect();
                          setOpenMenuId(null);
                        }}
                      >
                        <span className="top-menu-action-check">{item.checked ? '✓' : ''}</span>
                        <span className="top-menu-action-label">{item.label}</span>
                        <span className="top-menu-action-shortcut">{item.shortcut ?? ''}</span>
                      </button>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
