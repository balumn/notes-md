import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  content: ReactNode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AppShell({ sidebar, toolbar, content, sidebarOpen, onToggleSidebar }: AppShellProps) {
  return (
    <div className="app-shell" data-sidebar-open={sidebarOpen}>
      <div
        className="app-sidebar-backdrop"
        role="button"
        tabIndex={-1}
        aria-label="Close sidebar"
        onClick={onToggleSidebar}
        onKeyDown={(e) => e.key === 'Enter' && onToggleSidebar()}
      />
      <aside className="app-sidebar">{sidebar}</aside>
      <main className="app-main">
        <header className="app-toolbar">{toolbar}</header>
        <section className="app-content">{content}</section>
      </main>
    </div>
  );
}
