import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가대알림 · 관심 공지 푸시",
  description: "가톨릭대학교 관심 키워드 공지를 휴대폰 푸시로 미리 체험하는 웹 목업",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
