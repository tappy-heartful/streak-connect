import type { Metadata } from "next";
import TicketReserveClient from "@/src/features/ticket/views/TicketReserveClient";

export const metadata: Metadata = {
  title: "RESERVATION",
  description: "ライブチケット予約・変更フォーム",
};

export default async function TicketReservePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketReserveClient id={id} />;
}
