import type { Metadata } from "next";

import DeepResearchClient from "../../_components/deep-research-client";
import { enStrings } from "../../_components/deep-research-strings";

export const metadata: Metadata = {
  title: "Investigation | WhoisP",
};

type InvestigationPageProps = {
  params: {
    id: string;
  };
};

export default function InvestigationPage({ params }: InvestigationPageProps) {
  return <DeepResearchClient locale="en" strings={enStrings} sessionId={params.id} />;
}
