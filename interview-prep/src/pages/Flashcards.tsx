import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getAllFlashcards, shuffleCards } from '../data/practice';
import { allModules } from '../data/modules';
import { QUESTION_LEVEL_LABELS, QUESTION_LEVEL_COLORS } from '../types/curriculum';
import './Flashcards.css';

export function Flashcards() {
  const allCards = useMemo(() => getAllFlashcards(), []);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());

  const filteredCards = useMemo(() => {
    let cards = allCards;
    if (selectedModule !== 'all') {
      cards = cards.filter((c) => c.module.id === selectedModule);
    }
    if (selectedLevel !== 'all') {
      cards = cards.filter((c) => c.question.level === selectedLevel);
    }
    return cards;
  }, [allCards, selectedModule, selectedLevel]);

  const [deck, setDeck] = useState(filteredCards);

  const current = deck[currentIndex];
  const progress = deck.length > 0 ? Math.round((known.size / deck.length) * 100) : 0;

  function reshuffle() {
    setDeck(shuffleCards(filteredCards));
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(new Set());
  }

  function applyFilters() {
    setDeck(shuffleCards(filteredCards));
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(new Set());
  }

  function nextCard() {
    setFlipped(false);
    setCurrentIndex((i) => (i + 1) % deck.length);
  }

  function prevCard() {
    setFlipped(false);
    setCurrentIndex((i) => (i - 1 + deck.length) % deck.length);
  }

  function markKnown() {
    if (current) {
      setKnown((prev) => new Set([...prev, current.id]));
      nextCard();
    }
  }

  if (deck.length === 0) {
    return (
      <div className="flashcards-page">
        <h1>🃏 Flashcards</h1>
        <p>No cards match your filters. Try different options.</p>
        <button onClick={() => { setSelectedModule('all'); setSelectedLevel('all'); }}>Reset filters</button>
      </div>
    );
  }

  return (
    <div className="flashcards-page">
      <h1>🃏 Flashcards</h1>
      <p className="flashcards-intro">
        Flip cards to test yourself. Mark cards as known to track progress. {allCards.length} total cards available.
      </p>

      <div className="flashcards-controls">
        <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
          <option value="all">All modules</option>
          {allModules.map((m) => (
            <option key={m.id} value={m.id}>{m.icon} {m.title}</option>
          ))}
        </select>
        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
          <option value="all">All levels</option>
          {Object.entries(QUESTION_LEVEL_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button onClick={applyFilters}>Apply & Shuffle</button>
        <button onClick={reshuffle}>Reshuffle</button>
      </div>

      <div className="flashcards-progress">
        <span>Card {currentIndex + 1} of {deck.length}</span>
        <span className="known-count">Known: {known.size} ({progress}%)</span>
      </div>

      {current && (
        <div
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped(!flipped)}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front">
              <div className="flashcard-meta">
                <span
                  className="flashcard-level"
                  style={{
                    backgroundColor: QUESTION_LEVEL_COLORS[current.question.level] + '20',
                    color: QUESTION_LEVEL_COLORS[current.question.level],
                  }}
                >
                  {QUESTION_LEVEL_LABELS[current.question.level]}
                </span>
                <span className="flashcard-module">
                  {current.module.icon} {current.module.title}
                </span>
              </div>
              <p className="flashcard-question">{current.question.question}</p>
              <span className="flip-hint">Click to reveal answer</span>
            </div>
            <div className="flashcard-back">
              <p className="flashcard-answer">{current.question.answer}</p>
              {current.question.keyPoints && (
                <ul className="flashcard-keypoints">
                  {current.question.keyPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
              <Link to={`/module/${current.module.id}`} className="learn-more" onClick={(e) => e.stopPropagation()}>
                Learn more in module →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flashcard-actions">
        <button onClick={prevCard}>← Previous</button>
        <button className="known-btn" onClick={markKnown}>✓ I knew this</button>
        <button onClick={nextCard}>Next →</button>
      </div>
    </div>
  );
}
