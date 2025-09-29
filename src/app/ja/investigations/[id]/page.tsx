import type { Metadata } from "next";

import DeepResearchClient from "../../../_components/deep-research-client";
import { jaStrings } from "../../../_components/deep-research-strings";

export const metadata: Metadata = {
  title: "調査セッション | WhoisP",
};

type JaInvestigationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JaInvestigationPage({ params }: JaInvestigationPageProps) {
  const { id } = await params;

  return <DeepResearchClient locale="ja" strings={jaStrings} sessionId={id} />;
}
