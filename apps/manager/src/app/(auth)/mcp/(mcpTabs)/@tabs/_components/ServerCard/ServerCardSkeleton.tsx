import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export const ServerCardSkeleton = () => {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="mr-2 rounded-md p-2">
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4" />
          <div className="mt-1">
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <Skeleton className="mb-2 h-9 w-full" />
      </CardContent>
      <CardFooter className="mt-auto">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
};
