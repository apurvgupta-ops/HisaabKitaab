export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="bg-muted h-8 w-64 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between pb-2">
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
              <div className="bg-muted h-9 w-9 animate-pulse rounded-lg" />
            </div>
            <div className="bg-muted h-8 w-20 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-3 w-32 animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="bg-card rounded-lg border p-6 lg:col-span-1">
          <div className="bg-muted mb-4 h-5 w-28 animate-pulse rounded" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded" />
            ))}
          </div>
        </div>
        <div className="bg-card rounded-lg border p-6 lg:col-span-2">
          <div className="bg-muted mb-4 h-5 w-32 animate-pulse rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-16 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
