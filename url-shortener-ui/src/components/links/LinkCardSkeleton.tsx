"use client";

/**
 * Loading skeleton component for LinkCard
 * Displays a placeholder while links are being fetched
 */
export function LinkCardSkeleton() {
  return (
    <div className="flex items-center p-4 md:p-5 rounded-xl bg-background border-[0.5px] border-border gap-4 animate-pulse">
      <div className="shrink-0 size-9 rounded-full bg-muted border-[0.5px] border-border" />

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="h-4 bg-muted rounded w-3/4" />

        <div className="flex items-center gap-2">
          <div className="h-5 bg-muted rounded w-32" />
          <div className="h-3 w-3 bg-muted rounded" />
          <div className="h-3 bg-muted rounded w-24" />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:block h-6 bg-muted rounded px-8" />

        <div className="size-5 bg-muted rounded" />
      </div>
    </div>
  );
}

export function LinkCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <LinkCardSkeleton key={index} />
      ))}
    </div>
  );
}

