import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Skeleton className="h-9 w-40" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-96" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>

          <div className="flex gap-4 pt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
