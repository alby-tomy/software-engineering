import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getModule } from '../data/modules';
import { useProgress } from '../hooks/useProgress';
import { MarkdownContent } from '../components/MarkdownContent';
import { CodeBlock } from '../components/CodeBlock';
import { QuestionCard } from '../components/QuestionCard';
import './ModulePage.css';

type Tab = 'learn' | 'questions' | 'scenarios' | 'resources';

export function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const module = moduleId ? getModule(moduleId) : undefined;
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [activeSection, setActiveSection] = useState(0);
  const { isSectionComplete, toggleSection, getModuleProgress } = useProgress();

  if (!module) {
    return (
      <div className="not-found">
        <h2>Module not found</h2>
        <Link to="/">← Back to Home</Link>
      </div>
    );
  }

  const progress = getModuleProgress(module.id, module.sections.length);
  const section = module.sections[activeSection];

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-breadcrumb">
          <Link to="/">Home</Link> / <span>{module.title}</span>
        </div>
        <div className="module-title-row">
          <span className="module-icon">{module.icon}</span>
          <div>
            <h1>{module.title}</h1>
            <p className="module-desc">{module.description}</p>
          </div>
        </div>
        <div className="module-meta">
          <span className="badge">Stage {module.stage}</span>
          <span className="badge">{module.level}</span>
          <span className="badge">~{module.estimatedHours}h</span>
          <span className="badge progress-badge">{progress}% complete</span>
        </div>
        {module.learningObjectives.length > 0 && (
          <div className="objectives">
            <strong>Learning Objectives:</strong>
            <ul>
              {module.learningObjectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="module-tabs">
        {(['learn', 'questions', 'scenarios', 'resources'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'learn' && `📖 Learn (${module.sections.length})`}
            {tab === 'questions' && `❓ Questions (${module.questions.length})`}
            {tab === 'scenarios' && `🎯 Scenarios (${module.seniorScenarios.length})`}
            {tab === 'resources' && `📚 Resources (${module.resources.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'learn' && (
        <div className="learn-layout">
          <nav className="section-nav">
            {module.sections.map((s, i) => (
              <button
                key={s.id}
                className={`section-nav-item ${activeSection === i ? 'active' : ''} ${isSectionComplete(module.id, s.id) ? 'done' : ''}`}
                onClick={() => setActiveSection(i)}
              >
                <span className="section-nav-num">{i + 1}</span>
                <span className="section-nav-title">{s.title}</span>
                {isSectionComplete(module.id, s.id) && <span className="check">✓</span>}
              </button>
            ))}
          </nav>
          <div className="section-content">
            {section && (
              <>
                <h2>{section.title}</h2>
                <MarkdownContent content={section.content} />
                {section.codeExamples?.map((ex, i) => (
                  <CodeBlock key={i} example={ex} />
                ))}
                {section.practicalExercise && (
                  <div className="exercise-box">
                    <strong>🛠️ Practical Exercise</strong>
                    <p>{section.practicalExercise}</p>
                  </div>
                )}
                <button
                  className={`complete-btn ${isSectionComplete(module.id, section.id) ? 'completed' : ''}`}
                  onClick={() => toggleSection(module.id, section.id)}
                >
                  {isSectionComplete(module.id, section.id) ? '✓ Completed' : 'Mark as Complete'}
                </button>
                <div className="section-nav-buttons">
                  {activeSection > 0 && (
                    <button onClick={() => setActiveSection(activeSection - 1)}>← Previous</button>
                  )}
                  {activeSection < module.sections.length - 1 && (
                    <button onClick={() => setActiveSection(activeSection + 1)}>Next →</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="questions-list">
          {module.questions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} />
          ))}
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="scenarios-list">
          {module.seniorScenarios.length === 0 ? (
            <p className="empty-state">No senior scenarios for this module yet. Check back soon!</p>
          ) : (
            module.seniorScenarios.map((scenario, i) => (
              <div key={i} className="scenario-card">
                <h3>🎯 {scenario.title}</h3>
                <div className="scenario-section">
                  <strong>Scenario:</strong>
                  <p>{scenario.scenario}</p>
                </div>
                <div className="scenario-section">
                  <strong>Approach:</strong>
                  <p>{scenario.approach}</p>
                </div>
                <div className="scenario-section">
                  <strong>Key Considerations:</strong>
                  <ul>
                    {scenario.keyConsiderations.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
                {scenario.followUpQuestions && (
                  <div className="scenario-section">
                    <strong>Follow-up Questions:</strong>
                    <ul>
                      {scenario.followUpQuestions.map((q, j) => (
                        <li key={j}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'resources' && (
        <div className="resources-list">
          {module.resources.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">
              <span className="resource-type">{r.type}</span>
              <span className="resource-title">{r.title}</span>
              <span className="resource-arrow">→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
