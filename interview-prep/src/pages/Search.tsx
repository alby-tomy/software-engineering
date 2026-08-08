import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { searchModules, searchQuestions } from '../data/modules';
import { QUESTION_LEVEL_LABELS, QUESTION_LEVEL_COLORS } from '../types/curriculum';
import './Search.css';

export function Search() {
  const [query, setQuery] = useState('');

  const moduleResults = useMemo(() => (query.length >= 2 ? searchModules(query) : []), [query]);
  const questionResults = useMemo(() => (query.length >= 2 ? searchQuestions(query) : []), [query]);

  return (
    <div className="search-page">
      <h1>🔍 Search</h1>
      <p className="search-intro">Search across all modules, lessons, and interview questions.</p>

      <input
        type="text"
        className="search-input"
        placeholder="Search topics, questions, concepts... (e.g., 'async', 'GIL', 'index')"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {query.length < 2 && (
        <div className="search-suggestions">
          <p>Try searching for:</p>
          <div className="suggestion-tags">
            {['async', 'GIL', 'B-tree index', 'circuit breaker', 'MVCC', 'goroutine', 'Kafka', 'microservices', 'system design', 'JWT', 'CAP theorem', 'event sourcing', 'gRPC'].map((tag) => (
              <button key={tag} className="suggestion-tag" onClick={() => setQuery(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && (
        <div className="search-results">
          {moduleResults.length > 0 && (
            <section>
              <h2>Modules ({moduleResults.length})</h2>
              {moduleResults.map((mod) => (
                <Link key={mod.id} to={`/module/${mod.id}`} className="search-result-module">
                  <span>{mod.icon}</span>
                  <div>
                    <strong>{mod.title}</strong>
                    <p>{mod.description}</p>
                  </div>
                </Link>
              ))}
            </section>
          )}

          {questionResults.length > 0 && (
            <section>
              <h2>Questions ({questionResults.length})</h2>
              {questionResults.map(({ module, question }) => (
                <Link
                  key={question.id}
                  to={`/module/${module.id}`}
                  className="search-result-question"
                >
                  <span
                    className="search-q-level"
                    style={{
                      backgroundColor: QUESTION_LEVEL_COLORS[question.level] + '20',
                      color: QUESTION_LEVEL_COLORS[question.level],
                    }}
                  >
                    {QUESTION_LEVEL_LABELS[question.level]}
                  </span>
                  <div>
                    <p className="search-q-text">{question.question}</p>
                    <span className="search-q-module">{module.icon} {module.title}</span>
                  </div>
                </Link>
              ))}
            </section>
          )}

          {moduleResults.length === 0 && questionResults.length === 0 && (
            <p className="no-results">No results for "{query}". Try different keywords.</p>
          )}
        </div>
      )}
    </div>
  );
}
