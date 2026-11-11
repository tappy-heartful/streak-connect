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
    // 画面遷移時にスピナーを閉じる
    hideSpinner();
  }, [pathname, searchParams, user]);

  return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BreadcrumbProvider>
        <Header />
        {children}
        <Footer />
        <CommonDialog />
        <ImagePreviewModal />
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

