"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileDown } from "lucide-react";

export type InsightReference = {
  title: string;
  link: string;
  snippet?: string;
  source?: string;
};

export type InsightSection = {
  channel: string;
  summary: string;
  references: InsightReference[];
};

export type PersonResearchInsights = {
  overview: string;
  sections: InsightSection[];
  provider?: string;
  generatedAt?: string;
};

const STORAGE_KEY = "whoisp_projects";
const STORAGE_EVENT = "whoisp_projects_updated";

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

type Copy = {
  cardDescription: string;
  labels: {
    fullName: string;
    company: string;
    position: string;
    extraInfo: string;
  };
  placeholders: {
    fullName: string;
    company: string;
    position: string;
    extraInfo: string;
  };
  button: {
    idle: string;
    loading: string;
  };
  disclaimerLinkText: string;
  errorMessages: {
    fetch: string;
    generic: string;
  };
  results: {
    title: string;
    description: string;
    overviewHeading: string;
    referencesHeading: string;
    noReferences: string;
    providerLabel: string;
    placeholder: string;
    loadingTitle: string;
    loadingDescription: string;
  };
};

type Props = {
  projectId?: string;
  lang?: "ja" | "en";
  copy: Copy;
};

export default function PersonSearchForm({ projectId, lang = "ja", copy }: Props) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [fullName, setFullName] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<PersonResearchInsights | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const syncApiKey = () => {
      try {
        const stored = localStorage.getItem("whoisp_api_key");
        setApiKey(stored ?? null);
      } catch {
        setApiKey(null);
      }
    };

    syncApiKey();

    const handler = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setApiKey(event.detail || null);
      } else {
        syncApiKey();
      }
    };

    window.addEventListener("whoisp_api_key_updated", handler as EventListener);
    return () => window.removeEventListener("whoisp_api_key_updated", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const trimmedFull = fullName.trim();
    const trimmedComp = company.trim();
    const newName = trimmedFull && trimmedComp ? `${trimmedFull} | ${trimmedComp}` : trimmedFull || "";
    if (!newName) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list: { id: string; name: string; createdAt: number }[] = JSON.parse(raw);
      const idx = list.findIndex((item) => item.id === projectId);
      if (idx === -1) return;
      if (list[idx].name !== newName) {
        list[idx] = { ...list[idx], name: newName };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event(STORAGE_EVENT));
      }
    } catch {
      // no-op on storage issues
    }
  }, [projectId, fullName, company]);

  const disabled = useMemo(() => !fullName.trim(), [fullName]);
  const loadingAlt = lang === "ja" ? "WhoisPのキャラクター" : "WhoisP mascot";

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatText(value: string) {
    return escapeHtml(value).replace(/\n/g, "<br />");
  }

  async function handleExport() {
    if (!insights || exporting) return;
    setExporting(true);
    try {
      const title = copy.results.title || (lang === "ja" ? "リサーチサマリー" : "Research Summary");
      const personLine = fullName.trim()
        ? lang === "ja"
          ? `対象者: ${escapeHtml(fullName.trim())}`
          : `Subject: ${escapeHtml(fullName.trim())}`
        : "";
      const metaLines: string[] = [];
      if (personLine) metaLines.push(personLine);
      if (company.trim()) {
        metaLines.push((lang === "ja" ? "会社: " : "Company: ") + escapeHtml(company.trim()));
      }
      if (position.trim()) {
        metaLines.push((lang === "ja" ? "役職: " : "Title: ") + escapeHtml(position.trim()));
      }
      if (extraInfo.trim()) {
        metaLines.push((lang === "ja" ? "補足情報: " : "Notes: ") + escapeHtml(extraInfo.trim()));
      }
      if (insights.generatedAt) {
        const label = lang === "ja" ? "生成日時: " : "Generated at: ";
        metaLines.push(label + escapeHtml(new Date(insights.generatedAt).toLocaleString()));
      }

      const sectionsHtml = (insights.sections || [])
        .map((section) => {
          const heading = `<h2>${escapeHtml(section.channel)}</h2>`;
          const summary = section.summary ? `<p>${formatText(section.summary)}</p>` : "";
          let referencesHtml = "";
          if (section.references.length > 0) {
            const items = section.references
              .map((ref) => {
                const titleText = escapeHtml(ref.title || ref.link);
                const snippet = ref.snippet ? `<div>${formatText(ref.snippet)}</div>` : "";
                const source = ref.source ? `<span style=\"font-size:0.85em;color:#555;\">${escapeHtml(ref.source)}</span>` : "";
                return `<li><p><a href=\"${escapeHtml(ref.link)}\">${titleText}</a>${source ? `<br />${source}` : ""}${snippet}</p></li>`;
              })
              .join("");
            referencesHtml = `<ul>${items}</ul>`;
          }
          return `${heading}${summary}${referencesHtml}`;
        })
        .join("<hr />");

      const overviewHtml = insights.overview ? `<p>${formatText(insights.overview)}</p>` : "";
      const metaHtml = metaLines.length ? `<p>${metaLines.join("<br />")}</p>` : "";

      const html = `<!DOCTYPE html><html><head><meta charset=\"utf-8\" /><title>${escapeHtml(
        title
      )}</title><style>body{font-family:'Segoe UI','Hiragino Kaku Gothic ProN',sans-serif;line-height:1.65;color:#1a1a1a;padding:24px;}h1{font-size:24px;margin-bottom:12px;}h2{font-size:18px;margin-top:24px;margin-bottom:8px;}ul{margin:8px 0 16px 20px;}hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0;}a{color:#0a5adf;text-decoration:none;}</style></head><body><h1>${escapeHtml(
        title
      )}</h1>${metaHtml}${overviewHtml}${sectionsHtml}</body></html>`;

      const blob = new Blob([html], { type: "application/msword" });
      const timestamp = new Date().toISOString().slice(0, 10);
      const baseName = fullName.trim() ? fullName.trim() : "whoisp-report";
      const safeName = baseName.replace(/[\\/:*?"<>|]/g, "_");
      const fileName = `${safeName || "whoisp-report"}_${timestamp}.doc`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setExporting(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setInsights(null);

    try {
      const res = await fetch("/api/person-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          position,
          fullName,
          extraInfo,
          apiKey: apiKey ?? undefined,
          lang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || copy.errorMessages.fetch);
      }

      setInsights(data?.insights ?? null);
    } catch (err: any) {
      setError(err?.message || copy.errorMessages.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full grid gap-6 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start lg:justify-items-start">
      <Card className="self-start w-full max-w-sm lg:max-w-none lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>WhoisP</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">{copy.labels.fullName}</Label>
              <Input
                id="fullName"
                placeholder={copy.placeholders.fullName}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">{copy.labels.company}</Label>
              <Input
                id="company"
                placeholder={copy.placeholders.company}
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">{copy.labels.position}</Label>
              <Input
                id="position"
                placeholder={copy.placeholders.position}
                value={position}
                onChange={(event) => setPosition(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="extraInfo">{copy.labels.extraInfo}</Label>
              <Input
                id="extraInfo"
                placeholder={copy.placeholders.extraInfo}
                value={extraInfo}
                onChange={(event) => setExtraInfo(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={disabled || loading}>
                {loading ? copy.button.loading : copy.button.idle}
              </Button>
              <a href="/disclaimer" className="text-sm text-muted-foreground hover:underline">
                {copy.disclaimerLinkText}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

        <Card className="self-start w-full">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>{copy.results.title}</CardTitle>
                {copy.results.description && <CardDescription>{copy.results.description}</CardDescription>}
                {insights?.provider && !loading && copy.results.providerLabel && (
                  <p className="text-xs text-muted-foreground">
                    {copy.results.providerLabel} {insights.provider}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2"
                disabled={!insights || loading || exporting}
                onClick={handleExport}
              >
                <FileDown className="h-4 w-4" />
                {lang === "ja" ? "Wordエクスポート" : "Export Word"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 min-h-[22rem]">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-primary/5">
                  <span className="absolute inset-0 rounded-full border border-primary/30 searching-ring" aria-hidden="true" />
                  <span className="absolute inset-3 rounded-full bg-primary/10 searching-ring-delayed" aria-hidden="true" />
                  <Image src="/favicon.svg" alt={loadingAlt} width={80} height={70} className="relative h-16 w-16 searching-character" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-foreground">{copy.results.loadingTitle}</p>
                  <p className="text-sm text-muted-foreground">{copy.results.loadingDescription}</p>
                </div>
              </div>
            ) : insights ? (
              <>
                {insights.overview && (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {copy.results.overviewHeading}
                    </h3>
                    <p className="leading-relaxed whitespace-pre-wrap text-sm text-foreground">
                      {insights.overview}
                    </p>
                  </section>
                )}

                {(insights.sections || []).map((section, index) => (
                  <section key={`${section.channel}-${index}`} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="uppercase tracking-wide">
                        {section.channel}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {section.summary}
                    </p>
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                        {copy.results.referencesHeading}
                      </h4>
                      {section.references.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{copy.results.noReferences}</p>
                      ) : (
                        <ul className="space-y-2">
                          {section.references.map((ref, refIdx) => (
                            <li key={`${ref.link}-${refIdx}`} className="text-sm">
                              <a
                                href={ref.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium underline underline-offset-4"
                              >
                                {ref.title || ref.link}
                              </a>
                              <div className="text-xs text-muted-foreground">
                                {(ref.source || domainFromUrl(ref.link)) && (
                                  <span className="mr-1">{ref.source || domainFromUrl(ref.link)}</span>
                                )}
                                {ref.snippet}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                ))}
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {copy.results.placeholder}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
