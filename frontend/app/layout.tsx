import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "PTIT Schedule Sync",
  description: "Công cụ đồng bộ lịch học từ QLDT PTIT sang Google Calendar",
  verification: {
    google: "1DwHwIzxQtGQilKfW7YRV617HZjf18z6xRqeR7fMv4o",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
