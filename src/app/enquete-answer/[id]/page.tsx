import type { Metadata } from "next";
import EnqueteAnswerClient from "@/src/features/enquete/views/EnqueteAnswerClient";

export const metadata: Metadata = {
  title: "QUESTIONNAIRE",
  description: "来場者アンケート回答フォーム",
};

export default async function EnqueteAnswerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EnqueteAnswerClient id={id} />;
}
