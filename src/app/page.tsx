"use client";

import PersonSearchEn from "@/components/PersonSearchEn";

export default function Home() {
  return (
    <main className="min-h-screen w-full px-4 pt-6 pb-10 md:px-6 md:pt-8 md:pb-14 flex flex-col">
      <div className="w-full max-w-6xl space-y-6 lg:mx-0 flex-1">
        <PersonSearchEn />
      </div>
      <footer className="mt-auto pt-12 text-sm text-muted-foreground">
        <p className="mx-auto w-full max-w-3xl">
          This app searches only publicly available information. See{" "}
          <a className="underline underline-offset-4" href="/disclaimer">
            Usage notes & disclaimer
          </a>{" "}
          for details.
        </p>
      </footer>
    </main>
  );
}
