import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "利用上の注意・免責事項 | WhoisP",
  robots: {
    index: false,
  },
};

export default function DisclaimerPage() {
  redirect("/terms#usage-notes");
}
