import { useState } from 'react';
import type { Question } from '../types/curriculum';
import { QUESTION_LEVEL_LABELS, QUESTION_LEVEL_COLORS } from '../types/curriculum';
import { useProgress } from '../hooks/useProgress';
import './QuestionCard.css';

interface QuestionCardProps {
  question: Question;
  index: number;
  moduleId?: string;
}

export function QuestionCard({ question, index, moduleId }: QuestionCardProps) {
  const [revealed, setRevealed] = useState(false);
  const bookmarkId = moduleId ? `${moduleId}-${question.id}` : question.id;
  const { isBookmarked, toggleBookmark } = useProgress();

  return (
    <div className="question-card">
      <div className="question-header">
        <span className="question-number">Q{index + 1}</span>
        <span
          className="question-level"
          style={{ backgroundColor: QUESTION_LEVEL_COLORS[question.level] + '20', color: QUESTION_LEVEL_COLORS[question.level] }}
        >
          {QUESTION_LEVEL_LABELS[question.level]}
        </span>
        <button
          className={`bookmark-btn ${isBookmarked(bookmarkId) ? 'bookmarked' : ''}`}
          onClick={() => toggleBookmark(bookmarkId)}
          title="Bookmark this question"
        >
          {isBookmarked(bookmarkId) ? '🔖' : '📑'}
        </button>
      </div>
      <p className="question-text">{question.question}</p>
      {!revealed ? (
        <button className="reveal-btn" onClick={() => setRevealed(true)}>
          Reveal Answer
        </button>
      ) : (
        <div className="answer-section">
          <p className="answer-text">{question.answer}</p>
          {question.keyPoints && question.keyPoints.length > 0 && (
            <div className="key-points">
              <strong>Key Points:</strong>
              <ul>
                {question.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}
          {question.codeExample && (
            <pre className="code-block"><code>{question.codeExample}</code></pre>
          )}
        </div>
      )}
    </div>
  );
}
