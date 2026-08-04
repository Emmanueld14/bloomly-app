export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--fg-muted)]">
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
        {label}
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 px-6 py-16 text-center">
      <h2 className="font-[family-name:var(--font-syne)] text-xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm text-[var(--fg-muted)]">{description}</p> : null}
    </div>
  );
}

export function AdminLoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center text-sm text-gray-500">
      {label}
    </div>
  );
}

export function AdminErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
