import { NextRequest } from "next/server";

import { fetchPersonImages } from "@/server/fetchPersonImages";
import type { AppLocale } from "@/shared/person-images";

export const runtime = "nodejs";

function normalizeLocale(locale: unknown): AppLocale {
  return locale === "ja" ? "ja" : "en";
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

function detectStatus(error: Error): number {
  if (/429/.test(error.message)) {
    return 429;
  }
  if (/4\d{2}/.test(error.message)) {
    return 422;
  }
  return 502;
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
    return Response.json({ error: "Query is required" }, { status: 422 });
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort);

  try {
    const { images } = await fetchPersonImages(query, { locale, signal: controller.signal });
    return Response.json({ images });
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError" || controller.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    const message = toErrorMessage(error);
    const status = error instanceof Error ? detectStatus(error) : 502;
    return Response.json({ error: message }, { status });
  } finally {
    request.signal.removeEventListener("abort", abort);
  }
}
