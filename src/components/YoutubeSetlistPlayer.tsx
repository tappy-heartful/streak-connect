"use client";

import { useState, useMemo } from "react";

interface YoutubeSetlistPlayerProps {
  videoIds: string[];
  title?: string;
}

export default function YoutubeSetlistPlayer({ videoIds, title = "本日のセットリスト" }: YoutubeSetlistPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videoIds.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < videoIds.length - 1 ? prev + 1 : 0));
  };

  const embedUrl = useMemo(() => {
    if (videoIds.length === 0) return "";
    const currentId = videoIds[currentIndex];
    const playlist = videoIds.join(",");
    return `https://www.youtube.com/embed/${currentId}?playlist=${playlist}&loop=1`;
  }, [videoIds, currentIndex]);

  const playlistLink = useMemo(() => {
    if (videoIds.length === 0) return "";
    return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`;
  }, [videoIds]);

  if (videoIds.length === 0) return null;

  return (
    <div className="yt-setlist-section" style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
          <i className="fa-solid fa-list-ol" style={{ marginRight: '8px', color: '#f00' }}></i>
          {title}
        </h3>
        <a href={playlistLink} target="_blank" rel="noreferrer" className="btn-yt-playlist">
          <i className="fa-brands fa-youtube"></i> すべて再生
        </a>
      </div>

      <div className="yt-player-container">
        <div className="yt-video-wrapper">
          <iframe
            src={embedUrl}
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>

        <div className="yt-controls">
          <button type="button" onClick={handlePrev} className="yt-control-btn">
            <i className="fa-solid fa-chevron-left"></i>
            <span>Prev</span>
          </button>

          <div className="yt-status-info">
            <span className="yt-counter">
              {String(currentIndex + 1).padStart(2, '0')}
              <span className="yt-counter-sep">/</span>
              {String(videoIds.length).padStart(2, '0')}
            </span>
            <span className="yt-label">TRACK NUMBER</span>
          </div>

          <button type="button" onClick={handleNext} className="yt-control-btn">
            <i className="fa-solid fa-chevron-right"></i>
            <span>Next</span>
          </button>
        </div>
      </div>
    </div>
  );
}