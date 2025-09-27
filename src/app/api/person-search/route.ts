import { NextRequest } from "next/server";
import { DynamicRetrievalConfigMode, GoogleGenAI } from "@google/genai";
import { serverEnv } from "@/lib/env";

export const runtime = "edge"; // fast cold starts

const MODEL_ID = serverEnv.GOOGLE_GENAI_MODEL;

const MANDATORY_CHANNELS = [
  {
    key: "x",
    domains: ["x.com", "twitter.com"],
    label: {
      ja: "X（旧Twitter）",
      en: "X (formerly Twitter)",
    },
    notFound: {
      ja: "X（旧Twitter）では関連する公開情報が見つかりませんでした。",
      en: "No publicly grounded results were found on X (formerly Twitter).",
    },
    found: {
      ja: "X（旧Twitter）で確認できたアカウントや投稿情報です。",
      en: "Findings verified on X (formerly Twitter).",
    },
  },
  {
    key: "linkedin",
    domains: ["linkedin.com"],
    label: {
      ja: "LinkedIn",
      en: "LinkedIn",
    },
    notFound: {
      ja: "LinkedInでは該当するプロフィールを確認できませんでした。",
      en: "No matching LinkedIn profile could be verified.",
    },
    found: {
      ja: "LinkedInで確認できたプロフィールや掲載情報です。",
      en: "Profile details verified via LinkedIn.",
    },
  },
  {
    key: "facebook",
    domains: ["facebook.com"],
    label: {
      ja: "Facebook",
      en: "Facebook",
    },
    notFound: {
      ja: "Facebookでは該当する公開情報が見つかりませんでした。",
      en: "No publicly grounded results were found on Facebook.",
    },
    found: {
      ja: "Facebookで確認できた公開プロフィールや投稿です。",
      en: "Verified public profiles or posts on Facebook.",
    },
  },
];

type Lang = "ja" | "en";

type PersonQuery = {
  fullName: string;
  company?: string;
  position?: string;
  extraInfo?: string;
};

type GeminiReference = {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
  source?: unknown;
};

type GeminiSection = {
  channel?: unknown;
  summary?: unknown;
  references?: unknown;
};

type GeminiResearchJson = {
  overview?: unknown;
  sections?: unknown;
  provider?: unknown;
  generatedAt?: unknown;
};

type InsightReference = {
  title: string;
  link: string;
  snippet?: string;
  source?: string;
};

type InsightSection = {
  channel: string;
  summary: string;
  references: InsightReference[];
};

type PersonResearchInsights = {
  overview: string;
  sections: InsightSection[];
  provider?: string;
  generatedAt?: string;
};

function buildQueries({ fullName, company, position, extraInfo }: PersonQuery) {
  const trimmedName = fullName.trim();
  const quotedName = `"${trimmedName}"`;
  const baseParts: string[] = [];
  if (company && company.trim()) baseParts.push(`"${company.trim()}"`);
  if (position && position.trim()) baseParts.push(`"${position.trim()}"`);
  if (extraInfo && extraInfo.trim()) baseParts.push(extraInfo.trim());
  const base = [quotedName, ...baseParts].join(" ").trim();

  const plainName = trimmedName.replace(/\s+/g, " ");
  const firstLast = plainName.split(" ");
  const lastName = firstLast.length > 1 ? firstLast.at(-1) : plainName;

  const targetedSites = [
    "site:linkedin.com/in",
    "site:linkedin.com/company",
    "site:x.com",
    "site:twitter.com",
    "site:facebook.com",
    "site:instagram.com",
    "site:github.com",
    "site:qiita.com",
    "site:note.com",
    "site:wantedly.com",
    "site:researchmap.jp",
    "site:medium.com",
  ];

  const extraCombos = [
    `${quotedName} profile`,
    `${quotedName} ${company ? `"${company}"` : ""} biography`.trim(),
    `${plainName} resume`,
    `${plainName} ${position ?? "profile"}`.trim(),
    `${lastName} ${company ?? ""} linkedin`.trim(),
  ];

  const queries = new Set<string>();
  queries.add(base || quotedName);
  queries.add(`${plainName}`);
  for (const combo of extraCombos) {
    if (combo.trim()) queries.add(combo.trim());
  }
  for (const site of targetedSites) {
    queries.add(`${base || quotedName} ${site}`.trim());
  }

  return Array.from(queries).slice(0, 18);
}

function domainFromUrl(url: string | undefined) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function pickApiKey(requestKey: unknown) {
  const fromRequest = typeof requestKey === "string" && requestKey.trim().length > 0 ? requestKey.trim() : null;
  if (fromRequest) return fromRequest;
  const studio = serverEnv.GOOGLE_GENAI_API_KEY;
  if (studio) return studio;
  const cloud =
    serverEnv.GOOGLE_CLOUD_API_KEY ||
    serverEnv.GOOGLE_GENAI_CLOUD_API_KEY ||
    serverEnv.GOOGLE_VERTEX_API_KEY;
  if (cloud) return cloud;
  return null;
}

function createClient(apiKey: string) {
  return new GoogleGenAI({ apiKey });
}

function toCleanString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

function toCleanLink(value: unknown) {
  const str = toCleanString(value);
  if (!str) return undefined;
  try {
    const url = new URL(str);
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeGeminiInsights(
  payload: GeminiResearchJson | null,
  lang: Lang
): PersonResearchInsights | null {
  if (!payload) return null;

  const overview = toCleanString(payload.overview) ?? "";
  const provider =
    toCleanString(payload.provider) ||
    (lang === "ja"
      ? `${MODEL_ID} (Google検索グラウンディング)`
      : `${MODEL_ID} with Google grounding`);
  const generatedAt = toCleanString(payload.generatedAt) ?? new Date().toISOString();

  const sectionsInput = Array.isArray(payload.sections) ? (payload.sections as GeminiSection[]) : [];
  const sections: InsightSection[] = [];
  const seenLinks = new Set<string>();

  for (const rawSection of sectionsInput) {
    const channel = toCleanString(rawSection.channel) ||
      (lang === "ja" ? "追加の調査" : "Additional Findings");
    const summary = toCleanString(rawSection.summary) || "";

    const referencesRaw = Array.isArray(rawSection.references)
      ? (rawSection.references as GeminiReference[])
      : [];

    const references: InsightReference[] = [];
    for (const ref of referencesRaw) {
      const link = toCleanLink(ref.link);
      if (!link || seenLinks.has(link)) continue;
      seenLinks.add(link);
      references.push({
        title: toCleanString(ref.title) || link,
        link,
        snippet: toCleanString(ref.snippet),
        source: toCleanString(ref.source) || domainFromUrl(link),
      });
    }

    if (references.length === 0) {
      // skip sections without grounded references to avoid hallucinated summaries
      continue;
    }

    sections.push({
      channel,
      summary: summary || (lang === "ja" ? "詳細な説明が提供されませんでした。" : "No summary provided."),
      references,
    });
  }

  if (!overview && sections.length === 0) {
    return null;
  }

  return {
    overview,
    sections,
    provider,
    generatedAt,
  };
}

function ensureMandatoryChannels(insights: PersonResearchInsights, lang: Lang): PersonResearchInsights {
  const channelRefs = new Map<string, { references: InsightReference[]; summaries: string[] }>();
  const remainingSections: InsightSection[] = [];

  for (const section of insights.sections ?? []) {
    const leftover: InsightReference[] = [];
    for (const ref of section.references) {
      const domain = domainFromUrl(ref.link)?.toLowerCase();
      const matched = MANDATORY_CHANNELS.find((channel) =>
        channel.domains.some((target) => domain === target || domain?.endsWith(`.${target}`))
      );
      if (matched) {
        const bucket = channelRefs.get(matched.key) ?? { references: [], summaries: [] };
        bucket.references.push(ref);
        if (section.summary) bucket.summaries.push(section.summary);
        channelRefs.set(matched.key, bucket);
      } else {
        leftover.push(ref);
      }
    }

    if (leftover.length > 0) {
      remainingSections.push({ ...section, references: leftover });
    }
  }

  const ensuredSections: InsightSection[] = [...remainingSections];

  for (const channel of MANDATORY_CHANNELS) {
    const bucket = channelRefs.get(channel.key);
    if (bucket && bucket.references.length > 0) {
      const summaryBase = bucket.summaries.find(Boolean) ?? channel.found[lang];
      ensuredSections.push({
        channel: channel.label[lang],
        summary: summaryBase,
        references: bucket.references,
      });
      continue;
    }

    ensuredSections.push({
      channel: channel.label[lang],
      summary: channel.notFound[lang],
      references: [],
    });
  }

  return {
    ...insights,
    sections: ensuredSections,
  };
}

function buildPrompts({
  fullName,
  company,
  position,
  extraInfo,
  queries,
  lang,
}: PersonQuery & { queries: string[]; lang: Lang }) {
  const isJa = lang === "ja";
  const header = isJa
    ? "あなたは公開情報リサーチャーです。指定された人物についてGoogle検索のグラウンディングを使い、信頼できる情報だけをまとめてください。"
    : "You are a public-records researcher. Use Google grounding to gather trustworthy information about the requested person.";

  const outputFormat = isJa
    ? `必ずJSONのみを返してください。Markdownのコードブロックは禁止です。フォーマットは次の通りです:
{
  "overview": "人物全体の要約",
  "sections": [
    {
      "channel": "Google検索 / X (旧Twitter) などのチャネル名",
      "summary": "そのチャネルから分かったこと。人物像や裏付け情報を具体的に書く",
      "references": [
        {
          "title": "参照元のタイトル",
          "link": "https://...",
          "snippet": "要点",
          "source": "ドメイン名"
        }
      ]
    }
  ],
  "provider": "利用したモデルなど (任意)",
  "generatedAt": "ISO 8601 時刻 (任意)"
}`
    : `Return JSON only (no Markdown). Use this exact shape:
{
  "overview": "Concise narrative of who the person is and what was verified",
  "sections": [
    {
      "channel": "Channel name such as Google Search, X (Twitter), LinkedIn",
      "summary": "What this channel reveals about the person and why it matters",
      "references": [
        {
          "title": "Source title",
          "link": "https://...",
          "snippet": "Key quote or evidence",
          "source": "Domain name"
        }
      ]
    }
  ],
  "provider": "Model attribution (optional)",
  "generatedAt": "ISO 8601 timestamp (optional)"
}`;

  const guidance = isJa
    ? "各セクションでは、どの検索チャネルで何が分かったかを明確にし、引用元リンクを必ず含めてください。人物像や役割、確認できたアカウント、注目すべき出来事などを具体的に書きます。参照リンクはGoogleのグラウンディング結果から得たURLのみを使用し、裏付けの無い情報は一切書かないでください。確認できない場合は、その旨を明示し、新しい情報を作らないでください。特にX（旧Twitter）、LinkedIn、Facebookについては、証拠が得られた場合は専用のセクションを作成し、得られない場合も「見つからなかった」と明記してください。"
    : "For each section, clarify which discovery channel was used, what it verified about the person, and include grounded URLs for every statement (Google-grounded links only). Never fabricate details—if a channel has no trustworthy evidence, explicitly state that nothing was found. Always report on X (formerly Twitter), LinkedIn, and Facebook: create dedicated sections when you have grounded evidence, or state that nothing was found if the search came up empty.";

  const personaLines = [
    `Full name: ${fullName}`,
    company ? `Company: ${company}` : null,
    position ? `Position: ${position}` : null,
    extraInfo ? `Additional context: ${extraInfo}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const queriesLines = queries.map((query, idx) => `${idx + 1}. ${query}`).join("\n");

  const systemInstruction = [
    header,
    outputFormat,
    guidance,
    isJa
      ? "言語はすべて日本語で書いてください。"
      : "Write everything in English.",
    isJa
      ? "幅広いWeb情報を調べ、人物の全体像と裏付けを整理してください。Groundedな証拠が得られない場合は「見つからなかった」と明確に書きます。"
      : "Survey the public web broadly, organise the person's profile with verifiable evidence, and explicitly state when no grounded evidence exists.",
    isJa
      ? "各セクションの結論は対応する参照URLで必ず裏付けてください。"
      : "Support every section conclusion with its referenced URLs; do not invent sources.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const userPromptParts = [
    isJa ? "人物情報:" : "Subject information:",
    personaLines || (isJa ? "(氏名以外の追加情報はありません)" : "(No additional profile metadata provided)"),
    isJa ? "推奨検索クエリ:" : "Recommended search queries:",
    queriesLines || (isJa ? "(追加の検索クエリは指定されていません)" : "(No supplemental queries supplied)"),
  ];

  const userPrompt = userPromptParts.filter(Boolean).join("\n\n");

  return { systemInstruction, userPrompt };
}

function buildNoResultsInsights(lang: Lang, overviewOverride?: string): PersonResearchInsights {
  const overview =
    overviewOverride ||
    (lang === "ja"
      ? "調査を実行しましたが、Googleのグラウンディング付きで報告できる情報は見つかりませんでした。"
      : "The search completed but did not surface grounded findings to report.");

  const provider =
    lang === "ja"
      ? `${MODEL_ID} (結果なし)`
      : `${MODEL_ID} (no grounded findings)`;

  return {
    overview,
    sections: [],
    provider,
    generatedAt: new Date().toISOString(),
  };
}

async function generateInsights(
  client: GoogleGenAI,
  params: PersonQuery & { queries: string[]; lang: Lang }
): Promise<PersonResearchInsights> {
  const { lang } = params;
  const { systemInstruction, userPrompt } = buildPrompts(params);

  try {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      config: {
        systemInstruction: {
          role: "system",
          parts: [{ text: systemInstruction }],
        },
        temperature: 0.1,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 3072,
        tools: [
          { googleSearch: {} },
          {
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: DynamicRetrievalConfigMode.MODE_DYNAMIC,
              },
            },
          },
        ],
        toolConfig: {
          retrievalConfig: {
            languageCode: lang,
          },
        },
        safetySettings: [],
      },
    });

    const normalized = normalizeGeminiInsights(extractStructuredInsights(response), lang);
    if (normalized) {
      return normalized;
    }
  } catch (error) {
    if (isSearchGroundingUnsupported(error)) {
      console.error("[person-search] search grounding unavailable for model", MODEL_ID);
      return buildNoResultsInsights(
        lang,
        lang === "ja"
          ? "現在のGeminiモデルまたはAPIキーではGoogle検索グラウンディングが利用できません。`GOOGLE_GENAI_MODEL=gemini-2.5-flash`など検索対応モデルを指定し、Search Grounding を有効化してください。"
          : "Google Search grounding is disabled for the current Gemini model or API key. Set `GOOGLE_GENAI_MODEL=gemini-2.5-flash` (or another search-capable model) and enable Search Grounding to retrieve live sources."
      );
    }

    console.error("[person-search] search failed", error);
  }

  return buildNoResultsInsights(lang);
}

function isSearchGroundingUnsupported(error: any) {
  const message =
    typeof error?.message === "string"
      ? error.message
      : typeof error?.error?.message === "string"
        ? error.error.message
        : "";
  return /Search Grounding is not supported/i.test(message);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName: string = (body?.fullName || "").trim();
    const company: string | undefined = (body?.company || "").trim() || undefined;
    const position: string | undefined = (body?.position || "").trim() || undefined;
    const extraInfo: string | undefined = (body?.extraInfo || "").trim() || undefined;
    const apiKeyFromRequest = body?.apiKey;
    const lang: Lang = body?.lang === "en" ? "en" : "ja";

    if (!fullName) {
      const message = lang === "ja" ? "氏名は必須です" : "Full name is required";
      return new Response(JSON.stringify({ message }), { status: 400 });
    }

    const apiKey = pickApiKey(apiKeyFromRequest);

    if (!apiKey) {
      const message =
        lang === "ja"
          ? "Gemini APIキーが設定されていません。`.env.local` にAPIキーを記載するか、設定メニューからブラウザ用キーを登録してください。"
          : "Gemini API key is missing. Add a key to `.env.local` or provide a per-browser key from Settings.";
      return new Response(JSON.stringify({ message }), { status: 500 });
    }

    const client = createClient(apiKey);
    const person: PersonQuery = { fullName, company, position, extraInfo };
    const queries = buildQueries(person);

    const rawInsights = await generateInsights(client, { ...person, queries, lang });
    const insights = ensureMandatoryChannels(rawInsights, lang);

    return new Response(JSON.stringify({ insights }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
}

function extractStructuredInsights(response: any): GeminiResearchJson | null {
  const candidateSources = [response, response?.response].filter(Boolean);
  const texts: string[] = [];
  const jsonPayloads: GeminiResearchJson[] = [];

  const addText = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      texts.push(value.trim());
    }
  };

  for (const source of candidateSources) {
    addText(source?.text);
    const candidates = Array.isArray(source?.candidates) ? source.candidates : [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part?.jsonValue && typeof part.jsonValue === "object") {
            jsonPayloads.push(part.jsonValue as GeminiResearchJson);
          }
          addText(part?.text);
        }
      }
    }
  }

  if (jsonPayloads.length > 0) {
    return jsonPayloads[0];
  }

  for (const raw of texts) {
    const parsed = tryParseJson(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as GeminiResearchJson;
    }
  }

  return null;
}

function tryParseJson(raw: string) {
  const cleaned = raw
    .replace(/^```json/gi, "")
    .replace(/^```/gi, "")
    .replace(/```$/g, "")
    .trim();

  const attempt = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  const direct = attempt(cleaned);
  if (direct) return direct;

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = cleaned.slice(firstBrace, lastBrace + 1);
    const obj = attempt(sliced);
    if (obj) return obj;
  }

  return null;
}
