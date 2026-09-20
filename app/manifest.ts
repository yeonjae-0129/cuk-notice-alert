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
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
