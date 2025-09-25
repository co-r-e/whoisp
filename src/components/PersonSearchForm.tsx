"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export type PersonSearchResult = {
  title: string;
  link: string;
  snippet?: string;
  source?: string; // domain
  thumbnail?: string | null;
  query?: string;
  extraInfo?: string;
};

const STORAGE_KEY = "whoisp_projects";
const STORAGE_EVENT = "whoisp_projects_updated";

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch (e) {
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
  };
  extraInfoPrefix: string;
  queryPrefix: string;
};

type Props = {
  projectId?: string;
  lang?: "ja" | "en";
  copy: Copy;
};

export default function PersonSearchForm({ projectId, copy }: Props) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [fullName, setFullName] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("whoisp_api_key");
      if (stored) setApiKey(stored);
    } catch {}

    const handler = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === "string") {
        setApiKey(event.detail || null);
      } else {
        try {
          const latest = localStorage.getItem("whoisp_api_key");
          setApiKey(latest);
        } catch {}
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
      const idx = list.findIndex((p) => p.id === projectId);
      if (idx === -1) return;
      if (list[idx].name !== newName) {
        list[idx] = { ...list[idx], name: newName };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event(STORAGE_EVENT));
      }
    } catch {}
  }, [projectId, fullName, company]);

  const disabled = useMemo(() => {
    return !fullName.trim();
  }, [fullName]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/person-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, position, fullName, extraInfo, apiKey: apiKey ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || copy.errorMessages.fetch);
      }
      setResults(data.results || []);
    } catch (err: any) {
      setError(err?.message || copy.errorMessages.generic);
    } finally {
      setLoading(false);
    }
  }

  const groups = useMemo(() => {
    const buckets: Record<string, PersonSearchResult[]> = {};
    for (const r of results) {
      const key = (r.source || domainFromUrl(r.link) || "other").toLowerCase();
      buckets[key] = buckets[key] || [];
      buckets[key].push(r);
    }
    return buckets;
  }, [results]);

  const prioritizedTabs = useMemo(() => {
    const order = [
      "linkedin.com",
      "x.com",
      "twitter.com",
      "facebook.com",
      "instagram.com",
      "github.com",
      "qiita.com",
      "note.com",
      "speakerdeck.com",
      "wantedly.com",
      "researchmap.jp",
      "medium.com",
      "other",
    ];
    const present = Object.keys(groups);
    return order.filter((o) => present.includes(o)).concat(present.filter((p) => !order.includes(p)));
  }, [groups]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card>
        <CardHeader>
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
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">{copy.labels.company}</Label>
              <Input
                id="company"
                placeholder={copy.placeholders.company}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">{copy.labels.position}</Label>
              <Input
                id="position"
                placeholder={copy.placeholders.position}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="extraInfo">{copy.labels.extraInfo}</Label>
              <Input
                id="extraInfo"
                placeholder={copy.placeholders.extraInfo}
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
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

      <div className="mt-6">
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}
        {loading && (
          <div className="grid gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {!loading && results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{copy.results.title}</CardTitle>
              <CardDescription>{copy.results.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={prioritizedTabs[0] || "other"}>
                <TabsList className="flex flex-wrap">
                  {prioritizedTabs.map((key) => (
                    <TabsTrigger key={key} value={key}>
                      {key}
                      <Badge variant="secondary" className="ml-2">
                        {groups[key]?.length || 0}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {prioritizedTabs.map((key) => (
                  <TabsContent key={key} value={key} className="space-y-3">
                    {groups[key]?.map((r, idx) => (
                      <a
                        key={r.link + idx}
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md border p-4 hover:bg-accent/60"
                      >
                        <div className="text-sm text-muted-foreground mb-1">
                          {r.source || domainFromUrl(r.link)}
                        </div>
                        <div className="font-medium mb-1 line-clamp-2">{r.title}</div>
                        {r.snippet && (
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {r.snippet}
                          </div>
                        )}
                        {r.extraInfo && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {copy.extraInfoPrefix} {r.extraInfo}
                          </div>
                        )}
                        {r.query && (
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {copy.queryPrefix}
                            {r.query}
                          </div>
                        )}
                      </a>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
