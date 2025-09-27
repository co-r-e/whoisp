import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge"; // fast cold starts

const MODEL_ID = process.env.GOOGLE_GENAI_MODEL?.trim() || "gemini-2.5-flash-lite";

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

type SearchMode = "web" | "social";

function buildWebQueries({ fullName, company, position, extraInfo }: PersonQuery) {
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

function buildSocialQueries({ fullName, company, position, extraInfo }: PersonQuery) {
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

  const socialSites = [
    "site:x.com",
    "site:twitter.com",
    "site:linkedin.com/in",
    "site:linkedin.com/company",
    "site:facebook.com",
  ];

  const queries = new Set<string>();
  queries.add(`${base || quotedName} site:x.com`.trim());
  queries.add(`${base || quotedName} site:linkedin.com/in`.trim());
  queries.add(`${base || quotedName} site:facebook.com`.trim());
  queries.add(`${plainName} linkedin profile`.trim());
  queries.add(`${plainName} x.com account`.trim());
  queries.add(`${plainName} facebook profile`.trim());
  queries.add(`${lastName} ${company ?? ""} linkedin`.trim());

  for (const site of socialSites) {
    queries.add(`${quotedName} ${site}`.trim());
    if (company) queries.add(`${quotedName} ${site} "${company}"`.trim());
  }

  return Array.from(queries)
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, 16);
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
  const provider = toCleanString(payload.provider) ||
    (lang === "ja" ? "Gemini 2.5 Flash-Lite (Google検索グラウンディング)" : "Gemini 2.5 Flash-Lite with Google grounding");
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

function buildPrompt({
  fullName,
  company,
  position,
  extraInfo,
  queries,
  lang,
  mode,
}: PersonQuery & { queries: string[]; lang: Lang; mode: SearchMode }) {
  const isJa = lang === "ja";
  const isSocial = mode === "social";
  const header = (() => {
    if (isSocial) {
      return isJa
        ? "あなたは公開情報リサーチャーです。Google検索のグラウンディングを使い、X（旧Twitter）・LinkedIn・Facebookに限定した公開情報を調査してまとめてください。"
        : "You are a public-records researcher. Use Google grounding to investigate only X (formerly Twitter), LinkedIn, and Facebook.";
    }
    return isJa
      ? "あなたは公開情報リサーチャーです。指定された人物についてGoogle検索のグラウンディングを使い、信頼できる情報だけをまとめてください。"
      : "You are a public-records researcher. Use Google grounding to gather trustworthy information about the requested person.";
  })();

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

  const guidance = (() => {
    if (isSocial) {
      return isJa
        ? "X（旧Twitter）・LinkedIn・Facebookごとにセクションを分け、確認できたアカウントや公開投稿、プロフィールの要点と、その裏付けとなるリンクを提示してください。証拠が無ければ「見つからなかった」と明記し、新しい情報を捏造しないでください。Googleのグラウンディングから得たURLのみを引用し、それ以外のサイトは扱わないでください。"
        : "Create dedicated sections for X (formerly Twitter), LinkedIn, and Facebook. Report verified accounts, public posts, or profile details along with grounded URLs. If no trustworthy evidence exists, state clearly that nothing was found. Rely only on Google-grounded URLs for these platforms.";
    }
    return isJa
      ? "各セクションでは、どの検索チャネルで何が分かったかを明確にし、引用元リンクを必ず含めてください。人物像や役割、確認できたアカウント、注目すべき出来事などを具体的に書きます。参照リンクはGoogleのグラウンディング結果から得たURLのみを使用し、裏付けの無い情報は一切書かないでください。確認できない場合は、その旨を明示し、新しい情報を作らないでください。特にX（旧Twitter）、LinkedIn、Facebookについては、証拠が得られた場合は専用のセクションを作成し、得られない場合も「見つからなかった」と明記してください。"
      : "For each section, clarify which discovery channel was used, what it verified about the person, and include grounded URLs for every statement (Google-grounded links only). Never fabricate details—if a channel has no trustworthy evidence, explicitly state that nothing was found. Always report on X (formerly Twitter), LinkedIn, and Facebook: create dedicated sections when you have grounded evidence, or state that nothing was found if the search came up empty.";
  })();

  const modeGoal = (() => {
    if (isSocial) {
      return isJa
        ? "調査対象はSNSに限定します。Googleの検索結果でもX・LinkedIn・Facebook以外のサイトは引用しないでください。"
        : "Restrict the investigation to the three social networks only. Even when using Google, do not cite any site other than X, LinkedIn, or Facebook.";
    }
    return isJa
      ? "幅広いWeb情報を調べ、人物の全体像と裏付けを整理してください。"
      : "Explore broad web information to capture the person's overall profile with evidence.";
  })();

  const personaLines = [
    `Full name: ${fullName}`,
    company ? `Company: ${company}` : null,
    position ? `Position: ${position}` : null,
    extraInfo ? `Additional context: ${extraInfo}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const queriesLines = queries.map((query, idx) => `${idx + 1}. ${query}`).join("\n");

  return [
    header,
    outputFormat,
    guidance,
    isJa
      ? "言語はすべて日本語で書いてください。"
      : "Write everything in English.",
    modeGoal,
    "人物情報:",
    personaLines,
    "推奨検索クエリ:",
    queriesLines,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildNoResultsInsights(lang: Lang, mode: SearchMode): PersonResearchInsights {
  const isWeb = mode === "web";
  const overview = isWeb
    ? lang === "ja"
      ? "Web調査を実行しましたが、Googleのグラウンディング付きで報告できる情報は見つかりませんでした。"
      : "The web search completed but did not surface grounded findings to report."
    : lang === "ja"
      ? "SNS調査を実行しましたが、X・LinkedIn・Facebookで裏付け可能な公開情報は見つかりませんでした。"
      : "The social search finished but found no verifiable public information on X, LinkedIn, or Facebook.";

  const provider = lang === "ja"
    ? "Gemini 2.5 Flash-Lite (結果なし)"
    : "Gemini 2.5 Flash-Lite (no grounded findings)";

  return {
    overview,
    sections: [],
    provider,
    generatedAt: new Date().toISOString(),
  };
}

async function runSearchTask(
  client: GoogleGenAI,
  params: PersonQuery & { queries: string[]; lang: Lang; mode: SearchMode }
): Promise<PersonResearchInsights> {
  const { lang, mode } = params;
  const prompt = buildPrompt(params);
  const modeLabel = lang === "ja"
    ? mode === "social" ? "SNS調査" : "Web調査"
    : mode === "social" ? "social search" : "web search";

  try {
    const response = await client.models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        temperature: 0.2,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 2048,
        tools: [{ googleSearch: {} }],
      },
    });

    const normalized = normalizeGeminiInsights(extractStructuredInsights(response), lang);
    if (!normalized) {
      return buildNoResultsInsights(lang, mode);
    }

    return normalized;
  } catch (error) {
    console.error(`[person-search] ${mode} search failed`, error);
    if (error instanceof Error && error.message) {
      throw error;
    }
    throw new Error(
      lang === "ja"
        ? `${modeLabel}の実行中にエラーが発生しました。後でもう一度お試しください。`
        : `An error occurred during the ${modeLabel}. Please try again later.`
    );
  }
}

function mergeInsights(parts: PersonResearchInsights[], lang: Lang): PersonResearchInsights {
  const overviewParts: string[] = [];
  const sections: InsightSection[] = [];
  const providers = new Set<string>();
  let latestGeneratedAt: string | undefined;

  for (const insight of parts) {
    if (!insight) continue;
    if (insight.overview?.trim()) {
      overviewParts.push(insight.overview.trim());
    }
    if (Array.isArray(insight.sections)) {
      sections.push(...insight.sections);
    }
    if (insight.provider?.trim()) {
      providers.add(insight.provider.trim());
    }
    if (insight.generatedAt) {
      if (!latestGeneratedAt || new Date(insight.generatedAt).getTime() > new Date(latestGeneratedAt).getTime()) {
        latestGeneratedAt = insight.generatedAt;
      }
    }
  }

  const overview = overviewParts.length
    ? Array.from(new Set(overviewParts)).join("\n\n")
    : lang === "ja"
      ? "複数チャネルの調査結果をまとめました。"
      : "Combined findings from parallel search channels.";

  const provider = providers.size ? Array.from(providers).join(" | ") : undefined;

  return {
    overview,
    sections,
    provider,
    generatedAt: latestGeneratedAt ?? new Date().toISOString(),
  };
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
          ? "Gemini APIキーが設定されていません。環境変数または設定メニューからAPIキーを登録してください。"
          : "Gemini API key is missing. Please configure it via environment variables or the Settings menu.";
      return new Response(JSON.stringify({ message }), { status: 500 });
    }

    const client = createClient(apiKey);
    const person: PersonQuery = { fullName, company, position, extraInfo };
    const webQueries = buildWebQueries(person);
    const socialQueries = buildSocialQueries(person);

    const [webInsights, socialInsights] = await Promise.all([
      runSearchTask(client, { ...person, queries: webQueries, lang, mode: "web" }),
      runSearchTask(client, { ...person, queries: socialQueries, lang, mode: "social" }),
    ]);

    const combined = mergeInsights([webInsights, socialInsights], lang);
    const insights = ensureMandatoryChannels(combined, lang);

    return new Response(JSON.stringify({ insights }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : "Internal Server Error";
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
}

function extractStructuredInsights(response: any): GeminiResearchJson | null {
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  const texts: string[] = [];

  const addText = (value: unknown) => {
    if (typeof value === "string" && value.trim()) {
      texts.push(value.trim());
    }
  };

  addText(response?.text);

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        addText(part?.text);
      }
    }
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
