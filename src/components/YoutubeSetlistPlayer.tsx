"use client";

import { useState, useMemo, useEffect } from "react";
import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface YoutubeSetlistPlayerProps {
  setlist: any[]; // live.setlist をそのまま渡す
  title?: string;
}

// YouTube URLからIDを抽出する内部ユーティリティ
const extractYouTubeId = (input: string) => {
  if (!input) return "";
  try {
    const url = new URL(input);
    return url.searchParams.get('v') || url.pathname.split('/').pop() || input;
  } catch {
    return input;
  }
};

export default function YoutubeSetlistPlayer({ setlist, title = "セットリスト" }: YoutubeSetlistPlayerProps) {
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVideoIds = async () => {
      if (!setlist || !Array.isArray(setlist)) return;

      const allSongIds = setlist.flatMap((item: any) => item.songIds || []);
      if (allSongIds.length === 0) return;

      setLoading(true);
      try {
        const uniqueSongIds = Array.from(new Set(allSongIds)) as string[];
        const scoresRef = collection(db, "scores");
        // Firestoreの 'in' クエリは最大30件までのため slice
        const q = query(scoresRef, where("__name__", "in", uniqueSongIds.slice(0, 30)));
        const scoresSnap = await getDocs(q);

        const videoIdMap: Record<string, string> = {};
        scoresSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.referenceTrack) {
            const vid = extractYouTubeId(data.referenceTrack);
            if (vid && vid.length === 11) {
              videoIdMap[doc.id] = vid;
            }
          }
        });

        const vids = allSongIds
          .map(sid => videoIdMap[sid as string])
          .filter(Boolean);

        setVideoIds(vids);
      } catch (e) {
        console.error("Failed to fetch setlist videos:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoIds();
  }, [setlist]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videoIds.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < videoIds.length - 1 ? prev + 1 : 0));
  };

  const embedUrl = useMemo(() => {
    if (videoIds.length === 0) return "";
    const currentId = videoIds[currentIndex];
    // ループ再生とリスト機能を有効化
    return `https://www.youtube.com/embed/${currentId}?playlist=${videoIds.join(",")}&loop=1`;
  }, [videoIds, currentIndex]);

  const playlistLink = useMemo(() => {
    if (videoIds.length === 0) return "";
    return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`;
  }, [videoIds]);

  if (loading || videoIds.length === 0) return null;

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