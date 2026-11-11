"use client";

import { useState, useEffect } from "react";
import styles from "./CommonDialog.module.css";

export interface DialogOptions {
  message: string;
  isOKOnly?: boolean;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  resolve: (value: any) => void;
}

let setter: (options: DialogOptions | null) => void;

export function showDialog(
  message: string,
  isOKOnly = false,
  isPrompt = false,
  promptPlaceholder = ""
): Promise<any> {
  return new Promise((resolve) => {
    if (setter) {
      setter({ message, isOKOnly, isPrompt, promptPlaceholder, resolve });
    } else {
      resolve(false);
    }
  });
}

export default function CommonDialog() {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    setter = setOptions;
  }, []);

  useEffect(() => {
    if (options?.isPrompt) {
      setPromptValue("");
    }
  }, [options]);

  if (!options) return null;

  const handleClose = (result: boolean) => {
    if (options.isPrompt) {
      options.resolve(result ? promptValue : null);
    } else {
      options.resolve(result);
    }
    setOptions(null);
  };

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogBox}>
        <p className={styles.dialogMessage}>{options.message}</p>

        {options.isPrompt && (
          <input
            type="text"
            className={styles.promptInput}
            value={promptValue}
            placeholder={options.promptPlaceholder}
            onChange={(e) => setPromptValue(e.target.value)}
            autoFocus
          />
        )}

        <div className={styles.dialogButtons}>
          <button
            type="button"
            className={`${styles.btn} ${styles.dialogOk}`}
            onClick={() => handleClose(true)}
          >
            {options.isOKOnly ? "OK" : "はい"}
          </button>
          {!options.isOKOnly && (
            <button
              type="button"
              className={`${styles.btn} ${styles.dialogCancel}`}
              onClick={() => handleClose(false)}
            >
              いいえ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
