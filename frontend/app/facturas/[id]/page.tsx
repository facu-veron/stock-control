import type { Metadata } from "next"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"
import { Search } from "@/components/search"
import { InvoiceDetail } from "@/components/invoice/invoice-detail"

export const metadata: Metadata = {
  title: "Detalle de Factura",
  description: "Detalle de factura emitida",
}

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <MainNav className="mx-6" />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <InvoiceDetail invoiceId={params.id} />
      </div>
    </div>
  )
}
