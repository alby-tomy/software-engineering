import './VideoEmbed.css';

interface VideoEmbedProps {
  youtubeId: string;
  title: string;
}

export function VideoEmbed({ youtubeId, title }: VideoEmbedProps) {
  return (
    <div className="video-embed">
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
