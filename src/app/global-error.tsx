"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred while rendering this page.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Try again
          </button>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 max-h-60 overflow-auto rounded bg-muted p-3 text-left text-xs text-muted-foreground">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
