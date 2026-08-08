import { Link } from 'react-router-dom';
import { learningPaths } from '../data/learning-paths';
import { getModule } from '../data/modules';
import './LearningPaths.css';

export function LearningPaths() {
  return (
    <div className="learning-paths">
      <h1>🗺️ Learning Paths</h1>
      <p className="paths-intro">
        Choose a structured path based on your target role. Each path has weekly milestones
        to keep you on track. Don't try to learn everything at once.
      </p>

      {learningPaths.map((path) => (
        <div key={path.id} id={path.id} className="path-detail">
          <div className="path-detail-header">
            <h2>{path.title}</h2>
            <div className="path-detail-meta">
              <span>🎯 {path.targetRole}</span>
              <span>⏱️ {path.duration}</span>
              <span>📚 {path.moduleIds.length} modules</span>
            </div>
          </div>
          <p className="path-detail-desc">{path.description}</p>

          <h3>Weekly Milestones</h3>
          <div className="milestones">
            {path.milestones.map((milestone) => (
              <div key={milestone.week} className="milestone">
                <div className="milestone-week">Week {milestone.week}</div>
                <div className="milestone-content">
                  <strong>{milestone.title}</strong>
                  <div className="milestone-modules">
                    {milestone.modules.map((modId) => {
                      const mod = getModule(modId);
                      if (!mod) return null;
                      return (
                        <Link key={modId} to={`/module/${modId}`} className="milestone-module">
                          {mod.icon} {mod.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h3>All Modules in This Path</h3>
          <div className="path-modules-grid">
            {path.moduleIds.map((modId, index) => {
              const mod = getModule(modId);
              if (!mod) return null;
              return (
                <Link key={modId} to={`/module/${modId}`} className="path-module-card">
                  <span className="path-module-order">{index + 1}</span>
                  <span className="path-module-icon">{mod.icon}</span>
                  <div>
                    <strong>{mod.title}</strong>
                    <span className="path-module-hours">~{mod.estimatedHours}h</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
