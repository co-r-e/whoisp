"use client";

export default function HeroEn() {
  return (
    <section className="relative w-full overflow-hidden rounded-xl border bg-card">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop)'
        }}
      />
      <div className="relative p-8 md:p-12">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
          WhoisP
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Cross-search public information on the web and social networks by full name, company, and position — for research, verification, and self-checks.
        </p>
      </div>
    </section>
  );
}
