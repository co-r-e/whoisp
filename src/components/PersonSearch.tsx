"use client";

import PersonSearchForm from "./PersonSearchForm";

const copyJa = {
  cardDescription: "会社名・役職・氏名を入力し、WebやSNSから公開情報を横断検索します。",
  labels: {
    fullName: "氏名",
    company: "会社名",
    position: "役職",
    extraInfo: "補足情報（任意）",
  },
  placeholders: {
    fullName: "例: 山田 太郎",
    company: "例: 株式会社サンプル",
    position: "例: 代表取締役 / エンジニア",
    extraInfo: "例: ニックネーム、出身大学、所属部門 など",
  },
  button: {
    idle: "検索",
    loading: "検索中...",
  },
  disclaimerLinkText: "利用上の注意・免責事項",
  errorMessages: {
    fetch: "検索に失敗しました",
    generic: "エラーが発生しました",
  },
  results: {
    title: "リサーチサマリー",
    description: "",
    overviewHeading: "全体像",
    referencesHeading: "参照リンク",
    noReferences: "参照リンクは見つかりませんでした。",
    providerLabel: "",
    placeholder: "検索結果はここに表示されます。条件を入力して検索してください。",
    loadingTitle: "公開情報を探索しています…",
    loadingDescription: "しばらくお待ちください。まもなくハイライトが表示されます。",
  },
} as const;

type Props = {
  projectId?: string;
  lang?: "ja" | "en";
};

export default function PersonSearch({ projectId, lang }: Props) {
  return <PersonSearchForm projectId={projectId} lang={lang ?? "ja"} copy={copyJa} />;
}
