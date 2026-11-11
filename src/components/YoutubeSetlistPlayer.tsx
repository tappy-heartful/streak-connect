"use client";

import { useState, useMemo, useEffect } from "react";
import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import styles from "./YoutubeSetlistPlayer.module.css";

interface YoutubeSetlistPlayerProps {
  setlist: any[]; // live.setlist を渡す
  title?: string;
}

const extractYouTubeId = (input: string) => {
  if (!input) return "";
  try {
    const url = new URL(input);
    return url.searchParams.get("v") || url.pathname.split("/").pop() || input;
  } catch {
    return input;
  }
};

export default function YoutubeSetlistPlayer({
  setlist,
  title = "セットリスト",
}: YoutubeSetlistPlayerProps) {
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
        const q = query(scoresRef, where("__name__", "in", uniqueSongIds.slice(0, 30)));
        const scoresSnap = await getDocs(q);

        const videoIdMap: Record<string, string> = {};
        scoresSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.referenceTrack) {
            const vid = extractYouTubeId(data.referenceTrack);
            if (vid && vid.length === 11) {
              videoIdMap[doc.id] = vid;
            }
          }
        });

        const vids = allSongIds
          .map((sid) => videoIdMap[sid as string])
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
    return `https://www.youtube.com/embed/${currentId}?playlist=${videoIds.join(",")}&loop=1`;
  }, [videoIds, currentIndex]);

  const playlistLink = useMemo(() => {
    if (videoIds.length === 0) return "";
    return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`;
  }, [videoIds]);

  if (loading || videoIds.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <i className={`fa-solid fa-list-ol ${styles.titleIcon}`}></i>
          {title}
        </h3>
        <a
          href={playlistLink}
          target="_blank"
          rel="noreferrer"
          className={styles.btnPlaylist}
        >
          <i className="fa-brands fa-youtube"></i> すべて再生
        </a>
      </div>

      <div className={styles.playerWrapper}>
        <iframe
          src={embedUrl}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.iframe}
        />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          onClick={handlePrev}
          className={styles.btnControl}
        >
          <i className="fa-solid fa-backward"></i> 前の曲
        </button>
        <span className={styles.counter}>
          {currentIndex + 1} / {videoIds.length}曲
        </span>
        <button
          type="button"
          onClick={handleNext}
          className={styles.btnControl}
        >
          次の曲 <i className="fa-solid fa-forward"></i>
        </button>
      </div>
    </div>
  );
}
