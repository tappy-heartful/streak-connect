"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/src/contexts/AuthContext";
import { BreadcrumbProvider } from "@/src/contexts/BreadcrumbContext";
import { useEffect, Suspense } from "react";
import Script from "next/script";
import Header from "../components/Header";
import Footer from "../components/Footer";
import CommonDialog from "@/src/components/CommonDialog";
import ImagePreviewModal from "@/src/components/ImagePreviewModal";
import { hideSpinner } from "@/src/lib/functions";

function RouteChangeListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    // 画面遷移完了時にスピナーを閉じる
    hideSpinner();
  }, [pathname, searchParams, user]);

  return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 内部リンク（<a>タグ）クリック時に即座にスピナーを表示する (streak-navi準拠)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      if (
        href &&
        href.startsWith("/") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const currentPath = window.location.pathname + window.location.search;
        if (href === currentPath || href === window.location.pathname) {
          return;
        }
        import("@/src/lib/functions").then((mod) => mod.showSpinner());
      }
    };

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, []);

  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <Header />
        {children}
        <Footer />
        <CommonDialog />
        <ImagePreviewModal />
        <div id="spinner-overlay" style={{ display: "none" }}>
          <div className="spinner"></div>
        </div>
        <Script
          src="https://www.instagram.com/embed.js"
          strategy="afterInteractive"
        />
        <Suspense fallback={null}>
          <RouteChangeListener />
        </Suspense>
      </BreadcrumbProvider>
    </AuthProvider>
  );
}

