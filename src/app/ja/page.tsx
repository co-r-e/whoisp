export default function HomeJa() {
  return (
    <div className="w-full px-4 pt-8 pb-12 md:px-6 md:pt-10 md:pb-16 flex flex-col gap-12">
      <section className="mx-auto w-full max-w-5xl space-y-4">
        <h1 className="text-3xl font-semibold">WhoisP</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          検索機能は終了しました。利用上の注意・免責事項で最新の案内をご確認ください。
        </p>
        <a
          className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
          href="/disclaimer"
        >
          利用上の注意・免責事項を開く
        </a>
      </section>
      <section className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        検索機能は廃止されました。利用上の注意・免責事項でプロジェクト概要をご確認ください。
      </section>
    </div>
  );
}
