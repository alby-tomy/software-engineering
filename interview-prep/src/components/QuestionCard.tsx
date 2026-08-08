import { useState } from 'react';
import type { Question } from '../types/curriculum';
import { QUESTION_LEVEL_LABELS, QUESTION_LEVEL_COLORS } from '../types/curriculum';
import './QuestionCard.css';

interface QuestionCardProps {
  question: Question;
  index: number;
}

export function QuestionCard({ question, index }: QuestionCardProps) {
  const [revealed, setRevealed] = useState(false);

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
