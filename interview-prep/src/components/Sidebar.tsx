import { Link } from 'react-router-dom';
import { stages } from '../data/curriculum';
import { allModules } from '../data/modules';
import { useProgress } from '../hooks/useProgress';
import './Sidebar.css';

interface SidebarProps {
  currentModuleId?: string;
  onClose?: () => void;
  isOpen?: boolean;
}

export function Sidebar({ currentModuleId, onClose, isOpen }: SidebarProps) {
  const { getModuleProgress } = useProgress();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo" onClick={onClose}>
          <span className="logo-icon">🎓</span>
          <span className="logo-text">SE Interview Prep</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        <Link to="/" className="nav-item" onClick={onClose}>
          🏠 Home
        </Link>
        <Link to="/dashboard" className="nav-item" onClick={onClose}>
          📊 Dashboard
        </Link>
        <Link to="/capstone" className="nav-item" onClick={onClose}>
          🚨 Capstone Project
        </Link>
        <Link to="/course" className="nav-item" onClick={onClose}>
          🎓 6-Month Course
        </Link>
        <Link to="/daily-plan" className="nav-item" onClick={onClose}>
          📅 Daily Plan
        </Link>
        <Link to="/paths" className="nav-item" onClick={onClose}>
          🗺️ Learning Paths
        </Link>
        <Link to="/flashcards" className="nav-item" onClick={onClose}>
          🃏 Flashcards
        </Link>
        <Link to="/videos" className="nav-item" onClick={onClose}>
          🎬 Video Library
        </Link>
        <Link to="/mock-interview" className="nav-item" onClick={onClose}>
          🎤 Mock Interview
        </Link>
        <Link to="/system-design-practice" className="nav-item" onClick={onClose}>
          🏗️ System Design
        </Link>
        <Link to="/search" className="nav-item" onClick={onClose}>
          🔍 Search
        </Link>

        {stages.map((stage) => (
          <div key={stage.id} className="nav-stage">
            <div className="nav-stage-title">
              Stage {stage.id}: {stage.title}
            </div>
            {stage.moduleIds.map((moduleId) => {
              const mod = allModules.find((m) => m.id === moduleId);
              if (!mod) return null;
              const progress = getModuleProgress(mod.id, mod.sections.length);
              return (
                <Link
                  key={mod.id}
                  to={`/module/${mod.id}`}
                  className={`nav-module ${currentModuleId === mod.id ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-module-icon">{mod.icon}</span>
                  <span className="nav-module-title">{mod.title}</span>
                  {progress > 0 && (
                    <span className="nav-module-progress">{progress}%</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
