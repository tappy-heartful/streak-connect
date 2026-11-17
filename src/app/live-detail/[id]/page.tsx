import type { Metadata } from "next";
import LiveDetailClient from "@/src/features/live/views/LiveDetailClient";
import { getLiveServer } from "@/src/features/live/api/live-server-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!id) return { title: "LIVE INFO" };

  try {
    const live = await getLiveServer(id);
    return {
      title: live?.title ? `${live.title} - LIVE INFO` : "LIVE INFO",
      description: "ライブ公演詳細およびチケット予約",
    };
  } catch {
    return { title: "LIVE INFO" };
  }
}

export const dynamic = "force-dynamic";

export default async function LiveDetailPage({ params }: Props) {
  const { id } = await params;
  const initialLive = await getLiveServer(id);
  return <LiveDetailClient id={id} initialLive={initialLive} />;
}

