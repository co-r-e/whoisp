import PersonSearch from "@/components/PersonSearch";

export default async function ProjectPageJa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen w-full px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <PersonSearch projectId={id} lang="ja" />
        <section className="text-sm text-muted-foreground mx-auto w-full max-w-3xl">
          <p>
            本アプリは公開情報のみを対象に検索します。詳細は
            <a className="underline underline-offset-4" href="/disclaimer">利用上の注意・免責事項</a>
            をご確認ください。
          </p>
        </section>
      </div>
    </main>
  );
}
