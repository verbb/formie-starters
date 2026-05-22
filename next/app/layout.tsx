import type { Metadata } from "next";
import "./globals.css";
import "@verbb/formie-browser/css/formie-base.css";
import "@verbb/formie-browser/css/formie-theme.css";

export const metadata: Metadata = {
  title: "Formie Next Starter",
  description: "Formie Next.js starter: HTML and client-rendered modes with REST and GraphQL transports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
