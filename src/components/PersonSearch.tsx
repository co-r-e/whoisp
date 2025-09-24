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
  extraInfo?: string; // 任意の補足情報
};

function domainFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

export default function PersonSearch({ projectId, lang }: { projectId?: string; lang?: "ja" | "en" }) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [fullName, setFullName] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PersonSearchResult[]>([]);

  // Auto-sync sidebar project title as "氏名 | 会社名" when in a project context
  useEffect(() => {
    if (!projectId) return;
    const trimmedFull = fullName.trim();
    const trimmedComp = company.trim();
    const newName = trimmedFull && trimmedComp ? `${trimmedFull} | ${trimmedComp}` : trimmedFull || "";
    if (!newName) return;
    try {
      const raw = localStorage.getItem("pf_projects");
      if (!raw) return;
      const list: { id: string; name: string; createdAt: number }[] = JSON.parse(raw);
      const idx = list.findIndex((p) => p.id === projectId);
      if (idx === -1) return;
      if (list[idx].name !== newName) {
        list[idx] = { ...list[idx], name: newName };
        localStorage.setItem("pf_projects", JSON.stringify(list));
        window.dispatchEvent(new Event("pf_projects_updated"));
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
        body: JSON.stringify({ company, position, fullName, extraInfo }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "検索に失敗しました");
      }
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
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
          <CardDescription>
            会社名・役職・氏名を入力し、WebやSNSから公開情報を横断検索します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">氏名</Label>
              <Input
                id="fullName"
                placeholder="例: 山田 太郎"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company">会社名</Label>
              <Input
                id="company"
                placeholder="例: 株式会社サンプル"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">役職</Label>
              <Input
                id="position"
                placeholder="例: 代表取締役 / エンジニア"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="extraInfo">補足情報（任意）</Label>
              <Input
                id="extraInfo"
                placeholder="例: ニックネーム、出身大学、所属部門 など"
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={disabled || loading}>
                {loading ? "検索中..." : "検索"}
              </Button>
              <a href="/disclaimer" className="text-sm text-muted-foreground hover:underline">
                利用上の注意・免責事項
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
              <CardTitle>検索結果</CardTitle>
              <CardDescription>
                取得した公開情報をドメイン別に整理しています。
              </CardDescription>
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
                            補足情報: {r.extraInfo}
                          </div>
                        )}
                        {r.query && (
                          <div className="mt-2 text-[11px] text-muted-foreground">query: {r.query}</div>
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