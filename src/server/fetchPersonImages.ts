import { stripHtml } from "./utils/stripHtml";
import type { AppLocale, PersonImage, PersonImageResponse } from "@/shared/person-images";

export type FetchPersonImagesOptions = {
  locale: AppLocale;
  signal?: AbortSignal;
};

const MAX_IMAGES = 10;
const WIKIMEDIA_ENDPOINT = "https://commons.wikimedia.org/w/api.php";
const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const LANGUAGE_SUFFIX: Record<AppLocale, string> = {
  en: "profile portrait",
  ja: "人物 ポートレート",
};

function buildUserAgent() {
  const contact = process.env.WHOISP_CONTACT_EMAIL ?? "contact@whoisp.local";
  return `WhoisP/1.0 (+mailto:${contact})`;
}

const LATIN_LETTER_REGEX = /[a-z]/;

function tokenize(query: string): string[] {
  return query
    .split(/[^\p{Letter}\p{Number}]+/u)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
}

function countMatchingTokens(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const haystack = text.toLowerCase();
  let matches = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) {
      matches += 1;
    }
  }
  return matches;
}

type WikimediaPage = {
  pageid: number;
  title: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    descriptionurl?: string;
    mime?: string;
    extmetadata?: Record<string, { value?: string }>;
  }>;
};

type WikimediaResponse = {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
  error?: {
    code?: string;
    info?: string;
  };
};

function normalizeAttribution(page: WikimediaPage): string | undefined {
  const metadata = page.imageinfo?.[0]?.extmetadata;
  if (!metadata) return undefined;
  const artist = metadata.Artist?.value;
  const credit = metadata.Credit?.value;
  const source = metadata.Source?.value;
  const raw = artist ?? credit ?? source;
  if (!raw) return undefined;
  const text = stripHtml(raw).trim();
  return text.length > 0 ? text : undefined;
}

function normalizeTitle(page: WikimediaPage): string {
  if (page.title) {
    const cleaned = page.title.replace(/^File:/i, "").trim();
    if (cleaned) return cleaned;
  }
  return "Untitled";
}

function extractMatchingText(page: WikimediaPage): string {
  const info = page.imageinfo?.[0];
  if (!info?.extmetadata) return page.title ?? "";
  const { extmetadata } = info;
  const pieces = [
    page.title,
    extmetadata.ObjectName?.value,
    extmetadata.ImageDescription?.value,
    extmetadata.Credit?.value,
  ].filter(Boolean);
  return stripHtml(pieces.join(" \n "));
}

function normalizeImage(
  page: WikimediaPage,
  tokens: string[],
  { requireTokenMatch }: { requireTokenMatch: boolean },
): PersonImage | null {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const mime = info.mime?.toLowerCase();
  if (!mime || !ACCEPTED_MIME_TYPES.has(mime)) return null;

  const fullSizeUrl = info.url ?? info.thumburl;
  const thumbUrl = info.thumburl ?? info.url;
  const sourcePage = info.descriptionurl;

  if (!fullSizeUrl || !thumbUrl || !sourcePage) {
    return null;
  }

  const text = extractMatchingText(page);
  const matchCount = countMatchingTokens(text, tokens);
  if (requireTokenMatch && matchCount === 0) {
    return null;
  }

  return {
    id: `commons-${page.pageid}`,
    title: normalizeTitle(page),
    thumbnailUrl: thumbUrl,
    fullSizeUrl,
    sourcePage,
    attribution: normalizeAttribution(page),
  };
}

function buildSearchQuery(query: string, locale: AppLocale): string {
  const suffix = LANGUAGE_SUFFIX[locale];
  return `${query} ${suffix}`.trim();
}

export async function fetchPersonImages(query: string, { locale, signal }: FetchPersonImagesOptions): Promise<PersonImageResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { images: [] };
  }

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return { images: [] };
  }

  const requireTokenMatch = tokens.some((token) => LATIN_LETTER_REGEX.test(token));

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrlimit: "20",
    gsrnamespace: "6",
    gsrprop: "size|wordcount",
    gsrsearch: buildSearchQuery(trimmed, locale),
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "512",
    origin: "*",
  });

  const url = `${WIKIMEDIA_ENDPOINT}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    signal,
    headers: {
      "User-Agent": buildUserAgent(),
    },
  });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed with ${response.status}`);
  }

  const data = (await response.json()) as WikimediaResponse;
  if (data.error) {
    throw new Error(data.error.info ?? "Wikimedia API error");
  }

  const pages = data.query?.pages ? Object.values(data.query.pages) : [];

  const seen = new Set<string>();
  const images: PersonImage[] = [];

  for (const page of pages) {
    const image = normalizeImage(page, tokens, { requireTokenMatch });
    if (!image) continue;
    const key = image.fullSizeUrl.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(image);
    if (images.length >= MAX_IMAGES) break;
  }

  return { images };
}
