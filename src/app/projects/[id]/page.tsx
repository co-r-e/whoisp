import PersonSearchEn from "@/components/PersonSearchEn";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main className="min-h-screen w-full px-6 py-10 md:px-10 md:py-14">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <PersonSearchEn projectId={id} lang="en" />
        <section className="text-sm text-muted-foreground">
          <p>
            This app only searches publicly available information. See our
            <a className="underline underline-offset-4 ml-1" href="/disclaimer"> disclaimer</a> for details.
          </p>
        </section>
      </div>
    </main>
  );
}