import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "調査セッション | WhoisP",
};

type JaInvestigationPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function JaInvestigationPage({ searchParams }: JaInvestigationPageProps) {
  const params = await searchParams;
  const query = params.q?.trim();
  const destination = query ? `/ja?q=${encodeURIComponent(query)}` : "/ja";
  redirect(destination);
}
