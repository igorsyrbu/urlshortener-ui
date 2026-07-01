"use client";

export function LinkCardSkeleton() {
  return (
    <div className="flex items-center p-4 md:p-5 rounded-xl bg-background border-[0.5px] border-border gap-4 animate-pulse">
      <div className="shrink-0 size-9 rounded-full bg-muted border-[0.5px] border-border" />

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="h-4.5 bg-muted rounded w-3/4 mt-0.5" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 mt-0.5 min-w-0">
          <div className="flex items-center gap-1 min-w-0 shrink">
            <div className="h-5 bg-muted rounded w-32 shrink-0" />
            <div className="size-5 bg-muted/60 rounded shrink-0" />
          </div>

          <span className="hidden sm:inline-block text-muted-foreground/30 shrink-0">•</span>

          <div className="flex items-center gap-1 min-w-0 shrink">
            <div className="size-3 bg-muted/60 rounded-sm sm:hidden shrink-0" />
            <div className="h-4 bg-muted rounded w-24 shrink-0" />
          </div>
        </div>
      </div>

      {/* Actions wrapper */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:block h-6 bg-muted rounded w-20" />

        <div className="w-8 h-7 bg-muted rounded-md -mr-1 shrink-0" />
      </div>
    </div>
  );
}

export function LinkCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <LinkCardSkeleton key={index} />
      ))}
    </div>
  );
}

