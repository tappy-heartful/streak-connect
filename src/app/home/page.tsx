import type { Metadata } from "next";
import HomeClient from "@/src/features/home/views/HomeClient";

export const metadata: Metadata = {
  title: "HOME",
  description: "Swing Streak Jazz Orchestraの公式ポータルサイトです。",
};

export default function HomePage() {
  return <HomeClient />;
}
