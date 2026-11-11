import type { Metadata } from "next";
import { Suspense } from "react";
import CallbackClient from "@/src/features/auth/views/CallbackClient";

export const metadata: Metadata = {
  title: "LINE認証",
  description: "LINEログインコールバック処理",
};

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="loading-screen">Authenticating...</div>}>
      <CallbackClient />
    </Suspense>
  );
}
