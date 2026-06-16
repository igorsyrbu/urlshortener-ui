"use client";


export function TagCardSkeleton() {
  return (
    <div className="flex items-center p-3 md:p-4 rounded-xl bg-background border-[0.5px] border-border gap-3 animate-pulse">
      <div className="size-7 rounded-md bg-muted" />

      <div className="flex-1 min-w-0">
        <div className="h-4 bg-muted rounded w-32" />
      </div>

      <div className="hidden sm:block h-6 bg-muted rounded w-20" />

      <div className="size-5 bg-muted rounded" />
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

