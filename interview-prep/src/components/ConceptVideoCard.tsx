import type { VideoLesson } from '../types/curriculum';
import { VideoEmbed } from './VideoEmbed';
import { MarkdownContent } from './MarkdownContent';
import './ConceptVideoCard.css';

interface ConceptVideoCardProps {
  video: VideoLesson;
  showEmbed?: boolean;
  compact?: boolean;
}

export function ConceptVideoCard({ video, showEmbed = true, compact = false }: ConceptVideoCardProps) {
  return (
    <article className={`concept-video-card ${compact ? 'compact' : ''}`} id={video.id}>
      <header className="concept-video-header">
        <div className="concept-video-meta">
          <span className="concept-tag">{video.concept}</span>
          <span className={`level-tag level-${video.level}`}>{video.level}</span>
          {video.watchOrder != null && (
            <span className="watch-order">Lesson {video.watchOrder}</span>
          )}
        </div>
        <h3>{video.title}</h3>
        <p className="concept-video-desc">{video.description}</p>
        <div className="concept-video-info">
          <span>📺 {video.channel}</span>
          <span>⏱️ {video.duration}</span>
          <a
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="youtube-link"
          >
            Open on YouTube ↗
          </a>
        </div>
      </header>

      {showEmbed && <VideoEmbed youtubeId={video.youtubeId} title={video.title} />}

      {!compact && (
        <div className="concept-video-body">
          <section className="concept-section">
            <h4>📖 Detailed Explanation</h4>
            <MarkdownContent content={video.detailedExplanation} />
          </section>

          <section className="concept-section">
            <h4>🎯 Key Takeaways</h4>
            <ul className="takeaways-list">
              {video.keyTakeaways.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </article>
  );
}
