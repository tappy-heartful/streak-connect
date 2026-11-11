import type { Metadata } from "next";
import { Suspense } from "react";
import TicketDetailClient from "@/src/features/ticket/views/TicketDetailClient";

export const metadata: Metadata = {
  title: "TICKET",
  description: "デジタルチケット入場証",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div id="spinner-overlay" style={{ display: "flex" }}>
          <div className="spinner"></div>
        </div>
      }
    >
      <TicketDetailClient id={id} />
    </Suspense>
  );
}
