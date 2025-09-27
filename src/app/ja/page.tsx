import DeepResearchClient from "../_components/deep-research-client";

const strings = {
  title: "WhoisP 徹底調査",
  lead: "Gemini を活用したマルチホップ調査で信頼できる根拠と要約を取得します。",
  queryLabel: "調査したい内容",
  placeholder: "調べたいテーマを入力してください",
  submit: "DeepResearch を実行",
  stop: "中止",
  idleStatus: "クエリを入力して調査を開始してください。",
  runningStatus: "調査を実行中…",
  planHeading: "調査プラン",
  planExpectation: "質問を細分化するたびにステップが自動的に更新されます。",
  evidenceHeading: "エビデンス概要",
  reportHeading: "最終レポート",
  sourcesHeading: "参照元",
  errorLabel: "エラー",
};

export default function HomeJa() {
  return <DeepResearchClient locale="ja" strings={strings} />;
}
