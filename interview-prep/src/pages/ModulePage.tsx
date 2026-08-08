import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getModule } from '../data/modules';
import { getModuleQuiz } from '../data/practice';
import { getVideosByModule } from '../data/concept-videos';
import { getConceptsByModule } from '../data/detailed-concepts';
import { getDetailedLesson, hasDetailedLesson } from '../data/detailed-lessons';
import { wrapSectionAsLesson } from '../data/content-format';
import { useProgress } from '../hooks/useProgress';
import { MarkdownContent } from '../components/MarkdownContent';
import { CodeBlock } from '../components/CodeBlock';
import { QuestionCard } from '../components/QuestionCard';
import { ConceptVideoCard } from '../components/ConceptVideoCard';
import './ModulePage.css';

type Tab = 'learn' | 'questions' | 'scenarios' | 'resources' | 'videos' | 'quiz';

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
  const isDeepLesson = section ? hasDetailedLesson(module.id, section.id) : false;
  const lessonContent = section
    ? getDetailedLesson(module.id, section.id) ?? wrapSectionAsLesson(section.title, section.content, module.title)
    : '';
  const hasQuiz = getModuleQuiz(module.id).length > 0;
  const moduleVideos = getVideosByModule(module.id);
  const moduleConcepts = getConceptsByModule(module.id);
  const hasVideos = moduleVideos.length > 0 || moduleConcepts.length > 0;

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
        {hasVideos && (
          <button
            className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            🎬 Videos ({moduleVideos.length})
          </button>
        )}
        {hasQuiz && (
          <Link to={`/quiz/${module.id}`} className="tab-btn quiz-tab">
            🧪 Take Quiz
          </Link>
        )}
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
                {isDeepLesson && (
                  <p className="lesson-mode-badge">
                    📖 Textbook chapter — in-depth study material
                  </p>
                )}
                <MarkdownContent content={lessonContent} />
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
            <QuestionCard key={q.id} question={q} index={i} moduleId={module.id} />
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

      {activeTab === 'videos' && (
        <div className="module-videos">
          {moduleConcepts.length > 0 && (
            <section className="module-concepts-section">
              <h2>📖 Deep-Dive Concepts</h2>
              <p className="videos-intro">
                Detailed explanations with analogies, real-world examples, and interview tips.
              </p>
              {moduleConcepts.map((concept) => (
                <article key={concept.id} className="module-concept-card">
                  <h3>{concept.title}</h3>
                  <p className="concept-summary">{concept.summary}</p>
                  {concept.analogy && (
                    <div className="concept-callout analogy">
                      <strong>💭 Analogy:</strong> {concept.analogy}
                    </div>
                  )}
                  <MarkdownContent content={concept.content} />
                  {concept.realWorldExample && (
                    <div className="concept-callout real-world">
                      <strong>🌍 Real-World:</strong> {concept.realWorldExample}
                    </div>
                  )}
                  {concept.interviewTips && concept.interviewTips.length > 0 && (
                    <div className="concept-callout tips">
                      <strong>🎯 Interview Tips:</strong>
                      <ul>
                        {concept.interviewTips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}

          {moduleVideos.length > 0 && (
            <section className="module-videos-section">
              <h2>🎬 Video Lessons</h2>
              <p className="videos-intro">
                Watch concept-by-concept videos with embedded players and key takeaways.
              </p>
              {moduleVideos.map((video) => (
                <ConceptVideoCard key={video.id} video={video} />
              ))}
            </section>
          )}

          {moduleVideos.length === 0 && moduleConcepts.length === 0 && (
            <p className="empty-state">No video lessons for this module yet. Check the Video Library for other topics.</p>
          )}

          <Link to="/videos" className="all-videos-link">
            Browse full Video Library →
          </Link>
        </div>
      )}
    </div>
  );
}
