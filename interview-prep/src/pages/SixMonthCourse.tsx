import { Link } from 'react-router-dom';
import { sixMonthCourse } from '../data/six-month-course';
import { capstoneProject } from '../data/capstone-project';
import { capstoneSteps } from '../data/capstone-steps';
import { getModule } from '../data/modules';
import './SixMonthCourse.css';

export function SixMonthCourse() {
  return (
    <div className="six-month-course">
      <header className="course-hero">
        <h1>🎓 {sixMonthCourse.title}</h1>
        <p className="course-description">{sixMonthCourse.description}</p>
        <div className="course-meta">
          <span>📅 {sixMonthCourse.totalWeeks} weeks</span>
          <span>⏱️ {sixMonthCourse.hoursPerWeek}/week</span>
        </div>
        <p className="course-outcome">
          <strong>Outcome:</strong> {sixMonthCourse.targetOutcome}
        </p>
        <div className="course-cta">
          <Link to="/capstone" className="cta-primary">
            🚨 Start PulseGrid Capstone →
          </Link>
          <Link to="/daily-plan" className="cta-secondary">
            📅 Today's Study Plan
          </Link>
        </div>
      </header>

      <section className="course-overview">
        <h2>Course Roadmap</h2>
        <p className="overview-intro">
          Six phases from computer science foundations through generative AI, RAG, agentic systems,
          and senior interview readiness. Each month builds on the last — study in order for best results.
        </p>

        <div className="phase-timeline">
          {sixMonthCourse.phases.map((phase) => (
            <article key={phase.month} className="phase-card">
              <div className="phase-header">
                <span className="phase-month">Month {phase.month}</span>
                <h3>{phase.title}</h3>
                <p className="phase-theme">{phase.theme}</p>
              </div>
              <p className="phase-description">{phase.description}</p>

              <div className="phase-goals">
                <h4>Goals by end of month</h4>
                <ul>
                  {phase.goals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              </div>

              <div className="phase-weeks">
                {phase.weeks.map((week) => (
                  <div key={week.week} className="week-card">
                    <div className="week-header">
                      <span className="week-number">Week {week.week}</span>
                      <strong>{week.title}</strong>
                      <span className="week-focus">{week.focus}</span>
                    </div>
                    <div className="week-modules">
                      {week.moduleIds.map((modId) => {
                        const mod = getModule(modId);
                        if (!mod) return null;
                        return (
                          <Link key={modId} to={`/module/${modId}`} className="week-module-link">
                            {mod.icon} {mod.title}
                          </Link>
                        );
                      })}
                    </div>
                    <Link to={`/capstone#week-${week.week}`} className="week-capstone-link">
                      🚨 PulseGrid capstone — Week {week.week}: {capstoneSteps.find((s) => s.week === week.week)?.title ?? 'Build step'} →
                    </Link>
                    <Link to="/daily-plan" className="week-plan-link">
                      View daily tasks for Week {week.week} →
                    </Link>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ai-highlight capstone-highlight">
        <h2>🚨 Capstone: {capstoneProject.name}</h2>
        <p>
          Build a production-grade AI-powered incident response platform over 24 weeks.
          Each week adds one feature to PulseGrid — tied directly to the modules you study.
        </p>
        <Link to="/capstone" className="course-banner-link">
          Start Week 1 of the capstone project →
        </Link>
      </section>

      <section className="ai-highlight">
        <h2>✨ Month 6 — Generative & Agentic AI</h2>
        <p>
          The final month is dedicated to modern AI engineering: how LLMs work, building RAG pipelines,
          designing tool-using agents, and shipping AI features safely in production.
        </p>
        <div className="ai-modules-grid">
          {['generative-ai', 'rag-embeddings', 'agentic-ai', 'ai-engineering'].map((modId) => {
            const mod = getModule(modId);
            if (!mod) return null;
            return (
              <Link key={modId} to={`/module/${modId}`} className="ai-module-card">
                <span className="ai-module-icon">{mod.icon}</span>
                <div>
                  <strong>{mod.title}</strong>
                  <p>{mod.description}</p>
                  <span className="ai-module-hours">~{mod.estimatedHours}h · {mod.sections.length} lessons</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
