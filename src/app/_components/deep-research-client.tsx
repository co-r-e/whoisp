"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePathname, useSearchParams } from "next/navigation";

import {
  type HistoryLocale,
  useHistoryContext,
} from "./history-context";
import { useResearchRun } from "./research-run-context";

type Locale = "en" | "ja";

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

type DeepResearchPlan = {
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

type StreamEvent =
  | { type: "status"; status: string }
  | { type: "plan"; plan: DeepResearchPlan }
  | { type: "search"; step: StepResult }
  | { type: "analysis"; notes: string }
  | { type: "final"; report: string; sources: SourceReference[] }
  | { type: "done" }
  | { type: "error"; message: string };

type UiStrings = {
  title: string;
  lead: string;
  queryLabel: string;
  placeholder: string;
  submit: string;
  stop: string;
  idleStatus: string;
  runningStatus: string;
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
};

type DeepResearchClientProps = {
  locale: Locale;
  strings: UiStrings;
  sessionId?: string;
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
  code: ({ node: _node, inline, className, children, ...props }) => (
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
  ),
};

export function DeepResearchClient({ locale, strings, sessionId }: DeepResearchClientProps) {
  const [state, setState] = useState(initialState);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastStartedQuery, setLastStartedQuery] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { ensureSession, touchSession, renameIfUntitled, getDefaultTitle } = useHistoryContext();
  const { setStatus: setGlobalStatus, setRunningState } = useResearchRun();

  useEffect(() => {
    if (!sessionId) return;
    const historyLocale = locale as HistoryLocale;
    ensureSession({
      id: sessionId,
      title: getDefaultTitle(historyLocale),
      path: pathname,
      locale: historyLocale,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    touchSession(sessionId);
  }, [ensureSession, getDefaultTitle, locale, pathname, sessionId, touchSession]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setRunningState(false);
    setGlobalStatus(strings.idleStatus);
  }, [setGlobalStatus, setRunningState, strings.idleStatus]);

  const handleEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "status":
          setGlobalStatus(event.status === "started" ? strings.runningStatus : event.status);
          break;
        case "plan":
          setState((prev) => ({ ...prev, plan: event.plan }));
          break;
        case "search":
          setState((prev) => {
            const nextSteps = prev.steps.filter((item) => item.stepId !== event.step.stepId);
            nextSteps.push(event.step);
            nextSteps.sort((a, b) => a.stepId.localeCompare(b.stepId));
            return { ...prev, steps: nextSteps };
          });
          break;
        case "analysis":
          setGlobalStatus(event.notes);
          break;
        case "final":
          setState((prev) => ({ ...prev, report: event.report, sources: event.sources }));
          setGlobalStatus(strings.idleStatus);
          setIsRunning(false);
          setRunningState(false);
          abortRef.current = null;
          break;
        case "done":
          setIsRunning(false);
          setRunningState(false);
          abortRef.current = null;
          setGlobalStatus(strings.idleStatus);
          break;
        case "error":
          setError(event.message);
          setIsRunning(false);
          setRunningState(false);
          abortRef.current = null;
          setGlobalStatus(strings.idleStatus);
          break;
        default:
          break;
      }
    },
    [setGlobalStatus, setRunningState, strings.idleStatus, strings.runningStatus],
  );

  const processLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed) as StreamEvent;
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
          return;
        }
        setError(toMessage(err));
        setIsRunning(false);
        setRunningState(false);
        setGlobalStatus(strings.idleStatus);
      }
    },
    [processLine, setGlobalStatus, setRunningState, strings.idleStatus],
  );

  const startResearch = useCallback(
    async (currentQuery: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);
      setGlobalStatus(strings.runningStatus);
      setError(null);
      setState(initialState);
      setRunningState(true, handleCancel);

      if (sessionId) {
        renameIfUntitled(sessionId, currentQuery);
        touchSession(sessionId);
      }

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
          return;
        }
        setError(toMessage(err));
        setIsRunning(false);
        abortRef.current = null;
        setRunningState(false);
        setGlobalStatus(strings.idleStatus);
      }
    },
    [consumeStream, handleCancel, locale, renameIfUntitled, sessionId, setGlobalStatus, setRunningState, strings.idleStatus, strings.runningStatus, touchSession],
  );

  useEffect(() => {
    setLastStartedQuery(null);
  }, [sessionId]);

  useEffect(() => {
    setRunningState(isRunning, isRunning ? handleCancel : undefined);
  }, [handleCancel, isRunning, setRunningState]);

  useEffect(() => {
    setGlobalStatus(strings.idleStatus);
  }, [setGlobalStatus, strings.idleStatus]);

  useEffect(() => {
    if (!sessionId) return;
    const paramValue = searchParams.get("q");
    const trimmed = paramValue?.trim();
    if (!trimmed) return;
    if (isRunning) return;
    if (lastStartedQuery === trimmed) return;

    setLastStartedQuery(trimmed);
    void startResearch(trimmed);
  }, [isRunning, lastStartedQuery, searchParams, sessionId, startResearch]);

  const activePlan = state.plan;
  const planSteps = activePlan?.steps ?? [];
  const orderedSteps = useMemo(() => {
    return [...state.steps].sort((a, b) => a.stepId.localeCompare(b.stepId));
  }, [state.steps]);
  const hasPlanSteps = planSteps.length > 0;
  const hasEvidence = orderedSteps.length > 0;
  const hasReport = Boolean(state.report);
  const hasSources = state.sources.length > 0;

  const planContent = hasPlanSteps
    ? planSteps.map((step) => (
        <article key={step.id} className="rounded-lg border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            <span>{step.id}</span>
          </div>
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
        <article key={step.stepId} className="rounded-lg border bg-card p-4">
          <header className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{step.stepId}</span>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            {step.summary ? (
              <p className="text-sm text-foreground">{step.summary}</p>
            ) : null}
          </header>
          {step.findings.length > 0 ? (
            <ul className="mt-4 space-y-3 text-sm">
              {step.findings.map((finding) => (
                <li key={`${step.stepId}-${finding.heading}`} className="rounded-md bg-muted/40 p-3">
                  <p className="font-medium">{finding.heading}</p>
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
    <article className="rounded-lg border bg-card p-4">
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
        <li key={source.id} className="rounded-md border bg-card/50 p-3">
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

      <div className="w-full overflow-x-auto">
        <div className="flex gap-6 min-w-[1280px] pb-4">
          <section className="flex w-[320px] shrink-0 flex-col gap-3">
            <header className="space-y-2">
              <h2 className="text-xl font-semibold">{strings.planHeading}</h2>
              {strings.planExpectation ? (
                <p className="text-sm text-muted-foreground">{strings.planExpectation}</p>
              ) : null}
            </header>
            <div className="flex flex-col gap-3">{planContent}</div>
          </section>

          <section className="flex w-[640px] shrink-0 flex-col gap-3">
            <h2 className="text-xl font-semibold">{strings.evidenceHeading}</h2>
            <div className="flex flex-col gap-3">{evidenceContent}</div>
          </section>

          <section className="flex w-[640px] shrink-0 flex-col gap-3">
            <h2 className="text-xl font-semibold">{strings.reportHeading}</h2>
            {reportContent}
          </section>

          <section className="flex w-[320px] shrink-0 flex-col gap-3">
            <h2 className="text-xl font-semibold">{strings.sourcesHeading}</h2>
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

export default DeepResearchClient;
