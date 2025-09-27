"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
  evidenceHeading: string;
  reportHeading: string;
  sourcesHeading: string;
  errorLabel: string;
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

export function DeepResearchClient({ locale, strings }: DeepResearchClientProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState<string>(strings.idleStatus);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setStatus(strings.idleStatus);
  }, [strings.idleStatus]);

  const handleEvent = useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case "status":
          setStatus(event.status === "started" ? strings.runningStatus : event.status);
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
          setStatus(event.notes);
          break;
        case "final":
          setState((prev) => ({ ...prev, report: event.report, sources: event.sources }));
          setStatus(strings.idleStatus);
          setIsRunning(false);
          abortRef.current = null;
          break;
        case "done":
          setIsRunning(false);
          abortRef.current = null;
          setStatus(strings.idleStatus);
          break;
        case "error":
          setError(event.message);
          setIsRunning(false);
          abortRef.current = null;
          setStatus(strings.idleStatus);
          break;
        default:
          break;
      }
    },
    [strings.idleStatus, strings.runningStatus],
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
      }
    },
    [processLine],
  );

  const startResearch = useCallback(
    async (currentQuery: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);
      setStatus(strings.runningStatus);
      setError(null);
      setState(initialState);

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
        setStatus(strings.idleStatus);
      }
    },
    [consumeStream, locale, strings.idleStatus, strings.runningStatus],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!query.trim()) return;
      await startResearch(query.trim());
    },
    [query, startResearch],
  );

  const activePlan = state.plan;
  const planSteps = activePlan?.steps ?? [];
  const orderedSteps = useMemo(() => {
    return [...state.steps].sort((a, b) => a.stepId.localeCompare(b.stepId));
  }, [state.steps]);

  return (
    <div className="w-full px-4 pt-8 pb-12 md:px-6 md:pt-10 md:pb-16 flex flex-col gap-12">
      <section className="mx-auto w-full max-w-5xl space-y-4">
        <h1 className="text-3xl font-semibold">{strings.title}</h1>
        <p className="text-base leading-relaxed text-muted-foreground">{strings.lead}</p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-sm font-medium" htmlFor="query">
            {strings.queryLabel}
          </label>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              id="query"
              name="query"
              className="flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              placeholder={strings.placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={isRunning}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow disabled:opacity-60"
                disabled={isRunning || !query.trim()}
              >
                {strings.submit}
              </button>
              {isRunning ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md border px-4 py-2 text-sm font-semibold shadow"
                >
                  {strings.stop}
                </button>
              ) : null}
            </div>
          </div>
        </form>
        <p className="text-sm text-muted-foreground">{status}</p>
        {error ? (
          <p className="text-sm text-destructive">{strings.errorLabel}: {error}</p>
        ) : null}
      </section>

      {activePlan ? (
        <section className="mx-auto w-full max-w-5xl space-y-3">
          <h2 className="text-xl font-semibold">{strings.planHeading}</h2>
          <p className="text-sm text-muted-foreground">{strings.planExpectation}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {planSteps.map((step) => (
              <article key={step.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{step.id}</span>
                  <span>{step.angle}</span>
                </div>
                <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.query}</p>
                <p className="mt-2 text-sm">{step.deliverable}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {orderedSteps.length > 0 ? (
        <section className="mx-auto w-full max-w-5xl space-y-4">
          <h2 className="text-xl font-semibold">{strings.evidenceHeading}</h2>
          <div className="space-y-4">
            {orderedSteps.map((step) => (
              <article key={step.stepId} className="rounded-lg border bg-card p-4 shadow-sm">
                <header className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{step.stepId}</span>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  {step.summary ? (
                    <p className="text-sm text-muted-foreground">{step.summary}</p>
                  ) : null}
                </header>
                {step.findings.length > 0 ? (
                  <ul className="mt-4 space-y-3 text-sm">
                    {step.findings.map((finding) => (
                      <li key={`${step.stepId}-${finding.heading}`} className="rounded-md bg-muted/40 p-3">
                        <p className="font-medium">{finding.heading}</p>
                        <p className="mt-1 text-muted-foreground">{finding.insight}</p>
                        {finding.evidence ? (
                          <p className="mt-1 text-muted-foreground/80">{finding.evidence}</p>
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
            ))}
          </div>
        </section>
      ) : null}

      {state.report ? (
        <section className="mx-auto w-full max-w-5xl space-y-3">
          <h2 className="text-xl font-semibold">{strings.reportHeading}</h2>
          <article className="rounded-lg border bg-card p-4 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {state.report}
            </pre>
          </article>
        </section>
      ) : null}

      {state.sources.length > 0 ? (
        <section className="mx-auto w-full max-w-5xl space-y-3">
          <h2 className="text-xl font-semibold">{strings.sourcesHeading}</h2>
          <ol className="space-y-2 text-sm">
            {state.sources.map((source) => (
              <li key={source.id} className="rounded-md border bg-card/50 p-3">
                <p className="font-medium">
                  [{source.id}] {source.title}
                </p>
                {source.domain ? (
                  <p className="text-xs text-muted-foreground">{source.domain}</p>
                ) : null}
                <a
                  className="mt-1 inline-flex text-xs text-primary underline"
                  href={source.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.url}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
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
