import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import './Layout.css';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { moduleId } = useParams<{ moduleId: string }>();

  return (
    <div className="layout">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        currentModuleId={moduleId}
        onClose={() => setSidebarOpen(false)}
        isOpen={sidebarOpen}
      />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
