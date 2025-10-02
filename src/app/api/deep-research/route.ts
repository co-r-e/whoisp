import { NextRequest } from "next/server";

import { runDeepResearch } from "@/server/deepResearch";

export const runtime = "nodejs";

const encoder = new TextEncoder();

function normalizeLocale(locale: unknown): "en" | "ja" {
  if (locale === "ja") return "ja";
  return "en";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unexpected error";
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = typeof (body as { query?: unknown })?.query === "string" ? (body as { query: string }).query : "";
  const locale = normalizeLocale((body as { locale?: unknown })?.locale);

  if (!query.trim()) {
    return Response.json({ error: "Query is required" }, { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const abortController = new AbortController();
  let isClosed = false;

  const write = async (payload: unknown) => {
    if (isClosed) {
      return;
    }
    try {
      await writer.write(encoder.encode(`${JSON.stringify(payload)}\n`));
    } catch (error) {
      if (!isClosed) {
        console.error('[deep-research] Write error:', error);
      }
    }
  };

  const close = async () => {
    if (isClosed) {
      return;
    }
    isClosed = true;
    try {
      await writer.close();
    } catch (error) {
      // Stream may already be closed, ignore
    }
  };

  const pump = async () => {
    try {
      await write({ type: "status", status: "started" });
      await runDeepResearch(query, {
        locale,
        signal: abortController.signal,
        async emit(event) {
          await write(event);
        },
      });
      await write({ type: "done" });
    } catch (error) {
      // Don't emit error for AbortError - runDeepResearch already handles partial results
      if ((error as DOMException)?.name !== "AbortError") {
        await write({ type: "error", message: toErrorMessage(error) });
      }
    } finally {
      await close();
    }
  };

  request.signal.addEventListener("abort", () => {
    // Signal abort to runDeepResearch, but don't close the stream yet
    // Let runDeepResearch finish emitting partial results
    abortController.abort();
  });

  void pump();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
    },
  });
}
