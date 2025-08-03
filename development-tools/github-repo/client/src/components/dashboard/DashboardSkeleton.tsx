import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

export function DashboardSkeleton() {
  return (
    <div 
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard content"
    >
      <VisuallyHidden>Loading dashboard content</VisuallyHidden>

      {/* Balance Card Skeleton */}
      <Card className="w-full">
        <div className="p-6 space-y-4">
          <Skeleton 
            variant="text" 
            className="w-1/4"
            aria-hidden="true"
          />
          <Skeleton 
            variant="text" 
            className="w-1/2 h-8"
            aria-hidden="true"
          />
          <div className="pt-4 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton 
                variant="text" 
                className="w-24"
                aria-hidden="true"
              />
              <Skeleton 
                variant="text" 
                className="w-24"
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton 
                variant="text" 
                className="w-24"
                aria-hidden="true"
              />
              <Skeleton 
                variant="text" 
                className="w-24"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-24 h-10 rounded-md"
              aria-hidden="true"
            />
          ))}
        </div>
        <Skeleton 
          variant="card" 
          className="min-h-[400px]"
          aria-hidden="true"
        />
      </div>

      {/* Status Cards Skeleton */}
      <div 
        className="grid gap-6 md:grid-cols-2"
        aria-label="Loading status cards"
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <div className="p-6 space-y-4">
              <Skeleton 
                variant="text" 
                className="w-1/3"
                aria-hidden="true"
              />
              <div className="flex items-center gap-2">
                <Skeleton 
                  variant="text" 
                  className="w-20"
                  aria-hidden="true"
                />
                <Skeleton 
                  variant="avatar" 
                  size="sm"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}