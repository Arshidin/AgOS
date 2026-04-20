import { Skeleton } from '@/components/ui/skeleton';

export default function StartupsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[16px] overflow-hidden"
          style={{ background: '#f7f0e8', border: '1px solid rgba(43,24,10,0.08)' }}
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="p-4 flex flex-col gap-2.5">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid rgba(43,24,10,0.06)' }}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
