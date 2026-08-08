import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getModuleQuiz } from '../data/practice';
import { getModule } from '../data/modules';
import { useProgress } from '../hooks/useProgress';
import './Quiz.css';

export function Quiz() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const module = moduleId ? getModule(moduleId) : undefined;
  const questions = moduleId ? getModuleQuiz(moduleId) : [];
  const { saveQuizScore, getQuizScore } = useProgress();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const previousScore = moduleId ? getQuizScore(moduleId) : undefined;

  if (!module || questions.length === 0) {
    return (
      <div className="quiz-page">
        <h2>Quiz not available</h2>
        <p>No quiz for this module yet. Try: python, fastapi, sql, dsa, system-design</p>
        <Link to="/dashboard">← Dashboard</Link>
      </div>
    );
  }

  const current = questions[currentIndex];

  function selectOption(index: number) {
    if (showExplanation) return;
    setSelected(index);
    setShowExplanation(true);
    if (index === current.correctIndex) {
      setScore((s) => s + 1);
    }
  }

  function nextQuestion() {
    const currentCorrect = selected === current.correctIndex;
    const newScore = score + (currentCorrect ? 1 : 0);

    if (currentIndex + 1 >= questions.length) {
      setFinalScore(newScore);
      setFinished(true);
      saveQuizScore(moduleId!, newScore, questions.length);
      return;
    }
    setScore(newScore);
    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setShowExplanation(false);
  }

  if (finished) {
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <div className="quiz-page">
        <div className="quiz-result">
          <h1>{pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚'} Quiz Complete</h1>
          <div className="quiz-score-display">
            <span className="quiz-score-num">{finalScore}/{questions.length}</span>
            <span className="quiz-score-pct">{pct}%</span>
          </div>
          <p>
            {pct >= 80 ? 'Excellent! You know this material well.' :
             pct >= 60 ? 'Good effort. Review the topics you missed.' :
             'Keep studying. Re-read the module and try again.'}
          </p>
          <div className="quiz-result-actions">
            <Link to={`/module/${moduleId}`} className="quiz-btn">Review Module</Link>
            <button className="quiz-btn primary" onClick={() => {
              setCurrentIndex(0);
              setSelected(null);
              setShowExplanation(false);
              setScore(0);
              setFinalScore(0);
              setFinished(false);
            }}>Retry Quiz</button>
            <Link to="/dashboard" className="quiz-btn">Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <Link to={`/module/${moduleId}`} className="quiz-back">
          {module.icon} {module.title}
        </Link>
        <span className="quiz-progress">Question {currentIndex + 1} of {questions.length}</span>
        {previousScore && (
          <span className="quiz-prev-score">Best: {previousScore.score}/{previousScore.total}</span>
        )}
      </div>

      <div className="quiz-question-card">
        <h2>{current.question}</h2>
        <div className="quiz-options">
          {current.options.map((option, i) => {
            let className = 'quiz-option';
            if (showExplanation) {
              if (i === current.correctIndex) className += ' correct';
              else if (i === selected) className += ' wrong';
            } else if (selected === i) {
              className += ' selected';
            }
            return (
              <button
                key={i}
                className={className}
                onClick={() => selectOption(i)}
                disabled={showExplanation}
              >
                <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                {option}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className={`quiz-explanation ${selected === current.correctIndex ? 'correct-exp' : 'wrong-exp'}`}>
            <strong>{selected === current.correctIndex ? '✓ Correct!' : '✗ Incorrect'}</strong>
            <p>{current.explanation}</p>
            <button className="quiz-next-btn" onClick={nextQuestion}>
              {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>

      <div className="quiz-score-tracker">
        Score: {score}/{currentIndex + (showExplanation ? 1 : 0)}
      </div>
    </div>
  );
}
