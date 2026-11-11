import type { Metadata } from "next";
import AgreementClient from "@/src/features/agreement/views/AgreementClient";

export const metadata: Metadata = {
  title: "利用規約",
  description: "Streak Connectの利用規約およびプライバシーポリシー同意画面",
};

export default function AgreementPage() {
  return <AgreementClient />;
}
