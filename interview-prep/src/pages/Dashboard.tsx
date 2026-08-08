import { Link } from 'react-router-dom';
import { allModules } from '../data/modules';
import { getAllFlashcards } from '../data/practice';
import { useProgress } from '../hooks/useProgress';
import './Dashboard.css';

export function Dashboard() {
  const { completed, bookmarks, streak, quizScores, getModuleProgress } = useProgress();
  const totalSections = allModules.reduce((sum, m) => sum + m.sections.length, 0);
  const totalProgress = totalSections > 0 ? Math.round((completed.size / totalSections) * 100) : 0;
  const allCards = getAllFlashcards();
  const bookmarkedCards = allCards.filter((c) => bookmarks.has(c.id));

  const moduleProgress = allModules
    .map((m) => ({
      module: m,
      progress: getModuleProgress(m.id, m.sections.length),
      completed: [...completed].filter((k) => k.startsWith(`${m.id}:`)).length,
      total: m.sections.length,
    }))
    .sort((a, b) => a.progress - b.progress);

  const weakModules = moduleProgress.filter((m) => m.progress < 50 && m.progress > 0).slice(0, 5);
  const notStarted = moduleProgress.filter((m) => m.progress === 0).slice(0, 5);

  return (
    <div className="dashboard">
      <h1>📊 Study Dashboard</h1>
      <p className="dashboard-intro">Track your progress, streaks, and areas to focus on.</p>

      <div className="stats-grid">
        <div className="stat-card highlight">
          <span className="stat-card-value">{totalProgress}%</span>
          <span className="stat-card-label">Overall Progress</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${totalProgress}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{completed.size}</span>
          <span className="stat-card-label">Lessons Completed</span>
          <span className="stat-card-sub">of {totalSections}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">🔥 {streak.currentStreak}</span>
          <span className="stat-card-label">Day Streak</span>
          <span className="stat-card-sub">Best: {streak.longestStreak} days</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{bookmarks.size}</span>
          <span className="stat-card-label">Bookmarked</span>
          <span className="stat-card-sub">Questions saved</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-section">
          <h2>📈 Progress by Module</h2>
          <div className="module-progress-list">
            {moduleProgress.map(({ module, progress, completed: done, total }) => (
              <Link key={module.id} to={`/module/${module.id}`} className="module-progress-item">
                <span className="mp-icon">{module.icon}</span>
                <div className="mp-info">
                  <span className="mp-title">{module.title}</span>
                  <div className="mp-bar">
                    <div className="mp-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <span className="mp-pct">{progress}%</span>
                <span className="mp-count">{done}/{total}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="dashboard-side">
          {weakModules.length > 0 && (
            <section className="dashboard-section">
              <h2>⚠️ Needs Review</h2>
              {weakModules.map(({ module, progress }) => (
                <Link key={module.id} to={`/module/${module.id}`} className="focus-item">
                  {module.icon} {module.title} — {progress}%
                </Link>
              ))}
            </section>
          )}

          {notStarted.length > 0 && (
            <section className="dashboard-section">
              <h2>🆕 Not Started</h2>
              {notStarted.map(({ module }) => (
                <Link key={module.id} to={`/module/${module.id}`} className="focus-item">
                  {module.icon} {module.title}
                </Link>
              ))}
            </section>
          )}

          {quizScores.length > 0 && (
            <section className="dashboard-section">
              <h2>🧪 Quiz Scores</h2>
              {quizScores.slice(-5).reverse().map((q) => {
                const mod = allModules.find((m) => m.id === q.moduleId);
                return (
                  <div key={`${q.moduleId}-${q.date}`} className="quiz-score-item">
                    <span>{mod?.icon} {mod?.title ?? q.moduleId}</span>
                    <span className={q.score / q.total >= 0.8 ? 'score-good' : 'score-ok'}>
                      {q.score}/{q.total}
                    </span>
                  </div>
                );
              })}
            </section>
          )}

          {bookmarkedCards.length > 0 && (
            <section className="dashboard-section">
              <h2>🔖 Bookmarks</h2>
              {bookmarkedCards.slice(0, 5).map((card) => (
                <div key={card.id} className="bookmark-item">
                  <p>{card.question.question.slice(0, 80)}...</p>
                  <span>{card.module.icon} {card.module.title}</span>
                </div>
              ))}
              {bookmarkedCards.length > 5 && (
                <Link to="/flashcards" className="see-more">View all in Flashcards →</Link>
              )}
            </section>
          )}
        </div>
      </div>

      <section className="dashboard-section">
        <h2>🗓️ Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/daily-plan" className="quick-action">📅 Today's Study Plan</Link>
          <Link to="/flashcards" className="quick-action">🃏 Practice Flashcards</Link>
          <Link to="/mock-interview" className="quick-action">🎤 Mock Interview</Link>
          <Link to="/system-design-practice" className="quick-action">🏗️ System Design Practice</Link>
        </div>
      </section>
    </div>
  );
}
