import { NextRequest } from "next/server";

export const runtime = "edge"; // fast cold starts

function buildQueries({ fullName, company, position }: { fullName: string; company?: string; position?: string }) {
  const quotedName = `"${fullName.trim()}"`;
  const parts: string[] = [];
  if (company && company.trim()) parts.push(`"${company.trim()}"`);
  if (position && position.trim()) parts.push(`"${position.trim()}"`);
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
  // de-dup
  return Array.from(new Set(targets)).slice(0, 8);
}

function normalizeSerpResult(item: any) {
  const url: string = item.link || item.url || "";
  const source = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (_) {
      return undefined;
    }
  })();
  return {
    title: item.title || item.name || url,
    link: url,
    snippet: item.snippet || item.description || item.content,
    source,
    thumbnail: item.thumbnail || item.favicon || null,
  };
}

async function fetchWithSerpApi(query: string) {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "ja");
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`SerpAPI error: ${res.status}`);
  const json = await res.json();
  const organic = json.organic_results || [];
  return organic.map((r: any) => normalizeSerpResult(r));
}

// Fallback: return only direct search URLs (no scraping)
function fallbackLinks(query: string) {
  const make = (title: string, link: string) => ({ title, link, snippet: undefined as string | undefined, source: undefined as string | undefined, thumbnail: null as string | null, query });
  return [
    make("Google 検索", `https://www.google.com/search?q=${encodeURIComponent(query)}`),
    make("Bing 検索", `https://www.bing.com/search?q=${encodeURIComponent(query)}`),
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName: string = (body?.fullName || "").trim();
    const company: string | undefined = (body?.company || "").trim() || undefined;
    const position: string | undefined = (body?.position || "").trim() || undefined;

    if (!fullName) {
      return new Response(JSON.stringify({ message: "氏名は必須です" }), { status: 400 });
    }

    const queries = buildQueries({ fullName, company, position });

    const hasSerpKey = !!process.env.SERPAPI_API_KEY;

    const results = await Promise.allSettled(
      queries.map(async (q) => {
        if (hasSerpKey) {
          const items = await fetchWithSerpApi(q);
          if (items) return items.map((i) => ({ ...i, query: q }));
        }
        return fallbackLinks(q);
      })
    );

    const flat = results
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      // merge and de-dup by link
      .filter(Boolean) as Array<any>;

    const uniqueMap = new Map<string, any>();
    for (const r of flat) {
      const key = r.link;
      if (!uniqueMap.has(key)) uniqueMap.set(key, r);
    }

    const normalized = Array.from(uniqueMap.values());

    return new Response(
      JSON.stringify({ results: normalized, provider: hasSerpKey ? "serpapi" : "links" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e.message || "サーバーエラー" }), { status: 500 });
  }
}