"use client";


export function TagCardSkeleton() {
  return (
    <div className="flex items-center p-3 md:p-4 rounded-xl bg-card border-[0.5px] border-border gap-3 animate-pulse">
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="w-6.5 h-6.5 rounded-md bg-muted shrink-0" />
        <div className="h-4 bg-muted rounded w-32 shrink-0" />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:block h-6 bg-muted rounded-md w-16" />
        <div className="w-8 h-7 bg-muted rounded-md -mr-1 shrink-0" />
      </div>
    </div>
  );
}

export function TagCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <TagCardSkeleton key={index} />
      ))}
    </div>
  );
}

