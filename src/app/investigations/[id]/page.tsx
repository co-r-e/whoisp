import type { Metadata } from "next";

import DeepResearchClient from "../../_components/deep-research-client";
import { enStrings } from "../../_components/deep-research-strings";

export const metadata: Metadata = {
  title: "Investigation | WhoisP",
};

type InvestigationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvestigationPage({ params }: InvestigationPageProps) {
  const { id } = await params;

  return <DeepResearchClient locale="en" strings={enStrings} sessionId={id} />;
}
