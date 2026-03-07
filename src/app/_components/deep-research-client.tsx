"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSearchParams } from "next/navigation";
import { useResearchRun } from "./research-run-context";
import type {
  DeepResearchPlan,
  DeepResearchProgressStage,
  DeepResearchStreamEvent,
  Locale,
  SourceReference,
  StepExecutionStatus,
  StepResult,
} from "@/shared/deep-research-types";
import { exportToMarkdown } from "@/utils/exportToMarkdown";
import { exportToWord } from "@/utils/exportToWord";

type UiStrings = {
  queryLabel: string;
  placeholder: string;
  submit: string;
  stop: string;
  idleStatus: string;
  runningStatus: string;
  progressHeading: string;
  progressIdle: string;
  progressComplete: string;
  progressCancelled: string;
  progressCancelledEmpty: string;
  sessionTitle: string;
  sessionBody: string;
  sessionHint: string;
  planHeading: string;
  planExpectation: string;
  planEmpty: string;
  evidenceHeading: string;
  evidenceEmpty: string;
  reportHeading: string;
  reportEmpty: string;
  sourcesHeading: string;
  sourcesEmpty: string;
  errorLabel: string;
  imagesHeading: string;
  imagesLoading: string;
  imagesEmpty: string;
  imagesNotFound: string;
  exportWord: string;
  exportMarkdown: string;
  stepStatusPending: string;
  stepStatusRunning: string;
  stepStatusCompleted: string;
  stepStatusPartial: string;
  stepStatusFailed: string;
  stepStatusCancelled: string;
};

type DeepResearchClientProps = {
  locale: Locale;
  strings: UiStrings;
};

type ResearchState = {
  plan: DeepResearchPlan | null;
  steps: StepResult[];
  report: string | null;
  sources: SourceReference[];
};

const initialState: ResearchState = {
  plan: null,
  steps: [],
  report: null,
  sources: [],
};

type ProgressState = {
  stage: DeepResearchProgressStage;
  message: string;
  completedSteps: number;
  totalSteps: number;
};

const initialProgressState: ProgressState = {
  stage: "idle",
  message: "",
  completedSteps: 0,
  totalSteps: 0,
};

function cx(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const reportMarkdownComponents: Components = {
  h1: ({ node: _node, className, ...props }) => (
    <h1 {...props} className={cx("mt-4 text-xl font-semibold text-foreground first:mt-0", className)} />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2 {...props} className={cx("mt-4 text-lg font-semibold text-foreground first:mt-0", className)} />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3 {...props} className={cx("mt-4 text-base font-semibold text-foreground first:mt-0", className)} />
  ),
  p: ({ node: _node, className, ...props }) => (
    <p {...props} className={cx("mt-2 text-sm leading-relaxed text-foreground", className)} />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul {...props} className={cx("mt-3 list-disc space-y-2 pl-5 text-sm text-foreground", className)} />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol {...props} className={cx("mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground", className)} />
  ),
  li: ({ node: _node, className, ...props }) => (
    <li {...props} className={cx("leading-relaxed", className)} />
  ),
  a: ({ node: _node, className, ...props }) => (
    <a
      {...props}
      target={props.target ?? "_blank"}
      rel={props.rel ?? "noreferrer"}
      className={cx("text-primary underline", className)}
    />
  ),
  strong: ({ node: _node, className, ...props }) => (
    <strong {...props} className={cx("font-semibold text-foreground", className)} />
  ),
  em: ({ node: _node, className, ...props }) => (
    <em {...props} className={cx("italic text-foreground", className)} />
  ),
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote
      {...props}
      className={cx(
        "mt-3 border-l-2 border-muted-foreground/50 pl-3 text-sm italic text-foreground/90",
        className,
      )}
    />
  ),
  hr: ({ node: _node, className, ...props }) => (
    <hr {...props} className={cx("my-4 border-muted", className)} />
  ),
  code: ({ node: _node, className, children, ...props }) => {
    const inline = !className?.includes('language-');
    return (
      <code
        {...props}
        className={cx(
          inline
            ? "rounded bg-muted px-1 py-0.5 text-[0.8125rem]"
            : "block rounded-md bg-muted/60 p-3 text-sm",
          className,
        )}
      >
        {children}
      </code>
    );
  },
};

function getStepStatusLabel(status: StepExecutionStatus, strings: UiStrings): string {
  switch (status) {
    case "running":
      return strings.stepStatusRunning;
    case "completed":
      return strings.stepStatusCompleted;
    case "partial":
      return strings.stepStatusPartial;
    case "failed":
      return strings.stepStatusFailed;
    case "cancelled":
      return strings.stepStatusCancelled;
    default:
      return strings.stepStatusPending;
  }
}

function getStepStatusBadgeClass(status: StepExecutionStatus): string {
  switch (status) {
    case "running":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700";
    case "completed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    case "partial":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    case "failed":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "cancelled":
      return "border-slate-400/30 bg-slate-400/10 text-slate-600";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

function getProgressBarClass(stage: DeepResearchProgressStage): string {
  switch (stage) {
    case "done":
      return "bg-emerald-600";
    case "synthesis":
      return "bg-primary";
    case "evidence":
      return "bg-sky-600";
    case "planning":
    case "images":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}

function markCancelledStatuses(
  statuses: Record<string, StepExecutionStatus>,
): Record<string, StepExecutionStatus> {
  return Object.fromEntries(
    Object.entries(statuses).map(([stepId, status]) => [
      stepId,
      status === "pending" || status === "running" ? "cancelled" : status,
    ]),
  );
}

export function DeepResearchClient({ locale, strings }: DeepResearchClientProps) {
  const [state, setState] = useState(initialState);
  const [progress, setProgress] = useState(initialProgressState);
  const [stepStatuses, setStepStatuses] = useState<Record<string, StepExecutionStatus>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastStartedQuery, setLastStartedQuery] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(initialState);
  const searchParams = useSearchParams();
  const { setStatus: setGlobalStatus, setRunningState, setImages, setImagesStatus } = useResearchRun();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    // Don't reset UI immediately - wait for partial report from server
    const statusMessage = locale === "ja" ? "中止しています..." : "Stopping...";
    setGlobalStatus(statusMessage);
  }, [locale, setGlobalStatus]);

  const handleEvent = useCallback(
    (event: DeepResearchStreamEvent) => {
      switch (event.type) {
        case "images":
          setImages(event.images);
          setImagesStatus(event.images.length > 0 ? "success" : "empty");
          break;
        case "progress":
          setProgress({
            stage: event.stage,
            message: event.message,
            completedSteps: event.completedSteps ?? 0,
            totalSteps: event.totalSteps ?? 0,
          });
          setGlobalStatus(event.message);
          break;
        case "status":
          setGlobalStatus(event.status === "started" ? strings.runningStatus : event.status);
          break;
        case "plan":
          setState((prev) => ({ ...prev, plan: event.plan }));
          setStepStatuses(
            Object.fromEntries(event.plan.steps.map((step) => [step.id, "pending" as const])),
          );
          setProgress((prev) => ({
            ...prev,
            totalSteps: event.plan.steps.length,
          }));
          break;
        case "step-status":
          setStepStatuses((prev) => ({
            ...prev,
            [event.stepId]: event.status,
          }));
          break;
        case "search":
          setState((prev) => {
            const nextSteps = prev.steps.filter((item) => item.stepId !== event.step.stepId);
            nextSteps.push(event.step);
            nextSteps.sort((a, b) => a.stepId.localeCompare(b.stepId));
            return { ...prev, steps: nextSteps };
          });
          setStepStatuses((prev) => ({
            ...prev,
            [event.step.stepId]: event.step.status,
          }));
          break;
        case "analysis":
          setGlobalStatus(event.notes);
          break;
        case "final":
          setState((prev) => ({ ...prev, report: event.report, sources: event.sources }));
          setProgress((prev) => ({
            ...prev,
            stage: "done",
            message: strings.progressComplete,
            completedSteps: prev.totalSteps > 0 ? prev.totalSteps : prev.completedSteps,
          }));
          setGlobalStatus(strings.idleStatus);
          setIsRunning(false);
          setRunningState(false);
          abortRef.current = null;
          setImagesStatus((prev) => (prev === "loading" ? "empty" : prev));
          break;
        case "done":
          setIsRunning(false);
          setRunningState(false);
          abortRef.current = null;
          setGlobalStatus(strings.idleStatus);
          setImagesStatus((prev) => (prev === "loading" ? "empty" : prev));
          break;
        case "error":
          setError(event.message);
          setProgress(initialProgressState);
          setStepStatuses({});
          setIsRunning(false);
          setRunningState(false);
          abortRef.current = null;
          setGlobalStatus(strings.idleStatus);
          setImages([]);
          setImagesStatus("idle");
          break;
        default:
          break;
      }
    },
    [
      setGlobalStatus,
      setImages,
      setImagesStatus,
      setRunningState,
      strings.idleStatus,
      strings.progressComplete,
      strings.runningStatus,
    ],
  );

  const processLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed) as DeepResearchStreamEvent;
        handleEvent(parsed);
      } catch (err) {
        setError(toMessage(err));
      }
    },
    [handleEvent],
  );

  const consumeStream = useCallback(
    async (response: Response) => {
      const reader = response.body?.getReader();
      if (!reader) {
        setError("Streaming is not supported in this environment.");
        setIsRunning(false);
        setRunningState(false);
        setGlobalStatus(strings.idleStatus);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            processLine(line);
            newlineIndex = buffer.indexOf("\n");
          }
        }
        if (buffer.trim().length > 0) {
          processLine(buffer);
        }
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
          // Re-throw to be handled by startResearch
          throw err;
        }
        setError(toMessage(err));
        setProgress(initialProgressState);
        setStepStatuses({});
        setIsRunning(false);
        setRunningState(false);
        setGlobalStatus(strings.idleStatus);
        setImages([]);
        setImagesStatus("idle");
      }
    },
    [processLine, setGlobalStatus, setImages, setImagesStatus, setRunningState, strings.idleStatus],
  );

  const startResearch = useCallback(
    async (currentQuery: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);
      setGlobalStatus(strings.runningStatus);
      setError(null);
      setState(initialState);
      setProgress({
        stage: "images",
        message: strings.runningStatus,
        completedSteps: 0,
        totalSteps: 0,
      });
      setStepStatuses({});
      setRunningState(true, handleCancel);
      setImages([]);
      setImagesStatus("loading");

      try {
        const response = await fetch("/api/deep-research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: currentQuery, locale }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `${response.status} ${response.statusText}`;
          try {
            const data = (await response.json()) as { error?: string };
            if (data?.error) {
              message = data.error;
            }
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        await consumeStream(response);
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") {
          // Aborted - server will attempt to send partial report if already started
          // The final event handler will update the status if report was received
          // Otherwise, show idle status
          const latestState = stateRef.current;
          const hasCollectedResults =
            latestState.steps.length > 0 || Boolean(latestState.report) || latestState.sources.length > 0;
          const cancelledMessage = hasCollectedResults ? strings.progressCancelled : strings.progressCancelledEmpty;

          setProgress((prev) => ({
            stage: "done",
            message: cancelledMessage,
            completedSteps: prev.completedSteps,
            totalSteps: prev.totalSteps || latestState.plan?.steps.length || 0,
          }));
          setStepStatuses((prev) => markCancelledStatuses(prev));
          setIsRunning(false);
          setRunningState(false);
          setGlobalStatus(cancelledMessage);
          abortRef.current = null;
          return;
        }
        setError(toMessage(err));
        setProgress(initialProgressState);
        setStepStatuses({});
        setIsRunning(false);
        abortRef.current = null;
        setRunningState(false);
        setGlobalStatus(strings.idleStatus);
        setImages([]);
        setImagesStatus("idle");
      }
    },
    [
      consumeStream,
      handleCancel,
      locale,
      setGlobalStatus,
      setImages,
      setImagesStatus,
      setRunningState,
      strings.progressCancelled,
      strings.progressCancelledEmpty,
      strings.idleStatus,
      strings.runningStatus,
    ],
  );

  useEffect(() => {
    setRunningState(isRunning, isRunning ? handleCancel : undefined);
  }, [handleCancel, isRunning, setRunningState]);

  useEffect(() => {
    setGlobalStatus(strings.idleStatus);
  }, [setGlobalStatus, strings.idleStatus]);

  useEffect(() => {
    const paramValue = searchParams.get("q");
    const trimmed = paramValue?.trim();
    if (!trimmed) {
      if (lastStartedQuery !== null) {
        setLastStartedQuery(null);
      }
      return;
    }
    if (isRunning) return;
    if (lastStartedQuery === trimmed) return;

    setLastStartedQuery(trimmed);
    void startResearch(trimmed);
  }, [isRunning, lastStartedQuery, searchParams, startResearch]);

  const activePlan = state.plan;
  const planSteps = activePlan?.steps ?? [];
  const orderedSteps = useMemo(() => {
    return [...state.steps].sort((a, b) => a.stepId.localeCompare(b.stepId));
  }, [state.steps]);
  const hasPlanSteps = planSteps.length > 0;
  const hasEvidence = orderedSteps.length > 0;
  const hasReport = Boolean(state.report);
  const hasSources = state.sources.length > 0;
  const hasResearchOutput = hasPlanSteps || hasEvidence || hasReport || hasSources;
  const progressTotalSteps = progress.totalSteps || planSteps.length;
  const progressCompletedSteps = progressTotalSteps > 0
    ? Math.max(
        progress.completedSteps,
        Object.values(stepStatuses).filter((status) =>
          status === "completed" || status === "partial" || status === "failed").length,
      )
    : 0;
  const progressPercent = progressTotalSteps > 0
    ? Math.min(100, Math.round((progressCompletedSteps / progressTotalSteps) * 100))
    : progress.stage === "done"
      ? 100
      : 0;
  const progressMessage =
    progress.message || (isRunning ? strings.runningStatus : hasReport ? strings.progressComplete : strings.progressIdle);

  const handleExportToWord = useCallback(async () => {
    const query = searchParams.get("q") ?? "Research";

    await exportToWord({
      query,
      plan: state.plan,
      steps: orderedSteps,
      report: state.report,
      sources: state.sources,
      locale,
    });
  }, [locale, orderedSteps, searchParams, state.plan, state.report, state.sources]);

  const handleExportToMarkdown = useCallback(async () => {
    const query = searchParams.get("q") ?? "Research";

    await exportToMarkdown({
      query,
      plan: state.plan,
      steps: orderedSteps,
      report: state.report,
      sources: state.sources,
      locale,
    });
  }, [locale, orderedSteps, searchParams, state.plan, state.report, state.sources]);

  const planContent = hasPlanSteps
    ? planSteps.map((step) => (
        <article key={step.id} className="rounded-lg border border-border bg-card p-4">
          <header className="flex items-start justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              <span>{step.id}</span>
            </div>
            <span
              className={cx(
                "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium",
                getStepStatusBadgeClass(stepStatuses[step.id] ?? "pending"),
              )}
            >
              {getStepStatusLabel(stepStatuses[step.id] ?? "pending", strings)}
            </span>
          </header>
          {step.angle ? (
            <p className="mt-1 text-xs text-muted-foreground">{step.angle}</p>
          ) : null}
          <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
          <p className="mt-1 text-sm text-foreground/80">{step.query}</p>
          <p className="mt-2 text-sm text-foreground/90">{step.deliverable}</p>
        </article>
      ))
    : (
        <p className="text-sm text-muted-foreground">{strings.planEmpty}</p>
      );

  const evidenceContent = hasEvidence
    ? orderedSteps.map((step) => (
        <article
          key={step.stepId}
          className={cx(
            "rounded-lg border bg-card p-4",
            step.status === "failed"
              ? "border-destructive/30 bg-destructive/5"
              : step.status === "partial"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border",
          )}
        >
          <header className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{step.stepId}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium",
                  getStepStatusBadgeClass(step.status),
                )}
              >
                {getStepStatusLabel(step.status, strings)}
              </span>
            </div>
            {step.summary ? (
              <p className="text-sm text-foreground">{step.summary}</p>
            ) : null}
          </header>
          {step.findings.length > 0 ? (
            <ul className="mt-4 space-y-3 text-sm">
              {step.findings.map((finding) => (
                <li key={`${step.stepId}-${finding.heading}`} className="rounded-md bg-muted/40 p-3">
                  <p className="font-bold text-foreground">{finding.heading}</p>
                  <p className="mt-1 text-foreground">{finding.insight}</p>
                  {finding.evidence ? (
                    <p className="mt-1 text-foreground/90">{finding.evidence}</p>
                  ) : null}
                  {finding.sources.length > 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {finding.sources.map((source) => `[${source.id}]`).join(" ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {step.sources.length > 0 ? (
            <footer className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              <span>Sources: </span>
              {step.sources.map((source, index) => (
                <span key={source.id}>
                  {index > 0 ? ", " : null}
                  [{source.id}] {source.domain ?? source.url}
                </span>
              ))}
            </footer>
          ) : null}
        </article>
      ))
    : (
        <p className="text-sm text-muted-foreground">{strings.evidenceEmpty}</p>
      );

  const reportContent = hasReport ? (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="space-y-3 text-sm leading-relaxed text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={reportMarkdownComponents}>
          {state.report ?? ""}
        </ReactMarkdown>
      </div>
    </article>
  ) : (
    <p className="text-sm text-muted-foreground">{strings.reportEmpty}</p>
  );

  const sourcesContent = hasSources ? (
    <ol className="space-y-2 text-sm">
      {state.sources.map((source) => (
        <li key={source.id} className="rounded-md border border-border bg-card/50 p-3">
          <p className="font-medium">[{source.id}] {source.title}</p>
          {source.domain ? (
            <p className="text-xs text-muted-foreground">{source.domain}</p>
          ) : null}
          <a
            className="mt-1 block break-words text-xs text-primary underline"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            {source.url}
          </a>
        </li>
      ))}
    </ol>
  ) : (
    <p className="text-sm text-muted-foreground">{strings.sourcesEmpty}</p>
  );

  return (
    <div className="w-full px-4 pt-8 pb-12 md:px-6 md:pt-10 md:pb-16 flex flex-col gap-6">
      {error ? (
        <section className="mx-auto w-full max-w-5xl">
          <p className="text-sm text-destructive">{strings.errorLabel}: {error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <article className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {strings.progressHeading}
              </p>
              <h2 className="text-lg font-semibold text-foreground">{progressMessage}</h2>
            </div>
            {progressTotalSteps > 0 ? (
              <p className="shrink-0 text-sm font-medium text-muted-foreground">
                {progressCompletedSteps}/{progressTotalSteps}
              </p>
            ) : null}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cx("h-full rounded-full transition-[width] duration-300", getProgressBarClass(progress.stage))}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </article>

        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {strings.sessionTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{strings.sessionBody}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{strings.sessionHint}</p>
        </article>
      </section>

      {hasResearchOutput ? (
        <div className="flex flex-wrap justify-start gap-3">
          <button
            type="button"
            onClick={handleExportToWord}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRunning}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{strings.exportWord}</span>
          </button>
          <button
            type="button"
            onClick={handleExportToMarkdown}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isRunning}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v16H4z" />
              <path d="M8 9h8" />
              <path d="M8 13h5" />
              <path d="M8 17h8" />
            </svg>
            <span>{strings.exportMarkdown}</span>
          </button>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto">
        <div className="flex gap-6 min-w-[1280px] pb-4">
          <section className="box-border flex w-[320px] shrink-0 flex-col gap-3 rounded-xl bg-card p-4">
            <header className="space-y-2">
              <h2 className="text-base font-semibold">{strings.planHeading}</h2>
              {strings.planExpectation ? (
                <p className="text-sm text-muted-foreground">{strings.planExpectation}</p>
              ) : null}
            </header>
            <div className="flex flex-col gap-3">{planContent}</div>
          </section>

          <section className="box-border flex w-[640px] shrink-0 flex-col gap-3 rounded-xl bg-card p-4">
            <h2 className="text-base font-semibold">{strings.evidenceHeading}</h2>
            <div className="flex flex-col gap-3">{evidenceContent}</div>
          </section>

          <section className="box-border flex w-[640px] shrink-0 flex-col gap-3 rounded-xl bg-card p-4">
            <h2 className="text-base font-semibold">{strings.reportHeading}</h2>
            {reportContent}
          </section>

          <section className="box-border flex w-[320px] shrink-0 flex-col gap-3 rounded-xl bg-card p-4">
            <h2 className="text-base font-semibold">{strings.sourcesHeading}</h2>
            {sourcesContent}
          </section>
        </div>
      </div>
    </div>
  );
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error";
}
