"use client";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden rounded-xl border bg-card">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop)'
        }}
      />
      <div className="relative p-8 md:p-12">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
          個人情報検索アプリ
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          氏名・会社名・役職から、WebやSNS上の公開情報を素早く横断検索。調査・本人確認・セルフチェックに。
        </p>
      </div>
    </section>
  );
}