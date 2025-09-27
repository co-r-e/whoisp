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

  const write = (payload: unknown) => writer.write(encoder.encode(`${JSON.stringify(payload)}\n`));

  const close = () => {
    try {
      writer.close();
    } catch {
      // ignore
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
      await write({ type: "error", message: toErrorMessage(error) });
    } finally {
      close();
    }
  };

  request.signal.addEventListener("abort", () => {
    abortController.abort();
    close();
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
