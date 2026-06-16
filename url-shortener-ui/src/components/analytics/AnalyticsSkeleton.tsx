"use client";


export function AnalyticsCardSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border-[0.5px] border-border bg-background p-4 sm:p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-32" />
      <div className="space-y-3">
        <div className="h-6 bg-muted rounded w-3/4" />
        <div className="h-6 bg-muted rounded w-2/3" />
        <div className="h-6 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export function AnalyticsChartSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border-[0.5px] border-border bg-background p-4 sm:p-6 animate-pulse">
      <div>
        <div className="h-3 bg-muted rounded w-24 mb-3" />
        <div className="h-10 bg-muted rounded w-48" />
      </div>
      <div className="h-64 bg-muted rounded" />
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-muted rounded w-32 animate-pulse" />
        <div className="h-10 bg-muted rounded w-40 animate-pulse" />
      </div>

      {/* Main chart skeleton */}
      <AnalyticsChartSkeleton />

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AnalyticsCardSkeleton />
        <AnalyticsCardSkeleton />
        <AnalyticsCardSkeleton />
        <AnalyticsCardSkeleton />
      </div>
    </div>
  );
}

