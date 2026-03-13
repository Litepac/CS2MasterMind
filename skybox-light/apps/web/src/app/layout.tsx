import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skybox Light",
  description: "Local-first CS2 demo analysis"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
