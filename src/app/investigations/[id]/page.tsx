import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Investigation | WhoisP",
};

type InvestigationPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function InvestigationPage({ searchParams }: InvestigationPageProps) {
  const params = await searchParams;
  const query = params.q?.trim();
  const destination = query ? `/?q=${encodeURIComponent(query)}` : "/";
  redirect(destination);
}
