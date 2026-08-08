import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { videoLessons, getAllConcepts, searchVideos } from '../data/concept-videos';
import { detailedConcepts } from '../data/detailed-concepts';
import { allModules } from '../data/modules';
import { ConceptVideoCard } from '../components/ConceptVideoCard';
import { MarkdownContent } from '../components/MarkdownContent';
import { getVideoById } from '../data/concept-videos';
import './VideoLibrary.css';

export function VideoLibrary() {
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedConcept, setSelectedConcept] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'videos' | 'concepts'>('videos');
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

  const concepts = useMemo(() => getAllConcepts(), []);
  const modulesWithVideos = useMemo(() => {
    const ids = new Set(videoLessons.map((v) => v.moduleId));
    return allModules.filter((m) => ids.has(m.id));
  }, []);

  const filteredVideos = useMemo(() => {
    let videos = searchQuery ? searchVideos(searchQuery) : [...videoLessons];
    if (selectedModule !== 'all') {
      videos = videos.filter((v) => v.moduleId === selectedModule);
    }
    if (selectedConcept !== 'all') {
      videos = videos.filter((v) => v.concept === selectedConcept);
    }
    if (selectedLevel !== 'all') {
      videos = videos.filter((v) => v.level === selectedLevel);
    }
    return videos.sort((a, b) => {
      if (a.moduleId !== b.moduleId) return a.moduleId.localeCompare(b.moduleId);
      return (a.watchOrder ?? 99) - (b.watchOrder ?? 99);
    });
  }, [selectedModule, selectedConcept, selectedLevel, searchQuery]);

  const filteredConcepts = useMemo(() => {
    let items = [...detailedConcepts];
    if (selectedModule !== 'all') {
      items = items.filter((c) => c.moduleId === selectedModule);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q)
      );
    }
    return items;
  }, [selectedModule, searchQuery]);

  const groupedVideos = useMemo(() => {
    const groups: Record<string, typeof filteredVideos> = {};
    for (const video of filteredVideos) {
      if (!groups[video.concept]) groups[video.concept] = [];
      groups[video.concept].push(video);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredVideos]);

  return (
    <div className="video-library">
      <header className="video-library-header">
        <h1>🎬 Concept Video Library</h1>
        <p className="video-library-intro">
          Learn concept by concept with curated YouTube lessons and detailed written explanations.
          {videoLessons.length} videos across {concepts.length} concepts, plus {detailedConcepts.length} deep-dive guides.
        </p>
      </header>

      <div className="video-library-controls">
        <input
          type="search"
          placeholder="Search videos and concepts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="video-search"
        />

        <div className="filter-row">
          <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
            <option value="all">All Modules</option>
            {modulesWithVideos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icon} {m.title}
              </option>
            ))}
          </select>

          <select
            value={selectedConcept}
            onChange={(e) => setSelectedConcept(e.target.value)}
            disabled={viewMode === 'concepts'}
          >
            <option value="all">All Concepts</option>
            {concepts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            disabled={viewMode === 'concepts'}
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="view-toggle">
          <button
            className={viewMode === 'videos' ? 'active' : ''}
            onClick={() => setViewMode('videos')}
          >
            🎬 Videos ({filteredVideos.length})
          </button>
          <button
            className={viewMode === 'concepts' ? 'active' : ''}
            onClick={() => setViewMode('concepts')}
          >
            📖 Deep Dives ({filteredConcepts.length})
          </button>
        </div>
      </div>

      {viewMode === 'videos' && (
        <div className="video-library-content">
          {filteredVideos.length === 0 ? (
            <p className="empty-state">No videos match your filters. Try different options.</p>
          ) : selectedConcept === 'all' && !searchQuery ? (
            groupedVideos.map(([concept, videos]) => (
              <section key={concept} className="concept-group">
                <h2 className="concept-group-title">
                  <span className="concept-group-icon">💡</span>
                  {concept}
                  <span className="concept-group-count">{videos.length} video{videos.length > 1 ? 's' : ''}</span>
                </h2>
                {videos.map((video) => (
                  <ConceptVideoCard key={video.id} video={video} />
                ))}
              </section>
            ))
          ) : (
            filteredVideos.map((video) => (
              <ConceptVideoCard key={video.id} video={video} />
            ))
          )}
        </div>
      )}

      {viewMode === 'concepts' && (
        <div className="concepts-library-content">
          {filteredConcepts.length === 0 ? (
            <p className="empty-state">No concepts match your filters.</p>
          ) : (
            filteredConcepts.map((concept) => {
              const mod = allModules.find((m) => m.id === concept.moduleId);
              const isExpanded = expandedConcept === concept.id;
              return (
                <article key={concept.id} className="detailed-concept-card">
                  <button
                    className="concept-card-header"
                    onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
                  >
                    <div>
                      <span className="concept-module-tag">
                        {mod?.icon} {mod?.title}
                      </span>
                      <h3>{concept.title}</h3>
                      <p>{concept.summary}</p>
                    </div>
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {isExpanded && (
                    <div className="concept-card-body">
                      {concept.analogy && (
                        <div className="concept-highlight analogy">
                          <strong>💭 Analogy</strong>
                          <p>{concept.analogy}</p>
                        </div>
                      )}

                      <MarkdownContent content={concept.content} />

                      {concept.realWorldExample && (
                        <div className="concept-highlight real-world">
                          <strong>🌍 Real-World Example</strong>
                          <p>{concept.realWorldExample}</p>
                        </div>
                      )}

                      {concept.commonMistakes && concept.commonMistakes.length > 0 && (
                        <div className="concept-highlight mistakes">
                          <strong>⚠️ Common Mistakes</strong>
                          <ul>
                            {concept.commonMistakes.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {concept.interviewTips && concept.interviewTips.length > 0 && (
                        <div className="concept-highlight tips">
                          <strong>🎯 Interview Tips</strong>
                          <ul>
                            {concept.interviewTips.map((t, i) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {concept.relatedVideoIds.length > 0 && (
                        <div className="related-videos">
                          <strong>🎬 Related Videos</strong>
                          <div className="related-video-list">
                            {concept.relatedVideoIds.map((vid) => {
                              const video = getVideoById(vid);
                              if (!video) return null;
                              return (
                                <a key={vid} href={`#${vid}`} className="related-video-link">
                                  {video.title} ({video.duration})
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <Link to={`/module/${concept.moduleId}`} className="module-link">
                        Go to {mod?.title} module →
                      </Link>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
