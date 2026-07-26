"use client";


export function AnalyticsCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6 animate-pulse">
      <div className="mb-6 flex items-center justify-between border-b-[0.5px] border-border pb-2">
        <div className="h-4 bg-muted rounded w-24 mb-0.5" />
        <div className="h-4 bg-muted rounded w-10 mb-0.5 mr-3" />
      </div>

      <div className="flex flex-col gap-5 py-1">
        {[75, 55, 40, 25, 15].map((widthPercent, index) => (
          <div key={index} className="flex items-center justify-between h-9 w-full">
            <div className="flex items-center gap-3 flex-1">
              <div className="size-5 rounded-full bg-muted shrink-0" />
              <div className="h-3.5 bg-muted rounded w-24 shrink-0" />
              <div
                className="h-6 bg-muted/40 rounded-md hidden sm:block" 
                style={{ width: `${widthPercent * 0.6}%` }} 
              />
            </div>
            <div className="h-4 bg-muted rounded w-8 shrink-0 mr-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsChartSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6 animate-pulse">
      <div>
        <div className="h-3 bg-muted rounded w-24" />
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="h-10 bg-muted rounded w-48" />
          <div className="h-6 bg-muted rounded-full w-24" />
        </div>
      </div>
      <div className="h-80 sm:h-96 bg-muted/60 rounded-lg w-full mt-4" />
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-end">
        <div className="h-10 bg-muted rounded w-44 animate-pulse" />
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

