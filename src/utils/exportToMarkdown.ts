import { saveAs } from "file-saver";

import type {
  DeepResearchPlan,
  Locale,
  SourceReference,
  StepExecutionStatus,
  StepResult,
} from "@/shared/deep-research-types";

type ExportData = {
  query: string;
  plan: DeepResearchPlan | null;
  steps: StepResult[];
  report: string | null;
  sources: SourceReference[];
  locale: Locale;
};

function sanitizeFileName(query: string): string {
  return query.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, "_");
}

function getStatusLabel(status: StepExecutionStatus, locale: Locale): string {
  if (locale === "ja") {
    switch (status) {
      case "running":
        return "実行中";
      case "completed":
        return "完了";
      case "partial":
        return "部分的";
      case "failed":
        return "失敗";
      case "cancelled":
        return "中断済み";
      default:
        return "待機中";
    }
  }

  switch (status) {
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "partial":
      return "Partial";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function buildMarkdown({ query, plan, steps, report, sources, locale }: ExportData): string {
  const isJapanese = locale === "ja";
  const generatedAt = isJapanese
    ? `生成日時: ${new Date().toLocaleString("ja-JP")}`
    : `Generated: ${new Date().toLocaleString("en-US")}`;

  const sections: string[] = [`# ${query}`, "", generatedAt];

  if (plan) {
    sections.push("", `## ${isJapanese ? "調査計画" : "Research Plan"}`, "");
    sections.push(`- **${isJapanese ? "目的" : "Primary Goal"}**: ${plan.primaryGoal}`);
    sections.push(`- **${isJapanese ? "根拠" : "Rationale"}**: ${plan.rationale}`);

    if (plan.expectedInsights.length > 0) {
      sections.push("", `### ${isJapanese ? "期待する論点" : "Expected Insights"}`, "");
      sections.push(...plan.expectedInsights.map((item) => `- ${item}`));
    }

    sections.push("", `### ${isJapanese ? "調査ステップ" : "Investigation Steps"}`, "");
    sections.push(
      ...plan.steps.map(
        (step) =>
          `- **${step.id} ${step.title}**\n  - ${isJapanese ? "クエリ" : "Query"}: ${step.query}\n  - ${isJapanese ? "着眼点" : "Angle"}: ${step.angle}\n  - ${isJapanese ? "成果物" : "Deliverable"}: ${step.deliverable}`,
      ),
    );
  }

  if (steps.length > 0) {
    sections.push("", `## ${isJapanese ? "収集したエビデンス" : "Collected Evidence"}`, "");

    for (const step of steps) {
      sections.push(`### ${step.stepId}: ${step.title}`, "");
      sections.push(`- **${isJapanese ? "状態" : "Status"}**: ${getStatusLabel(step.status, locale)}`);
      if (step.summary) {
        sections.push(`- **${isJapanese ? "要約" : "Summary"}**: ${step.summary}`);
      }
      if (step.findings.length > 0) {
        sections.push("", `#### ${isJapanese ? "発見" : "Findings"}`, "");
        sections.push(
          ...step.findings.map((finding) => {
            const citations = finding.sources.map((source) => `[${source.id}]`).join(" ");
            return `- **${finding.heading}**: ${finding.insight}${finding.evidence ? `\n  - ${isJapanese ? "根拠" : "Evidence"}: ${finding.evidence}` : ""}${citations ? `\n  - ${isJapanese ? "参照" : "Sources"}: ${citations}` : ""}`;
          }),
        );
      }
    }
  }

  if (report) {
    sections.push("", `## ${isJapanese ? "最終レポート" : "Final Report"}`, "", report);
  }

  if (sources.length > 0) {
    sections.push("", `## ${isJapanese ? "参照元" : "References"}`, "");
    sections.push(
      ...sources.map(
        (source) =>
          `- [${source.id}] **${source.title}**${source.domain ? ` (${source.domain})` : ""}\n  - ${source.url}`,
      ),
    );
  }

  sections.push(
    "",
    isJapanese
      ? "> このエクスポートは一時セッションの内容を保存したものです。"
      : "> This export captures a temporary session.",
  );

  return sections.join("\n");
}

export async function exportToMarkdown(data: ExportData): Promise<void> {
  const markdown = buildMarkdown(data);
  const fileName = `whoisp_${sanitizeFileName(data.query)}_${new Date().toISOString().split("T")[0]}.md`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, fileName);
}
