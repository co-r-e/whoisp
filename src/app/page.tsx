export default function Home() {
  return (
    <div className="w-full px-4 pt-8 pb-12 md:px-6 md:pt-10 md:pb-16 flex flex-col gap-12">
      <section className="mx-auto w-full max-w-5xl space-y-4">
        <h1 className="text-3xl font-semibold">WhoisP</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          The search feature has been retired. You can still browse the disclaimer below for
          usage guidance and data-handling notes.
        </p>
        <a
          className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
          href="/disclaimer"
        >
          View usage notes &amp; disclaimer
        </a>
      </section>
      <section className="mx-auto w-full max-w-5xl text-sm text-muted-foreground">
        Search is no longer available. See the usage notes for the latest details about the
        project.
      </section>
    </div>
  );
}
