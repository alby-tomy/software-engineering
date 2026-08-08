import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { systemDesignWalkthroughs } from '../data/practice';
import './SystemDesignPractice.css';

export function SystemDesignPractice() {
  const { problemId } = useParams<{ problemId: string }>();
  const problem = problemId
    ? systemDesignWalkthroughs.find((p) => p.id === problemId)
    : undefined;
  const [activeStep, setActiveStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  function toggleCheck(stepId: string, item: string) {
    const key = `${stepId}:${item}`;
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!problemId) {
    return (
      <div className="sd-practice">
        <h1>🏗️ System Design Practice</h1>
        <p className="sd-intro">
          Step-by-step walkthroughs for classic system design problems.
          Practice the full 45-minute framework with prompts, tips, and checklists.
        </p>
        <div className="sd-problem-grid">
          {systemDesignWalkthroughs.map((p) => (
            <Link key={p.id} to={`/system-design-practice/${p.id}`} className="sd-problem-card">
              <span className={`sd-difficulty ${p.difficulty}`}>{p.difficulty}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <span className="sd-steps-count">{p.steps.length} steps</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="sd-practice">
        <h2>Problem not found</h2>
        <Link to="/system-design-practice">← Back to problems</Link>
      </div>
    );
  }

  const step = problem.steps[activeStep];

  return (
    <div className="sd-practice">
      <Link to="/system-design-practice" className="sd-back">← All Problems</Link>
      <h1>{problem.title}</h1>
      <p className="sd-desc">{problem.description}</p>

      <div className="sd-estimates">
        <div><strong>Scale:</strong> {problem.estimates.users}</div>
        <div><strong>QPS:</strong> {problem.estimates.qps}</div>
        <div><strong>Storage:</strong> {problem.estimates.storage}</div>
      </div>

      <div className="sd-layout">
        <nav className="sd-step-nav">
          {problem.steps.map((s, i) => (
            <button
              key={s.id}
              className={`sd-step-btn ${activeStep === i ? 'active' : ''}`}
              onClick={() => setActiveStep(i)}
            >
              <span className="sd-step-phase">{s.phase}</span>
              <span className="sd-step-title">{s.title}</span>
            </button>
          ))}
          <div className="sd-step-btn decisions" onClick={() => setActiveStep(problem.steps.length)}>
            <span className="sd-step-title">Key Decisions</span>
          </div>
        </nav>

        <div className="sd-step-content">
          {activeStep < problem.steps.length && step ? (
            <>
              <div className="sd-step-header">
                <h2>{step.title}</h2>
                <span className="sd-duration">⏱️ {step.duration}</span>
              </div>

              <div className="sd-section">
                <h3>🎯 Prompts to address</h3>
                <ul>
                  {step.prompts.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>

              <div className="sd-section tips">
                <h3>💡 Tips</h3>
                <ul>
                  {step.tips.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>

              <div className="sd-section">
                <h3>✅ Checklist</h3>
                <div className="sd-checklist">
                  {step.checklist.map((item) => (
                    <label key={item} className="sd-check-item">
                      <input
                        type="checkbox"
                        checked={checkedItems.has(`${step.id}:${item}`)}
                        onChange={() => toggleCheck(step.id, item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>

              <div className="sd-nav-buttons">
                {activeStep > 0 && (
                  <button onClick={() => setActiveStep(activeStep - 1)}>← Previous</button>
                )}
                {activeStep < problem.steps.length - 1 && (
                  <button className="primary" onClick={() => setActiveStep(activeStep + 1)}>Next →</button>
                )}
                {activeStep === problem.steps.length - 1 && (
                  <button className="primary" onClick={() => setActiveStep(problem.steps.length)}>Key Decisions →</button>
                )}
              </div>
            </>
          ) : (
            <>
              <h2>Key Architecture Decisions</h2>
              <div className="sd-decisions">
                {problem.keyDecisions.map((d, i) => (
                  <div key={i} className="sd-decision-card">
                    <h3>{d.decision}</h3>
                    <p><strong>Why:</strong> {d.rationale}</p>
                    <p className="alternative"><strong>Alternative:</strong> {d.alternative}</p>
                  </div>
                ))}
              </div>
              <div className="sd-requirements">
                <div>
                  <h3>Functional Requirements</h3>
                  <ul>{problem.requirements.functional.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
                <div>
                  <h3>Non-Functional Requirements</h3>
                  <ul>{problem.requirements.nonFunctional.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
