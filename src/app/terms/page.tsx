import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | WhoisP",
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Terms & Usage Notes</h1>
        <p className="text-sm text-muted-foreground">
          Review the acceptable use policy and important guidance before running investigations with this service.
        </p>
      </header>
      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          By using this service you agree to conduct research responsibly, respect privacy, and comply with
          all applicable laws and third-party service terms. Outputs are provided “as is” with no warranty;
          you remain responsible for independently validating any insights before acting on them.
        </p>
        <p>
          Do not upload sensitive or personal data you lack rights to process. Abuse, harassment, discriminatory
          behaviour, or activities intended to cause harm are strictly prohibited and may result in access revocation.
        </p>
        <p>
          The service may change or be discontinued at any time without notice. Data is not persisted in a
          backend database; session history resides locally in your browser and may be cleared during
          maintenance or browser resets.
        </p>
      </section>
      <section id="usage-notes" className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-medium">Usage Notes & Disclaimers</h2>
        <p className="text-sm text-muted-foreground">
          This service collects and organises publicly available information using search engines and scraping APIs
          based on the names, companies, and roles that you provide.
        </p>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Important</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Only public information is retrieved. Private or paywalled content is not accessed.</li>
            <li>Accuracy and completeness are not guaranteed; always verify findings independently.</li>
            <li>Respect privacy and the terms of each source service and use the tool for appropriate purposes.</li>
            <li>Use of external scraping APIs must comply with the providers’ policies.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Recommended usage</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Cross-checking public profiles for consistency.</li>
            <li>Due diligence research for hiring or partnerships within legal and policy constraints.</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Prohibited usage</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Discrimination, harassment, stalking, or other rights-infringing behaviour.</li>
            <li>Illegal activities or fraudulent intent.</li>
            <li>Exploiting vulnerabilities, unauthorised access, or breaches of platform terms.</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          The developers accept no liability for any damages arising from the use of this service.
        </p>
      </section>
    </div>
  );
}
