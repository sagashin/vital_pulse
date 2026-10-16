import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VITAL PULSE | Local-First AI Health & Readiness OS",
    short_name: "VITAL PULSE",
    description:
      "完全ローカル完結型の次世代ヘルスケア・ライフログ＆AIコンディション分析アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

