import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./_components/sidebar";
import { HistoryProvider } from "./_components/history-context";
import { ResearchRunProvider } from "./_components/research-run-context";

export const metadata: Metadata = {
  title: "WhoisP",
  description: "Research service documenting usage notes and history.",
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
        <ResearchRunProvider>
          <HistoryProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-h-screen flex-1 flex-col pl-72">
                <main className="flex-1 px-4 py-6 md:px-8">
                  {children}
                </main>
              </div>
            </div>
          </HistoryProvider>
        </ResearchRunProvider>
      </body>
    </html>
  );
}
