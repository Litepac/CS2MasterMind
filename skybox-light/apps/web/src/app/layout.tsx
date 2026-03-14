import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Litepac's Mastermind",
  description: "Local-first CS2 demo review and replay workspace"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
