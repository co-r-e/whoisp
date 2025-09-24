"use client";

import PersonSearchEn from "@/components/PersonSearchEn";

export default function Home() {
  return (
    <main className="min-h-screen w-full px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <PersonSearchEn />
        <section className="text-sm text-muted-foreground">
          <p>
            This app searches only publicly available information. See
            <a className="underline underline-offset-4 ml-1" href="/disclaimer">Usage notes & disclaimer</a>
            for details.
          </p>
        </section>
      </div>
    </main>
  );
}