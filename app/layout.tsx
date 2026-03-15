import type { Metadata } from "next";
import { ToastProvider } from "@/components/common/toast-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIニュースダッシュボード",
  description: "Hacker News と各社公式情報を日本語UIでまとめて確認できるAIニュース収集アプリ"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
