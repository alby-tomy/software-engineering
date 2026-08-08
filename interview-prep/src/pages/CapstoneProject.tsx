import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { capstoneProject } from '../data/capstone-project';
import { capstoneQuickStartGuide } from '../data/capstone-quickstart';
import { getCapstoneTextbookLesson } from '../data/detailed-lessons/textbook-pulsegrid';
import { getCapstoneFullLesson } from '../data/capstone-embedded-walkthrough';
import { MarkdownContent } from '../components/MarkdownContent';
import { useCapstoneProgress } from '../hooks/useCapstoneProgress';
import './CapstoneProject.css';

function parseWeekFromHash(hash: string): number | null {
  const match = hash.match(/^#week-(\d+)$/);
  if (!match) return null;
  const week = Number(match[1]);
  return week >= 1 && week <= 24 ? week : null;
}

export function CapstoneProject() {
  const location = useLocation();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const { isStepComplete, toggleStep, getProgress } = useCapstoneProgress();
  const step = capstoneProject.steps.find((s) => s.week === selectedWeek) ?? capstoneProject.steps[0];
  const progress = getProgress(capstoneProject.steps.length);
  const fullLesson = getCapstoneFullLesson(step.id, getCapstoneTextbookLesson(step.id), {
    architectureNote: step.architectureNote,
    starterCode: step.starterCode,
  });

  useEffect(() => {
    const week = parseWeekFromHash(location.hash);
    if (week !== null) {
      setSelectedWeek(week);
      requestAnimationFrame(() => {
        document.getElementById(`week-${week}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const selectWeek = (week: number) => {
    setSelectedWeek(week);
    window.history.replaceState(null, '', `#week-${week}`);
  };

  return (
    <div className="capstone-page">
      <header className="capstone-hero">
        <span className="capstone-badge">6-Month Capstone Project</span>
        <h1>🚨 {capstoneProject.name}</h1>
        <p className="capstone-tagline">{capstoneProject.tagline}</p>
        <p className="capstone-desc">{capstoneProject.description}</p>
        <div className="capstone-repo-link">
          <strong>Runnable codebase:</strong> All code runs from the <code>pulsegrid/</code> directory in this repo.
          See the Quick Start guide below for full setup commands.
        </div>
        <div className="capstone-meta">
          <span>📅 24 weekly steps</span>
          <span>🛠️ {capstoneProject.techStack.length} technologies</span>
          <span>📊 {progress}% complete</span>
        </div>
        <div className="capstone-progress-bar">
          <div className="capstone-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <section className="capstone-section quickstart-section">
        <h2>Quick Start — Run It Yourself</h2>
        <MarkdownContent content={capstoneQuickStartGuide} />
      </section>

      <section className="capstone-section">
        <h2>Real-World Problem</h2>
        <MarkdownContent content={capstoneProject.problemStatement} />
      </section>

      <section className="capstone-section">
        <h2>Final Architecture</h2>
        <MarkdownContent content={capstoneProject.finalArchitecture} />
      </section>

      <section className="capstone-section">
        <h2>Tech Stack</h2>
        <div className="tech-stack-grid">
          {capstoneProject.techStack.map((tech) => (
            <span key={tech} className="tech-chip">{tech}</span>
          ))}
        </div>
      </section>

      <section className="capstone-section">
        <h2>Repository Structure</h2>
        <pre className="repo-structure"><code>{capstoneProject.repoStructure}</code></pre>
      </section>

      <section className="capstone-steps-section">
        <h2>24-Week Build Plan</h2>
        <p className="steps-intro">
          Each week adds one layer to PulseGrid, tied to the modules you study that week.
          Complete the textbook lessons first, then implement the project step.
        </p>

        <div className="week-selector">
          {capstoneProject.steps.map((s) => (
            <button
              key={s.week}
              className={`week-chip ${selectedWeek === s.week ? 'active' : ''} ${isStepComplete(s.id) ? 'done' : ''}`}
              onClick={() => selectWeek(s.week)}
            >
              {isStepComplete(s.id) ? '✓ ' : ''}W{s.week}
            </button>
          ))}
        </div>

        <article className="step-detail" id={`week-${step.week}`}>
          <div className="step-header">
            <span className="step-week">Week {step.week} · Month {step.month}</span>
            <h3>{step.title}</h3>
            <div className="step-modules">
              {step.moduleIds.map((modId) => (
                <Link key={modId} to={`/module/${modId}`} className="step-module-link">
                  {modId}
                </Link>
              ))}
            </div>
          </div>

          <div className="step-block problem-block">
            <h4>🌍 Real-World Problem</h4>
            <p>{step.realWorldProblem}</p>
          </div>

          {fullLesson && (
            <div className="step-block textbook-chapter-block">
              <h4>📖 Full Lesson — Concepts, Code &amp; Commands</h4>
              <p className="textbook-chapter-intro">
                Everything you need is on this page: textbook explanations, full code snippets, SQL, configs, and shell commands — not just file references.
              </p>
              <div className="textbook-chapter-content">
                <MarkdownContent content={fullLesson} />
              </div>
            </div>
          )}

          <div className="step-block">
            <h4>🎯 Objectives</h4>
            <ul>
              {step.objectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </div>

          <div className="step-block">
            <h4>🔨 Implementation Tasks</h4>
            <ol>
              {step.implementationTasks.map((t) => <li key={t}>{t}</li>)}
            </ol>
          </div>

          {step.codePaths && step.codePaths.length > 0 && (
            <details className="step-block source-files-details">
              <summary>📁 Source files in repository (optional reference)</summary>
              <p className="code-paths-intro">
                The full lesson above includes all code inline. These paths map to the runnable implementation in the repo:
              </p>
              <ul className="code-paths-list">
                {step.codePaths.map((path) => (
                  <li key={path}><code>{path}</code></li>
                ))}
              </ul>
            </details>
          )}

          <div className="step-block">
            <h4>📦 Deliverables</h4>
            <ul>
              {step.deliverables.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>

          <div className="step-block">
            <h4>📚 Concepts Applied</h4>
            <div className="concepts-grid">
              {step.conceptsApplied.map((c) => (
                <span key={c} className="concept-chip">{c}</span>
              ))}
            </div>
          </div>

          <div className="step-block criteria-block">
            <h4>✅ Acceptance Criteria</h4>
            <ul>
              {step.acceptanceCriteria.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>

          <button
            className={`complete-step-btn ${isStepComplete(step.id) ? 'completed' : ''}`}
            onClick={() => toggleStep(step.id)}
          >
            {isStepComplete(step.id) ? '✓ Week Complete' : 'Mark Week as Complete'}
          </button>

          <div className="step-nav">
            {step.week > 1 && (
              <button onClick={() => selectWeek(step.week - 1)}>← Week {step.week - 1}</button>
            )}
            {step.week < 24 && (
              <button onClick={() => selectWeek(step.week + 1)}>Week {step.week + 1} →</button>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
