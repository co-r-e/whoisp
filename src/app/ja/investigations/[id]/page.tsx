import type { Metadata } from "next";

import DeepResearchClient from "../../../_components/deep-research-client";
import { jaStrings } from "../../../_components/deep-research-strings";

export const metadata: Metadata = {
  title: "調査セッション | WhoisP",
};

type JaInvestigationPageProps = {
  params: {
    id: string;
  };
};

export default function JaInvestigationPage({ params }: JaInvestigationPageProps) {
  return <DeepResearchClient locale="ja" strings={jaStrings} sessionId={params.id} />;
}
