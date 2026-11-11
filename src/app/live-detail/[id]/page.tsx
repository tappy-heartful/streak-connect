import type { Metadata } from "next";
import LiveDetailClient from "@/src/features/live/views/LiveDetailClient";

export const metadata: Metadata = {
  title: "LIVE INFO",
  description: "ライブ公演詳細およびチケット予約",
};

export default async function LiveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LiveDetailClient id={id} />;
}
