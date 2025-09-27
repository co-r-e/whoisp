export const enStrings = {
  queryLabel: "Research query",
  placeholder: "What do you need to investigate?",
  submit: "Run DeepResearch",
  stop: "Cancel",
  idleStatus: "Enter a query to start a new investigation.",
  runningStatus: "Research in progress…",
  planHeading: "Research plan",
  planExpectation: "Steps refresh automatically as the planner decomposes the question into focused sub-queries.",
  evidenceHeading: "Evidence digests",
  reportHeading: "Final report",
  sourcesHeading: "References",
  errorLabel: "Error",
} as const;

export const jaStrings = {
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
} as const;

export type DeepResearchUiStrings = typeof enStrings;
