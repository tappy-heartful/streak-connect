import type { Metadata } from "next";
import AboutClient from "@/src/features/about/views/AboutClient";

export const metadata: Metadata = {
  title: "サイト情報",
  description: "Streak Connectのサイト情報、予約規定、免責事項、プライバシーポリシー",
};

export default function AboutPage() {
  return <AboutClient />;
}
