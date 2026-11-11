"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { redirectToLineLogin } from "@/src/lib/functions";

export default function Header() {
  const pathname = usePathname();
  const { user, userData, loading } = useAuth();

  const isSelected = (path: string) => (pathname === path ? "selected" : "");

  /**
   * ログイン/マイページ クリック時のハンドリング
   */
  const handleProfileClick = async (e: React.MouseEvent) => {
    // 未ログイン時のみログイン処理を実行
    if (!user) {
      e.preventDefault(); // 通常のLink遷移をキャンセル
      await redirectToLineLogin(window.location.href);
    }
    // ログイン済みの場合は、Linkタグの本来の挙動で /mypage へ遷移する
  };

  return (
    <header className="main-header">
      <nav className="nav-container">
        <Link href="/" className={`nav-item ${isSelected("/")}`}>
          Home
        </Link>

        {!loading && (
          <Link
            href="/mypage"
            onClick={handleProfileClick}
            className={`nav-item profile-nav ${isSelected("/mypage")}`}
          >
            <span className="nav-text">{user ? "MyPage" : "Login"}</span>
            <div className="header-user-icon">
              <img
                src={
                  userData?.pictureUrl ||
                  "https://tappy-heartful.github.io/streak-images/connect/line-profile-unset.png"
                }
                alt="icon"
                id="header-icon-img"
              />
            </div>
          </Link>
        )}
      </nav>
    </header>
  );
}