"use client";

import PersonSearch from "@/components/PersonSearch";

export default function HomeJa() {
  return (
    <main className="min-h-screen w-full px-4 pt-6 pb-10 md:px-6 md:pt-8 md:pb-14 flex flex-col">
      <div className="w-full max-w-6xl space-y-6 lg:mx-0 flex-1">
        <PersonSearch />
      </div>
      <footer className="mt-auto pt-12 text-sm text-muted-foreground">
        <p className="mx-auto w-full max-w-3xl">
          本アプリは公開情報のみを対象に検索します。詳細は
          <a className="underline underline-offset-4" href="/disclaimer">利用上の注意・免責事項</a>
          をご確認ください。
        </p>
      </footer>
    </main>
  );
}
