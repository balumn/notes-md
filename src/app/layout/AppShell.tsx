import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  content: ReactNode;
}

export function AppShell({ sidebar, toolbar, content }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">{sidebar}</aside>
      <main className="app-main">
        <header className="app-toolbar">{toolbar}</header>
        <section className="app-content">{content}</section>
      </main>
    </div>
  );
}
