import type { Metadata } from "next";
import ClientLayout from "./ClientLayout";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    template: "%s | SSJO Connect",
    default: "SSJO Connect | Swing Streak Jazz Orchestra",
  },
  description: "Swing Streak Jazz Orchestra Official Store & Reserve",
  icons: {
    icon: "https://tappy-heartful.github.io/streak-images/connect/favicon.png",
    apple: "https://tappy-heartful.github.io/streak-images/connect/favicon.png",
  },
  openGraph: {
    title: {
      template: "%s | SSJO Connect",
      default: "SSJO Connect | Swing Streak Jazz Orchestra",
    },
    description: "Swing Streak Jazz Orchestra Official Store & Reserve",
    siteName: "SSJO Connect",
    locale: "ja_JP",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SSJO Connect",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
