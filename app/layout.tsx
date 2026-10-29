import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIME · 研究留有依据",
  description: "把投资判断变成可以继续验证的研究任务。保存依据，检查变化，保留你的判断。",
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
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
