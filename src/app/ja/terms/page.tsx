import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | WhoisP",
};

export default function TermsJaPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">利用規約と利用上の注意</h1>
        <p className="text-sm text-muted-foreground">
          本プロトタイプの利用条件と安全にお使いいただくための注意事項をご確認ください。
        </p>
      </header>
      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          本サービスを利用することで、利用者は調査を適切に行い、プライバシーを尊重し、関連する法令や第三者の利用規約を遵守することに同意したものとみなします。生成された結果は現状有姿で提供され、最終的な判断・利用は利用者の責任となります。
        </p>
        <p>
          権限のない個人情報や機微情報を送信しないでください。嫌がらせ、差別的行為、または他者に損害を与える目的の利用は禁止され、アクセス停止の対象となります。
        </p>
        <p>
          本サービスは予告なく変更または終了する場合があります。データ保持は保証されず、メンテナンス時にセッションが削除される可能性があります。
        </p>
      </section>
      <section id="usage-notes" className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-medium">利用上の注意・免責事項</h2>
        <p className="text-sm text-muted-foreground">
          本アプリは、氏名・会社名・役職などの入力情報をもとに、検索エンジン/スクレイピングAPIを利用して Web上の公開情報を横断的に収集・整理するためのツールです。
        </p>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">重要事項</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>取得対象は「公開されている情報」に限られます。非公開領域の取得は行いません。</li>
            <li>検索結果の正確性・完全性を保証するものではありません。最終判断はご自身でご確認ください。</li>
            <li>個人のプライバシーと各サービスの利用規約を尊重し、適切な目的の範囲でご利用ください。</li>
            <li>スクレイピングAPIの利用には、各提供元の規約に従う必要があります。</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">推奨される使い方</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>公開プロフィールの整合性確認</li>
            <li>採用・取引等における適正なリサーチ（法令順守の範囲内）</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">禁止される使い方</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>差別・ハラスメント・ストーキングなど、第三者の権利を侵害する行為</li>
            <li>違法な目的や詐欺行為</li>
            <li>脆弱性の悪用・不正アクセス・プラットフォーム規約違反</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          本アプリの利用により生じたいかなる損害に対しても、開発者は責任を負いません。
        </p>
      </section>
    </div>
  );
}
