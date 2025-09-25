import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用上の注意・免責事項 | WhoisP",
};

export default function DisclaimerPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 prose dark:prose-invert">
      <h1>利用上の注意・免責事項</h1>
      <p>
        本アプリは、氏名・会社名・役職などの入力情報をもとに、検索エンジン/スクレイピングAPIを利用して
        Web上の公開情報を横断的に収集・整理するためのツールです。
      </p>
      <h2>重要事項</h2>
      <ul>
        <li>取得対象は「公開されている情報」に限られます。非公開領域の取得は行いません。</li>
        <li>検索結果の正確性・完全性を保証するものではありません。最終判断はご自身でご確認ください。</li>
        <li>個人のプライバシーと各サービスの利用規約を尊重し、適切な目的の範囲でご利用ください。</li>
        <li>スクレイピングAPIの利用には、各提供元の規約に従う必要があります。</li>
      </ul>
      <h2>推奨される使い方</h2>
      <ul>
        <li>ご本人のセルフチェック（デジタルフットプリントの確認）</li>
        <li>公開プロフィールの整合性確認</li>
        <li>採用・取引等における適正なリサーチ（法令順守の範囲内）</li>
      </ul>
      <h2>禁止される使い方</h2>
      <ul>
        <li>差別・ハラスメント・ストーキングなど、第三者の権利を侵害する行為</li>
        <li>違法な目的や詐欺行為</li>
        <li>脆弱性の悪用・不正アクセス・プラットフォーム規約違反</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        本アプリの利用により生じたいかなる損害に対しても、開発者は責任を負いません。
      </p>
    </main>
  );
}
