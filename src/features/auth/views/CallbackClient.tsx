"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  setSession,
} from "@/src/lib/functions";
import styles from "./callback.module.css";
import { processLineCallback } from "../api/auth-client-service";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      handleLogin(code, state);
    }
  }, [searchParams]);

  async function handleLogin(code: string, state: string) {
    try {
      showSpinner();
      const redirectUri = window.location.origin + window.location.pathname;

      const { finalData, redirectAfterLogin } = await processLineCallback(
        code,
        state,
        redirectUri
      );

      // 規約同意チェック & リダイレクト
      if (!finalData?.agreedAt) {
        setSession("redirectAfterLogin", redirectAfterLogin || "/home");
        router.push("/agreement");
      } else {
        router.push(redirectAfterLogin || "/home");
      }
    } catch (e: any) {
      console.error(e);
      await showDialog("ログインに失敗しました: " + e.message, true);
      router.push("/home");
    } finally {
      hideSpinner();
    }
  }

  return (
    <div className={styles.loadingScreen}>
      <div className={styles.spinner}></div>
      <p>LINE認証情報を確認しています...</p>
    </div>
  );
}

export default function CallbackClient() {
  return (
    <Suspense
      fallback={
        <div className={styles.loadingScreen}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

