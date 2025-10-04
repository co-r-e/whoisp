export type Locale = "en" | "ja";

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
  summary: string;
  queries: string[];
  findings: StepFinding[];
  sources: SourceReference[];
};

export type DeepResearchServerEvent =
  | { type: "images"; images: DeepResearchImage[] }
  | { type: "plan"; plan: DeepResearchPlan }
  | { type: "search"; step: StepResult }
  | { type: "analysis"; notes: string }
  | { type: "final"; report: string; sources: SourceReference[] };

export type DeepResearchStreamEvent =
  | DeepResearchServerEvent
  | { type: "status"; status: string }
  | { type: "done" }
  | { type: "error"; message: string };
