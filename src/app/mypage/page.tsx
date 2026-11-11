import type { Metadata } from "next";
import MyPageClient from "@/src/features/mypage/views/MyPageClient";

export const metadata: Metadata = {
  title: "MY PAGE",
  description: "ユーザープロフィールおよび予約チケット管理",
};

export default function MyPage() {
  return <MyPageClient />;
}
