import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "모음 — 나만의 플레이리스트",
  description: "취향과 새로운 발견을 섞어 만드는 음악 플레이리스트",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
