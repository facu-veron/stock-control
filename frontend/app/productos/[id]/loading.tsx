import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="h-16" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Cargando producto...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
