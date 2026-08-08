import { Link } from 'react-router-dom';
import { stages } from '../data/curriculum';
import { allModules } from '../data/modules';
import { learningPaths } from '../data/learning-paths';
import { videoLessons } from '../data/concept-videos';
import { detailedConcepts } from '../data/detailed-concepts';
import { useProgress } from '../hooks/useProgress';
import './Home.css';

export function Home() {
  const { getTotalProgress } = useProgress();
  const totalSections = allModules.reduce((sum, m) => sum + m.sections.length, 0);
  const totalQuestions = allModules.reduce((sum, m) => sum + m.questions.length, 0);
  const progress = getTotalProgress(totalSections);

  return (
    <div className="home">
      <header className="hero">
        <h1>Software Engineering Interview Mastery</h1>
        <p className="hero-subtitle">
          Complete preparation for 3+ years experience and senior-level interviews.
          Theory, practice, and engineering reasoning — not memorization.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">{allModules.length}</span>
            <span className="stat-label">Modules</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalSections}</span>
            <span className="stat-label">Lessons</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalQuestions}</span>
            <span className="stat-label">Questions</span>
          </div>
          <div className="stat">
            <span className="stat-value">{videoLessons.length}</span>
            <span className="stat-label">Videos</span>
          </div>
          <div className="stat">
            <span className="stat-value">{progress}%</span>
            <span className="stat-label">Your Progress</span>
          </div>
        </div>
      </header>

      <section className="home-section">
        <h2>🗺️ Choose Your Learning Path</h2>
        <p className="section-desc">
          Structured paths based on your target role. Don't try to learn everything at once.
        </p>
        <div className="path-grid">
          {learningPaths.map((path) => (
            <Link key={path.id} to={`/paths#${path.id}`} className="path-card">
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <div className="path-meta">
                <span>🎯 {path.targetRole}</span>
                <span>⏱️ {path.duration}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>🎯 Practice Tools</h2>
        <p className="section-desc">Test yourself with interactive flashcards and timed mock interviews.</p>
        <div className="practice-grid">
          <Link to="/flashcards" className="practice-card">
            <span className="practice-icon">🃏</span>
            <h3>Flashcards</h3>
            <p>Flip through 200+ interview questions. Filter by module or difficulty level. Mark cards as known.</p>
          </Link>
          <Link to="/mock-interview" className="practice-card">
            <span className="practice-icon">🎤</span>
            <h3>Mock Interview</h3>
            <p>Timed senior-level practice sessions. Answer out loud, take notes, compare with model answers.</p>
          </Link>
          <Link to="/videos" className="practice-card">
            <span className="practice-icon">🎬</span>
            <h3>Video Library</h3>
            <p>{videoLessons.length} curated lessons and {detailedConcepts.length} deep-dive concepts with embedded YouTube videos.</p>
          </Link>
        </div>
      </section>

      <section className="home-section">
        <h2>📚 Curriculum Stages</h2>
        <p className="section-desc">
          Progress through 10 stages from CS fundamentals to staff-level engineering thinking.
        </p>
        <div className="stage-list">
          {stages.map((stage) => (
            <div key={stage.id} className="stage-card">
              <div className="stage-header">
                <span className="stage-number">Stage {stage.id}</span>
                <span className="stage-target">{stage.targetLevel}</span>
              </div>
              <h3>{stage.title}</h3>
              <p>{stage.description}</p>
              <div className="stage-modules">
                {stage.moduleIds.map((id) => {
                  const mod = allModules.find((m) => m.id === id);
                  if (!mod) return null;
                  return (
                    <Link key={id} to={`/module/${id}`} className="stage-module-link">
                      {mod.icon} {mod.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>🎯 How to Use This Platform</h2>
        <div className="how-to-grid">
          <div className="how-to-card">
            <span className="how-to-icon">📖</span>
            <h3>Learn</h3>
            <p>Read theory sections with code examples and practical exercises.</p>
          </div>
          <div className="how-to-card">
            <span className="how-to-icon">💻</span>
            <h3>Implement</h3>
            <p>Complete practical exercises — build, don't just read.</p>
          </div>
          <div className="how-to-card">
            <span className="how-to-icon">🔍</span>
            <h3>Debug</h3>
            <p>Practice debugging scenarios and production incident response.</p>
          </div>
          <div className="how-to-card">
            <span className="how-to-icon">🏗️</span>
            <h3>Design</h3>
            <p>Work through system design problems with trade-off analysis.</p>
          </div>
          <div className="how-to-card">
            <span className="how-to-icon">⚖️</span>
            <h3>Defend</h3>
            <p>Answer questions at Levels A–I: recall through senior scenarios.</p>
          </div>
          <div className="how-to-card">
            <span className="how-to-icon">🎤</span>
            <h3>Mock Interview</h3>
            <p>Use senior scenarios for timed practice sessions.</p>
          </div>
          <div className="how-to-card">
            <span className="how-to-icon">🎬</span>
            <h3>Watch & Learn</h3>
            <p>Study concept-by-concept with curated videos and detailed explanations.</p>
          </div>
        </div>
      </section>

      <section className="home-section framework-section">
        <h2>🧠 The Question Framework</h2>
        <p>Every topic progresses through 9 levels of depth:</p>
        <div className="level-grid">
          {[
            { level: 'A', name: 'Recall', desc: 'What is it?' },
            { level: 'B', name: 'Understanding', desc: 'How does it work?' },
            { level: 'C', name: 'Application', desc: 'When do you use it?' },
            { level: 'D', name: 'Debugging', desc: 'How do you investigate?' },
            { level: 'E', name: 'Optimization', desc: 'How do you improve?' },
            { level: 'F', name: 'Architecture', desc: 'How do you design with it?' },
            { level: 'G', name: 'Trade-offs', desc: 'What are the alternatives?' },
            { level: 'H', name: 'Production', desc: 'What happens at scale?' },
            { level: 'I', name: 'Senior', desc: 'Design the complete system.' },
          ].map((l) => (
            <div key={l.level} className="level-card">
              <span className="level-letter">{l.level}</span>
              <strong>{l.name}</strong>
              <span>{l.desc}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
