"use client";

import { useEffect, useState } from "react";
import styles from "./ImagePreviewModal.module.css";

let setter: (url: string | null) => void;

export function openImagePreview(url: string) {
  if (setter) {
    setter(url);
  }
}

export default function ImagePreviewModal() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setter = setImageUrl;
  }, []);

  if (!imageUrl) return null;

  return (
    <div className={styles.overlay} onClick={() => setImageUrl(null)}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeHint}
          onClick={() => setImageUrl(null)}
          aria-label="閉じる"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <img
          src={imageUrl}
          alt="Preview"
          className={styles.image}
          onClick={() => setImageUrl(null)}
        />
      </div>
    </div>
  );
}

