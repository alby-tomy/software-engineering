import { useState, useEffect, useCallback } from 'react';
import { pickMockInterviewSet, type MockInterviewQuestion } from '../data/practice';
import './MockInterview.css';

type Phase = 'setup' | 'interview' | 'review' | 'complete';

export function MockInterview() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<MockInterviewQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState('');

  const startInterview = useCallback(() => {
    const set = pickMockInterviewSet(questionCount);
    setQuestions(set);
    setCurrentQ(0);
    setNotes(new Array(set.length).fill(''));
    setShowAnswer(false);
    setPhase('interview');
    if (set.length > 0) {
      setTimeLeft(set[0].timeMinutes * 60);
      setIsRunning(true);
    }
  }, [questionCount]);

  useEffect(() => {
    if (!isRunning || phase !== 'interview') return;
    if (timeLeft <= 0) {
      setIsRunning(false);
      setShowAnswer(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, phase]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function nextQuestion() {
    const newNotes = [...notes];
    newNotes[currentQ] = currentNote;
    setNotes(newNotes);
    setCurrentNote(newNotes[currentQ + 1] || '');

    if (currentQ + 1 >= questions.length) {
      setPhase('complete');
      setIsRunning(false);
      return;
    }

    const next = currentQ + 1;
    setCurrentQ(next);
    setTimeLeft(questions[next].timeMinutes * 60);
    setShowAnswer(false);
    setIsRunning(true);
  }

  function revealAnswer() {
    setIsRunning(false);
    setShowAnswer(true);
  }

  const q = questions[currentQ];

  if (phase === 'setup') {
    return (
      <div className="mock-page">
        <h1>🎤 Mock Interview</h1>
        <p className="mock-intro">
          Timed practice with senior-level questions and scenarios. Answer out loud, then compare with the model answer.
        </p>

        <div className="mock-setup-card">
          <h2>Configure Your Session</h2>
          <label>
            Number of questions
            <select value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))}>
              <option value={3}>3 questions (~30 min)</option>
              <option value={5}>5 questions (~50 min)</option>
              <option value={8}>8 questions (~80 min)</option>
              <option value={10}>10 questions (~100 min)</option>
            </select>
          </label>

          <div className="mock-tips">
            <h3>Tips for practice</h3>
            <ul>
              <li>Speak your answer out loud — don't just think it</li>
              <li>Structure: clarify → approach → trade-offs → failure modes</li>
              <li>Use the timer — real interviews are timed</li>
              <li>Take notes on what you missed</li>
              <li>Review model answers after each question</li>
            </ul>
          </div>

          <button className="start-btn" onClick={startInterview}>
            Start Mock Interview
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="mock-page">
        <h1>🎉 Session Complete</h1>
        <p className="mock-intro">You completed {questions.length} questions. Review your notes and model answers below.</p>

        <div className="mock-review-list">
          {questions.map((question, i) => (
            <div key={question.id} className="mock-review-item">
              <div className="mock-review-header">
                <span className="mock-q-num">Q{i + 1}</span>
                <span className="mock-q-module">{question.module.icon} {question.module.title}</span>
                <span className="mock-q-type">{question.type === 'scenario' ? '🎯 Scenario' : '❓ Question'}</span>
              </div>
              <p className="mock-review-prompt">{question.prompt}</p>
              {notes[i] && (
                <div className="mock-your-notes">
                  <strong>Your notes:</strong>
                  <p>{notes[i]}</p>
                </div>
              )}
              <div className="mock-model-answer">
                <strong>Model answer:</strong>
                <p>{question.answer}</p>
                {question.keyPoints && (
                  <ul>
                    {question.keyPoints.map((p, j) => <li key={j}>{p}</li>)}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="start-btn" onClick={() => setPhase('setup')}>
          Start New Session
        </button>
      </div>
    );
  }

  return (
    <div className="mock-page">
      <div className="mock-header">
        <h1>🎤 Mock Interview</h1>
        <div className="mock-progress">
          Question {currentQ + 1} of {questions.length}
        </div>
      </div>

      {q && (
        <>
          <div className={`mock-timer ${timeLeft < 60 ? 'urgent' : ''} ${!isRunning && showAnswer ? 'paused' : ''}`}>
            <span className="timer-label">{isRunning ? 'Time remaining' : showAnswer ? "Time's up — Review answer" : 'Paused'}</span>
            <span className="timer-value">{formatTime(timeLeft)}</span>
            <span className="timer-allocated">/ {q.timeMinutes} min allocated</span>
          </div>

          <div className="mock-question-card">
            <div className="mock-question-meta">
              <span>{q.module.icon} {q.module.title}</span>
              <span className="mock-type-badge">{q.type === 'scenario' ? 'Senior Scenario' : 'Senior Question'}</span>
            </div>
            <h2>{q.type === 'scenario' ? q.title : 'Question'}</h2>
            <p className="mock-prompt">{q.prompt}</p>
          </div>

          <div className="mock-notes-area">
            <label>Your notes (what you said / key points you covered)</label>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Write your answer structure, key points, trade-offs you mentioned..."
              rows={4}
            />
          </div>

          {!showAnswer ? (
            <div className="mock-actions">
              <button onClick={() => setIsRunning(!isRunning)}>
                {isRunning ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button className="reveal-btn" onClick={revealAnswer}>
                Reveal Answer
              </button>
            </div>
          ) : (
            <div className="mock-answer-reveal">
              <h3>Model Answer</h3>
              <p>{q.answer}</p>
              {q.keyPoints && (
                <div className="mock-key-points">
                  <strong>Key points to cover:</strong>
                  <ul>
                    {q.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              <button className="next-btn" onClick={nextQuestion}>
                {currentQ + 1 >= questions.length ? 'Finish Session' : 'Next Question →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
