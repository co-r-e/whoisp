export type Locale = "en" | "ja";

export type StepExecutionStatus = "pending" | "running" | "completed" | "partial" | "failed" | "cancelled";

export type DeepResearchProgressStage = "idle" | "images" | "planning" | "evidence" | "synthesis" | "done";

export type DeepResearchImage = {
  url: string;
  title?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  sourceTitle?: string;
};

export type SourceReference = {
  id: string;
  url: string;
  title: string;
  domain?: string;
};

export type DeepResearchPlanStep = {
  id: string;
  title: string;
  query: string;
  angle: string;
  deliverable: string;
};

export type DeepResearchPlan = {
  primaryGoal: string;
  rationale: string;
  steps: DeepResearchPlanStep[];
  expectedInsights: string[];
};

export type StepFinding = {
  heading: string;
  insight: string;
  evidence: string;
  confidence?: string;
  sources: SourceReference[];
};

export type StepResult = {
  stepId: string;
  title: string;
  status: Extract<StepExecutionStatus, "completed" | "partial" | "failed">;
  summary: string;
  queries: string[];
  findings: StepFinding[];
  sources: SourceReference[];
  errorMessage?: string;
};

export type DeepResearchServerEvent =
  | { type: "images"; images: DeepResearchImage[] }
  | { type: "plan"; plan: DeepResearchPlan }
  | {
      type: "progress";
      stage: DeepResearchProgressStage;
      message: string;
      completedSteps?: number;
      totalSteps?: number;
    }
  | { type: "step-status"; stepId: string; status: StepExecutionStatus }
  | { type: "search"; step: StepResult }
  | { type: "analysis"; notes: string }
  | { type: "final"; report: string; sources: SourceReference[] };

export type DeepResearchStreamEvent =
  | DeepResearchServerEvent
  | { type: "status"; status: string }
  | { type: "done" }
  | { type: "error"; message: string };
