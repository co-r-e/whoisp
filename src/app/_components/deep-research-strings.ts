export const enStrings = {
  queryLabel: "Research query",
  placeholder: "Person name Company name",
  submit: "Run DeepResearch",
  stop: "Cancel",
  idleStatus: "Use the sidebar to start a new investigation.",
  runningStatus: "Research in progress…",
  planHeading: "Research plan",
  planExpectation: "",
  planEmpty: "No plan yet. Start a run to generate the investigation steps.",
  evidenceHeading: "Evidence digests",
  evidenceEmpty: "Evidence will appear here as the agent completes each step.",
  reportHeading: "Final report",
  reportEmpty: "Run DeepResearch to produce a final report.",
  sourcesHeading: "References",
  sourcesEmpty: "References will be listed once the run finishes.",
  errorLabel: "Error",
} as const;

export const jaStrings = {
  queryLabel: "調査したい内容",
  placeholder: "調査対象者名 会社名",
  submit: "DeepResearch を実行",
  stop: "中止",
  idleStatus: "サイドバーからクエリを入力して調査を開始してください。",
  runningStatus: "調査を実行中…",
  planHeading: "調査プラン",
  planExpectation: "",
  planEmpty: "まだプランはありません。調査を実行するとステップが表示されます。",
  evidenceHeading: "エビデンス概要",
  evidenceEmpty: "各ステップの完了とともにエビデンスが表示されます。",
  reportHeading: "最終レポート",
  reportEmpty: "調査を実行すると最終レポートがここに表示されます。",
  sourcesHeading: "参照元",
  sourcesEmpty: "調査完了後に参照元リンクが表示されます。",
  errorLabel: "エラー",
} as const;

export type DeepResearchUiStrings = typeof enStrings;
