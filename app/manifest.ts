import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "가대알림",
    short_name: "가대알림",
    description: "가톨릭대학교 관심 공지를 실제 웹 푸시로 받는 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3f8",
    theme_color: "#6f2c72",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
