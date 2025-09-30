import type { Content } from "@google/genai";

import { getGeminiClient } from "./geminiClient";
import { fetchPersonImages } from "./fetchPersonImages";
import type { DeepResearchImage } from "@/shared/deep-research-types";
import type { AppLocale } from "@/shared/person-images";

type Locale = AppLocale;

type FetchSubjectImagesOptions = {
  locale: Locale;
  signal?: AbortSignal;
};

type CacheEntry = {
  expiresAt: number;
  images: DeepResearchImage[];
};

type SubjectCacheEntry = {
  expiresAt: number;
  subject: string;
};

type SubjectResponse = {
  primarySubject?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const SUBJECT_CACHE_TTL_MS = 30 * 60 * 1000;

const imageCache = new Map<string, CacheEntry>();
const subjectCache = new Map<string, SubjectCacheEntry>();

let warnedMissingConfig = false;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() ? value.trim() : undefined;
}

function cacheKey(locale: Locale, subject: string): string {
  return `${locale}:${subject.toLowerCase()}`;
}

function readImageCache(locale: Locale, subject: string): DeepResearchImage[] | null {
  const entry = imageCache.get(cacheKey(locale, subject));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    imageCache.delete(cacheKey(locale, subject));
    return null;
  }
  return entry.images;
}

function writeImageCache(
  locale: Locale,
  subject: string,
  images: DeepResearchImage[],
  { cacheWhenEmpty = true }: { cacheWhenEmpty?: boolean } = {},
): void {
  if (!cacheWhenEmpty && images.length === 0) {
    imageCache.delete(cacheKey(locale, subject));
    return;
  }

  imageCache.set(cacheKey(locale, subject), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    images,
  });
}

function readSubjectCache(locale: Locale, query: string): string | null {
  const key = cacheKey(locale, query);
  const entry = subjectCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    subjectCache.delete(key);
    return null;
  }
  return entry.subject;
}

function writeSubjectCache(locale: Locale, query: string, subject: string): void {
  subjectCache.set(cacheKey(locale, query), {
    subject,
    expiresAt: Date.now() + SUBJECT_CACHE_TTL_MS,
  });
}

function normalizeQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (!signal?.aborted) return;
  throw new DOMException("The operation was aborted.", "AbortError");
}

export async function fetchSubjectImages(
  query: string,
  options: FetchSubjectImagesOptions,
): Promise<DeepResearchImage[]> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  throwIfAborted(options.signal);

  const subject = await resolvePrimarySubject(normalizedQuery, options.locale, options.signal);
  const cached = readImageCache(options.locale, subject);
  if (cached) {
    return cached;
  }

  const apiKey = env("GOOGLE_API_KEY");
  const cseCx = env("GOOGLE_CSE_CX");
  if (!apiKey || !cseCx) {
    warnMissingConfig();
    return attemptFallback(subject, normalizedQuery, options);
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: cseCx,
    q: subject,
    searchType: "image",
    num: "10",
    safe: "active",
    imgType: "face",
  });

  throwIfAborted(options.signal);

  try {
    const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`, {
      signal: options.signal,
      timeout: 15000, // 15秒タイムアウト
    });
    if (!response.ok) {
      let errorBody: string | undefined;
      try {
        const text = await response.text();
        if (text.trim()) {
          errorBody = text.length > 500 ? `${text.slice(0, 500)}...` : text;
        }
      } catch {
        // Swallow errors while reading the error body so we can still surface status.
      }
      console.warn(
        `[fetchSubjectImages] Custom Search API returned ${response.status} for subject "${subject}".${errorBody ? ` Body: ${errorBody}` : ""}`,
      );
      return attemptFallback(subject, normalizedQuery, options);
    }

    const data = (await response.json()) as {
      items?: Array<{
        link?: string;
        title?: string;
        image?: {
          contextLink?: string;
          thumbnailLink?: string;
          width?: number;
          height?: number;
        };
      }>;
    };

    const seen = new Set<string>();
    const images: DeepResearchImage[] = [];

    for (const item of data.items ?? []) {
      if (!item?.link) continue;
      const url = item.link.trim();
      if (!url || seen.has(url.toLowerCase())) continue;
      seen.add(url.toLowerCase());

      images.push({
        url,
        title: item.title?.trim() || undefined,
        sourceUrl: item.image?.contextLink?.trim() || undefined,
        thumbnailUrl: item.image?.thumbnailLink?.trim() || undefined,
        width: item.image?.width,
        height: item.image?.height,
        sourceTitle: extractSourceTitle(item.image?.contextLink),
      });

      if (images.length >= 10) {
        break;
      }
    }

    if (images.length === 0) {
      console.warn(`[fetchSubjectImages] No images found via Google CSE for subject "${subject}", attempting fallback`);
      const fallback = await attemptFallback(subject, normalizedQuery, options);
      if (fallback.length > 0) {
        return fallback;
      }
    }

    console.log(`[fetchSubjectImages] Successfully fetched ${images.length} images for subject "${subject}"`);
    writeImageCache(options.locale, subject, images);
    return images;
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      console.warn(`[fetchSubjectImages] Request aborted for subject "${subject}"`);
      throw error;
    }
    console.error(`[fetchSubjectImages] Failed to fetch subject images for "${subject}"`, error);
    return attemptFallback(subject, normalizedQuery, options);
  }
}

async function attemptFallback(
  subject: string,
  originalQuery: string,
  options: FetchSubjectImagesOptions,
): Promise<DeepResearchImage[]> {
  console.log(`[attemptFallback] Attempting fallback for subject "${subject}", original query "${originalQuery}"`);

  const first = await fetchFallbackSubjectImages(subject, options.locale, options.signal);
  if (first.length > 0) {
    console.log(`[attemptFallback] Found ${first.length} images using subject "${subject}"`);
    writeImageCache(options.locale, subject, first);
    return first;
  }

  if (subject !== originalQuery) {
    console.log(`[attemptFallback] Trying with original query "${originalQuery}"`);
    const second = await fetchFallbackSubjectImages(originalQuery, options.locale, options.signal);
    if (second.length > 0) {
      console.log(`[attemptFallback] Found ${second.length} images using original query "${originalQuery}"`);
      writeImageCache(options.locale, subject, second);
      return second;
    }
  }

  console.warn(`[attemptFallback] No images found for subject "${subject}" or original query "${originalQuery}"`);
  writeImageCache(options.locale, subject, [], { cacheWhenEmpty: false });
  return [];
}

async function fetchFallbackSubjectImages(
  query: string,
  locale: Locale,
  signal: AbortSignal | undefined,
): Promise<DeepResearchImage[]> {
  try {
    console.log(`[fetchFallbackSubjectImages] Fetching Wikimedia images for query "${query}"`);
    const { images } = await fetchPersonImages(query, { locale, signal });
    console.log(`[fetchFallbackSubjectImages] Received ${images.length} images from Wikimedia for query "${query}"`);
    return images.map((image) => ({
      url: image.fullSizeUrl,
      title: image.title,
      sourceUrl: image.sourcePage,
      thumbnailUrl: image.thumbnailUrl,
      sourceTitle: extractSourceTitle(image.sourcePage),
    }));
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      console.warn(`[fetchFallbackSubjectImages] Request aborted for query "${query}"`);
      throw error;
    }
    console.error(`[fetchFallbackSubjectImages] Fallback person image lookup failed for query "${query}"`, error);
    return [];
  }
}

async function resolvePrimarySubject(
  query: string,
  locale: Locale,
  signal: AbortSignal | undefined,
): Promise<string> {
  const cached = readSubjectCache(locale, query);
  if (cached) {
    console.log(`[resolvePrimarySubject] Using cached subject "${cached}" for query "${query}"`);
    return cached;
  }

  const trimmed = normalizeQuery(query);
  if (!trimmed) {
    return trimmed;
  }

  throwIfAborted(signal);

  try {
    const { client, model } = getGeminiClient();
    const prompt = buildSubjectPrompt(trimmed, locale);
    const response = await client.models.generateContent({
      model,
      contents: createContent(prompt),
      config: {
        responseMimeType: "application/json",
        temperature: 0,
        ...(signal ? { abortSignal: signal } : {}),
      },
    });

    const payload = parseSubjectResponse(response.text);
    const candidate = normalizeQuery(payload.primarySubject ?? "");
    const subject = candidate || trimmed;
    console.log(`[resolvePrimarySubject] Resolved subject "${subject}" for query "${query}"`);
    writeSubjectCache(locale, query, subject);
    return subject;
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") {
      console.warn(`[resolvePrimarySubject] Request aborted for query "${query}"`);
      throw error;
    }
    console.warn(`[resolvePrimarySubject] Falling back to raw query for image subject. Query: "${query}"`, error);
    writeSubjectCache(locale, query, trimmed);
    return trimmed;
  }
}

function createContent(text: string): Content[] {
  return [
    {
      role: "user",
      parts: [{ text }],
    },
  ];
}

function buildSubjectPrompt(query: string, locale: Locale): string {
  const localeInstruction = locale === "ja"
    ? "回答の値は可能であれば日本語の正式名称を使ってください。"
    : "Return the value using the entity's canonical English name when possible.";

  return [
    "You assist an investigative analyst.",
    "Given a free-form research query, identify the single best subject name to use for an image search.",
    "Respond with JSON matching {\"primarySubject\": string} and no additional text.",
    "If the query already contains a precise name, reuse it.",
    localeInstruction,
    `Query: "${query}"`,
  ].join("\n");
}

function parseSubjectResponse(raw: string | undefined): SubjectResponse {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as SubjectResponse;
  } catch (error) {
    console.warn("Failed to parse subject JSON", error);
    return {};
  }
}

function warnMissingConfig(): void {
  if (warnedMissingConfig) return;
  warnedMissingConfig = true;
  console.warn(
    "Skipping subject image lookup because GOOGLE_API_KEY or GOOGLE_CSE_CX is not configured.",
  );
}

function extractSourceTitle(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return undefined;
  }
}
