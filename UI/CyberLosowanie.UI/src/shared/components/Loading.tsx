import { Skeleton } from "@/shared/ui/skeleton";

/** Route-transition placeholder: three translucent card skeletons. */
function Loading() {
  return (
    <div className="grid w-full gap-4 pt-12 md:grid-cols-2 lg:grid-cols-3" aria-busy>
      {Array.from({ length: 3 }).map((_, index) => {
        return (
          <div key={index} className="glass flex flex-col space-y-3 p-4">
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="mx-auto h-4 w-3/4" />
              <Skeleton className="mx-auto h-4 w-1/2" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default Loading;
