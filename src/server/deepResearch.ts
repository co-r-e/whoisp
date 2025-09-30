import JSON5 from "json5";
import type { Candidate, Content, GroundingChunk } from "@google/genai";
import type { GoogleGenAI } from "@google/genai/node";
import { fetchSubjectImages } from "./fetchSubjectImages";
import { getGeminiClient } from "./geminiClient";
import type { DeepResearchImage } from "@/shared/deep-research-types";

type Locale = "en" | "ja";

type PlanStep = {
  id: string;
  title: string;
  query: string;
  angle: string;
  deliverable: string;
};

type DeepResearchPlan = {
  primaryGoal: string;
  rationale: string;
  steps: PlanStep[];
  expectedInsights: string[];
};

type SourceReference = {
  id: string;
  url: string;
  title: string;
  domain?: string;
};

type StepFinding = {
  heading: string;
  insight: string;
  evidence: string;
  confidence?: string;
  sources: SourceReference[];
};

type StepResult = {
  stepId: string;
  title: string;
  summary: string;
  queries: string[];
  findings: StepFinding[];
  sources: SourceReference[];
};

type DeepResearchEvent =
  | { type: "images"; images: DeepResearchImage[] }
  | { type: "plan"; plan: DeepResearchPlan }
  | { type: "search"; step: StepResult }
  | { type: "analysis"; notes: string }
  | { type: "final"; report: string; sources: SourceReference[] };

type RunOptions = {
  locale: Locale;
  signal?: AbortSignal;
  emit(event: DeepResearchEvent): Promise<void> | void;
};

type SourceCandidate = {
  index: number;
  url: string;
  title: string;
  domain?: string;
};

type PlanPayload = {
  primaryGoal: string;
  rationale: string;
  steps: Array<{
    id: string;
    title: string;
    query: string;
    angle: string;
    deliverable: string;
  }>;
  expectedInsights: string[];
};

type EvidencePayload = {
  summary: string;
  findings: Array<{
    heading: string;
    insight: string;
    evidence: string;
    confidence?: string;
    sourceIds?: number[];
  }>;
};

const PLAN_SCHEMA = {
  type: "object",
  required: ["primaryGoal", "rationale", "steps", "expectedInsights"],
  properties: {
    primaryGoal: { type: "string" },
    rationale: { type: "string" },
    steps: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        required: ["id", "title", "query", "angle", "deliverable"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          query: { type: "string" },
          angle: { type: "string" },
          deliverable: { type: "string" },
        },
      },
    },
    expectedInsights: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const PLAN_SYSTEM_PROMPT = `You are a senior research strategist. Design concise, sequential investigation plans that break complex questions into focused web research actions. Each step should have a unique id, specific search intent, and a deliverable that advances the overall objective.`;

const EVIDENCE_SYSTEM_PROMPT = `You are a meticulous research analyst. For each assigned sub-query, run targeted web searches, extract only the most relevant facts, and return structured findings with explicit evidence. Do not invent citations; rely solely on the retrieved material. Prioritize newer, more recent information over older data when evaluating sources and findings.`;

const FINAL_SYSTEM_PROMPT = `You are the lead analyst preparing the final deliverable for an exhaustive research sprint. Integrate the vetted findings, highlight tensions in the evidence, and surface the most important next questions. Prioritize and give more weight to newer, more recent information over older data when synthesizing the report.`;

const TODAY = "2025-09-27";

function localeDirective(locale: Locale, base: string): string {
  if (locale === "ja") {
    return `${base}\n応答は自然な日本語で書いてください。`;
  }
  return `${base}\nRespond in natural English.`;
}

function createContent(text: string): Content[] {
  return [
    {
      role: "user",
      parts: [{ text }],
    },
  ];
}

function parseJson<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    try {
      return JSON5.parse(raw) as T;
    } catch {
      throw new Error(`Failed to parse ${context} JSON payload.`);
    }
  }
}

function extractJsonObject(raw: string, context: string): string {
  // Remove markdown code fences if present
  let cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "");

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`${context} response did not contain a JSON object.`);
  }
  return cleaned.slice(start, end + 1);
}

function extractCitations(candidate?: Candidate | null): SourceCandidate[] {
  const metadata = candidate?.groundingMetadata;
  if (!metadata?.groundingChunks || metadata.groundingChunks.length === 0) {
    return [];
  }

  const seen = new Map<string, SourceCandidate>();

  metadata.groundingChunks.forEach((chunk, index) => {
    const citation = normalizeChunk(chunk, index);
    if (!citation) return;
    const key = citation.url.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, citation);
    }
  });

  return Array.from(seen.values());
}

function normalizeChunk(chunk: GroundingChunk, index: number): SourceCandidate | null {
  if (chunk.web?.uri) {
    return {
      index,
      url: chunk.web.uri,
      title: chunk.web.title ?? chunk.web.uri,
      domain: chunk.web.domain,
    };
  }

  if (chunk.retrievedContext?.uri) {
    return {
      index,
      url: chunk.retrievedContext.uri,
      title: chunk.retrievedContext.title ?? chunk.retrievedContext.uri,
    };
  }

  return null;
}

function inferDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export async function runDeepResearch(query: string, options: RunOptions): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Query cannot be empty.");
  }

  const { client, model } = getGeminiClient();
  const sourceRegistry = new Map<string, SourceReference>();
  const orderedSources: SourceReference[] = [];

  let subjectImages: DeepResearchImage[] = [];
  try {
    subjectImages = await fetchSubjectImages(trimmed, {
      locale: options.locale,
      signal: options.signal,
    });
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      throw error;
    }
    console.error("Subject image lookup failed", error);
  }

  await options.emit({ type: "images", images: subjectImages });

  const registerSource = (candidate: SourceCandidate): SourceReference => {
    const key = candidate.url.toLowerCase();
    const existing = sourceRegistry.get(key);
    if (existing) {
      return existing;
    }
    const id = String(sourceRegistry.size + 1);
    const reference: SourceReference = {
      id,
      url: candidate.url,
      title: candidate.title ?? candidate.url,
      domain: candidate.domain ?? inferDomain(candidate.url),
    };
    sourceRegistry.set(key, reference);
    orderedSources.push(reference);
    return reference;
  };

  const plan = await generatePlan(trimmed, options.locale, options.signal, client, model);
  await options.emit({ type: "plan", plan });

  const stepResults: StepResult[] = [];
  for (const step of plan.steps) {
    const result = await gatherEvidence(trimmed, step, options.locale, options.signal, client, model, registerSource);
    stepResults.push(result);
    await options.emit({ type: "search", step: result });
  }

  const finalReport = await synthesizeReport(
    trimmed,
    plan,
    stepResults,
    orderedSources,
    options.locale,
    options.signal,
    client,
    model,
  );

  await options.emit({ type: "final", report: finalReport, sources: orderedSources });
}

async function generatePlan(
  query: string,
  locale: Locale,
  signal: AbortSignal | undefined,
  client: GoogleGenAI,
  model: string,
): Promise<DeepResearchPlan> {
  const planPrompt = localeDirective(
    locale,
    `Today is ${TODAY}. Break the research question into 3-5 decisive web investigation steps. Each step should target a different angle or source type and build toward a synthesis. When planning, prioritize finding the most recent and up-to-date information available.`,
  ) +
    `\n\nResearch question: ${query}`;

  const response = await client.models.generateContent({
    model,
    contents: createContent(planPrompt),
    config: {
      ...(signal ? { abortSignal: signal } : {}),
      temperature: 0.3,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: PLAN_SCHEMA,
      systemInstruction: {
        role: "system",
        parts: [{ text: PLAN_SYSTEM_PROMPT }],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Plan generation returned an empty response.");
  }

  const payload = parseJson<PlanPayload>(text, "plan");
  const steps = (payload.steps ?? []).map((step, index) => ({
    id: (step.id || `S${index + 1}`).trim(),
    title: step.title.trim(),
    query: step.query.trim(),
    angle: step.angle.trim(),
    deliverable: step.deliverable.trim(),
  }));

  if (steps.length === 0) {
    throw new Error("Plan generation did not return any steps.");
  }

  return {
    primaryGoal: payload.primaryGoal?.trim() ?? query,
    rationale: payload.rationale?.trim() ?? "",
    steps,
    expectedInsights: payload.expectedInsights?.map((line) => line.trim()).filter(Boolean) ?? [],
  };
}

async function gatherEvidence(
  query: string,
  step: PlanStep,
  locale: Locale,
  signal: AbortSignal | undefined,
  client: GoogleGenAI,
  model: string,
  registerSource: (candidate: SourceCandidate) => SourceReference,
): Promise<StepResult> {
  const userPrompt = localeDirective(
    locale,
    `You are executing step ${step.id} of a research mission that targets the question: "${query}". Focus strictly on this sub-query: "${step.query}". Use real-time web research to pull verifiable facts. Prioritize the most recent and up-to-date information available, giving more weight to newer sources. Return findings that advance the deliverable: ${step.deliverable}.`
  );

  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: createContent(userPrompt),
        config: {
          ...(signal ? { abortSignal: signal } : {}),
          temperature: 0.35,
          topP: 0.9,
          maxOutputTokens: 2048,
          automaticFunctionCalling: {},
          tools: [{ googleSearch: {} }],
          systemInstruction: {
            role: "system",
            parts: [
              {
                text:
                  `${EVIDENCE_SYSTEM_PROMPT}\nFormat your entire reply as minified JSON with the exact shape: {"summary": string, "findings": [{"heading": string, "insight": string, "evidence": string, "confidence"?: string, "sourceIds"?: number[]}]}.\nDo not include Markdown fences or any text before/after the JSON.\nUse sourceIds to reference 1-indexed citations emitted by the tool calls in the order they are returned.`,
              },
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error(`Evidence generation for step ${step.id} returned an empty response.`);
      }

      const jsonPayload = extractJsonObject(text, `evidence for step ${step.id}`);
      const payload = parseJson<EvidencePayload>(jsonPayload, `evidence for step ${step.id}`);
      const candidate = response.candidates?.[0];
      const citations = extractCitations(candidate);

      const indexToSource = new Map<number, SourceReference>();
      citations.forEach((citation) => {
        const ref = registerSource(citation);
        indexToSource.set(citation.index, ref);
      });

      const uniqueSources = Array.from(new Map(Array.from(indexToSource.values()).map((ref) => [ref.id, ref])).values());

      const findings: StepFinding[] = (payload.findings ?? []).map((finding) => {
        const sourceIds = Array.isArray(finding.sourceIds) ? finding.sourceIds : [];
        const references = sourceIds
          .map((id) => indexToSource.get(id - 1))
          .filter((ref): ref is SourceReference => Boolean(ref));

        return {
          heading: finding.heading.trim(),
          insight: finding.insight.trim(),
          evidence: finding.evidence.trim(),
          confidence: finding.confidence?.trim(),
          sources: Array.from(new Map(references.map((ref) => [ref.id, ref])).values()),
        };
      });

      return {
        stepId: step.id,
        title: step.title,
        summary: payload.summary?.trim() ?? "",
        queries: candidate?.groundingMetadata?.retrievalQueries ?? [],
        findings,
        sources: uniqueSources,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed for step ${step.id}:`, lastError.message);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // If all retries failed, return a minimal result instead of throwing
  console.error(`All retries failed for step ${step.id}. Returning minimal result.`);
  return {
    stepId: step.id,
    title: step.title,
    summary: `Evidence collection failed after ${maxRetries + 1} attempts: ${lastError?.message ?? "Unknown error"}`,
    queries: [],
    findings: [],
    sources: [],
  };
}

async function synthesizeReport(
  query: string,
  plan: DeepResearchPlan,
  steps: StepResult[],
  sources: SourceReference[],
  locale: Locale,
  signal: AbortSignal | undefined,
  client: GoogleGenAI,
  model: string,
): Promise<string> {
  const planOutline = plan.steps
    .map((step) => `- ${step.id}: ${step.title} — focus: ${step.angle}`)
    .join("\n");

  const findingsOutline = steps
    .map((step) => {
      const lines = step.findings.map((finding) => {
        const citations = finding.sources.map((source) => `[${source.id}]`).join(" ");
        return `  • ${finding.heading}: ${finding.insight} ${citations}`.trim();
      });
      return [`Step ${step.stepId} – ${step.title}:`, ...lines].join("\n");
    })
    .join("\n\n");

  const referencesCatalog = sources
    .map((source) => `[${source.id}] ${source.title}${source.domain ? ` — ${source.domain}` : ""} (${source.url})`)
    .join("\n");

  const userPrompt = localeDirective(
    locale,
    `Synthesize the DeepResearch investigation into a concise but thorough report. Cite sources with bracket numbers (e.g., [1]) that correspond to the provided catalog. Give priority and more weight to newer, more recent information when synthesizing findings.`,
  ) +
    `\n\nResearch question: ${query}\n\nPrimary goal: ${plan.primaryGoal}\nRationale: ${plan.rationale}\nExpected insights: ${plan.expectedInsights.join("; ")}\n\nPlan outline:\n${planOutline}\n\nFindings summary:\n${findingsOutline}\n\nSources catalog:\n${referencesCatalog}\n\nStructure the response with the following sections in order: Overview, Key Findings (bulleted), Contradictions, Open Questions, References. Ensure every factual claim is cited.`;

  const response = await client.models.generateContent({
    model,
    contents: createContent(userPrompt),
    config: {
      ...(signal ? { abortSignal: signal } : {}),
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 2048,
      systemInstruction: {
        role: "system",
        parts: [{ text: FINAL_SYSTEM_PROMPT }],
      },
    },
  });

  return response.text ?? "";
}
