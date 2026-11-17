import type { Metadata } from "next";
import TicketReserveClient from "@/src/features/ticket/views/TicketReserveClient";
import { getLiveServer } from "@/src/features/ticket/api/ticket-server-actions";

export const metadata: Metadata = {
  title: "RESERVATION",
  description: "ライブチケット予約・変更フォーム",
};

export const dynamic = "force-dynamic";

export default async function TicketReservePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let initialLive = null;
  try {
    initialLive = await getLiveServer(id);
  } catch (e) {
    console.error("TicketReservePage getLiveServer error:", e);
  }
  return <TicketReserveClient id={id} initialLive={initialLive} />;
}

