import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhoisP",
  description: "Retired research prototype documenting usage notes and history.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-border">
            <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 text-sm">
              <Link href="/" className="text-base font-semibold tracking-tight">
                WhoisP
              </Link>
              <div className="flex items-center gap-4">
                <Link href="/disclaimer" className="underline underline-offset-4">
                  Usage notes
                </Link>
                <Link href="/ja" className="underline underline-offset-4">
                  日本語
                </Link>
              </div>
            </nav>
          </header>
          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
