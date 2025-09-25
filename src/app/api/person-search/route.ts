import { NextRequest } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "edge"; // keep edge for fast cold starts

const MODEL_ID = process.env.GOOGLE_GENAI_MODEL?.trim() || "gemini-2.5-flash-lite";

type PersonQuery = {
  fullName: string;
  company?: string;
  position?: string;
  extraInfo?: string;
};

type GeminiResult = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
  query?: string;
  extraInfo?: string;
};

type ApiResult = {
  title: string;
  link: string;
  snippet?: string;
  source?: string;
  query?: string;
  extraInfo?: string;
};

function buildQueries({ fullName, company, position, extraInfo }: PersonQuery) {
  const quotedName = `"${fullName.trim()}"`;
  const parts: string[] = [];
  if (company && company.trim()) parts.push(`"${company.trim()}"`);
  if (position && position.trim()) parts.push(`"${position.trim()}"`);
  if (extraInfo && extraInfo.trim()) parts.push(extraInfo.trim());
  const base = [quotedName, ...parts].join(" ");

  const targets = [
    base,
    `${base} site:linkedin.com`,
    `${base} site:x.com OR site:twitter.com`,
    `${base} site:facebook.com`,
    `${base} site:instagram.com`,
    `${base} site:github.com`,
    `${base} site:qiita.com`,
    `${base} site:note.com`,
    `${base} site:wantedly.com`,
    `${base} site:researchmap.jp`,
    `${base} site:medium.com`,
  ];

  return Array.from(new Set(targets)).slice(0, 10);
}

function fallbackLinks(queries: string[]): ApiResult[] {
  const make = (title: string, link: string, query: string): ApiResult => ({
    title,
    link,
    query,
  });

  const links: ApiResult[] = [];
  for (const q of queries.slice(0, 3)) {
    links.push(make("Google 検索", `https://www.google.com/search?q=${encodeURIComponent(q)}`, q));
    links.push(make("Bing 検索", `https://www.bing.com/search?q=${encodeURIComponent(q)}`, q));
  }
  return links;
}

function domainFromUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return undefined;
  }
}

function pickApiKey(requestKey: unknown) {
  const fromRequest = typeof requestKey === "string" && requestKey.trim().length > 0 ? requestKey.trim() : null;
  if (fromRequest) return fromRequest;
  const studio = process.env.GOOGLE_GENAI_API_KEY?.trim();
  if (studio) return studio;
  const cloud =
    process.env.GOOGLE_CLOUD_API_KEY?.trim() ||
    process.env.GOOGLE_GENAI_CLOUD_API_KEY?.trim() ||
    process.env.GOOGLE_VERTEX_API_KEY?.trim();
  if (cloud) return cloud;
  return null;
}

function createClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

function toApiResults(raw: GeminiResult[]): ApiResult[] {
  const seen = new Set<string>();
  const cleaned: ApiResult[] = [];

  for (const item of raw) {
    const link = item.link?.trim();
    if (!link) continue;
    if (seen.has(link)) continue;
    seen.add(link);

    cleaned.push({
      title: item.title?.trim() || link,
      link,
      snippet: item.snippet?.trim() || undefined,
      source: item.source?.trim() || domainFromUrl(link),
      query: item.query?.trim() || undefined,
      extraInfo: item.extraInfo?.trim() || undefined,
    });
  }

  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName: string = (body?.fullName || "").trim();
    const company: string | undefined = (body?.company || "").trim() || undefined;
    const position: string | undefined = (body?.position || "").trim() || undefined;
    const extraInfo: string | undefined = (body?.extraInfo || "").trim() || undefined;
    const apiKeyFromRequest = body?.apiKey;

    if (!fullName) {
      return new Response(JSON.stringify({ message: "氏名は必須です" }), { status: 400 });
    }

    const apiKey = pickApiKey(apiKeyFromRequest);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          message:
            "Gemini APIキーが設定されていません。環境変数または設定メニューからAPIキーを登録してください。",
        }),
        { status: 500 }
      );
    }

    const queries = buildQueries({ fullName, company, position, extraInfo });

    const client = createClient(apiKey);

    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You help the WhoisP research assistant gather only publicly available information about a person.",
                "Return structured JSON that matches the provided schema.",
                "Use Google Search grounding to validate each result before including it.",
                "For each result, include a descriptive title, the canonical permalink, a short snippet, the domain name as source,",
                "and indicate which search query produced it.",
                "Cap the list between 6 and 14 high-signal items prioritised by confidence.",
                "If no grounded results are available, return an empty array.",
                "Person details:",
                `- Full name: ${fullName}`,
                company ? `- Company: ${company}` : "",
                position ? `- Position: ${position}` : "",
                extraInfo ? `- Additional context: ${extraInfo}` : "",
                "Suggested search queries (you may adapt them):",
                ...queries.map((q, idx) => `${idx + 1}. ${q}`),
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["title", "link"],
                properties: {
                  title: { type: Type.STRING },
                  link: { type: Type.STRING },
                  snippet: { type: Type.STRING, nullable: true },
                  source: { type: Type.STRING, nullable: true },
                  query: { type: Type.STRING, nullable: true },
                  extraInfo: { type: Type.STRING, nullable: true },
                },
              },
            },
          },
          required: ["results"],
        },
        tools: [{ googleSearch: {} }],
      },
    });

    let parsed: GeminiResult[] = [];
    try {
      const text = response.text ?? "";
      if (text) {
        const json = JSON.parse(text) as { results?: GeminiResult[] };
        if (Array.isArray(json.results)) {
          parsed = json.results;
        }
      }
    } catch (error) {
      parsed = [];
    }

    let normalized = toApiResults(parsed);

    if (normalized.length === 0) {
      normalized = fallbackLinks(queries);
    }

    return new Response(
      JSON.stringify({
        results: normalized,
        provider: normalized.length && parsed.length ? "gemini" : "fallback",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : "サーバーエラー";
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
}
