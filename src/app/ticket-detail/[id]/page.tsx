import type { Metadata } from "next";
import TicketDetailClient from "@/src/features/ticket/views/TicketDetailClient";
import { getTicketServer, getLiveServer } from "@/src/features/ticket/api/ticket-server-actions";

export const metadata: Metadata = {
  title: "TICKET",
  description: "デジタルチケット入場証",
};

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let initialTicket = null;
  let initialLive = null;

  try {
    initialTicket = await getTicketServer(id);
    if (initialTicket?.liveId) {
      initialLive = await getLiveServer(initialTicket.liveId);
    }
  } catch (e) {
    console.error("TicketDetailPage server error:", e);
  }

  return (
    <TicketDetailClient
      id={id}
      initialTicket={initialTicket}
      initialLive={initialLive}
    />
  );
}
